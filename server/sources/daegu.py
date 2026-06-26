"""
대구광역시 보도자료 어댑터.

대상: https://info.daegu.go.kr/newshome/mtnmain.php?mtnkey=scatelist&mkey=26
- 목록의 1행은 개별 보도자료가 아니라 "대구광역시 보도자료(YYYY-MM-DD)" 날짜별 묶음이다.
- 묶음 상세 페이지의 표에서 개별 보도자료 제목/요약/담당부서를 분해한다.
- 제목/요약/담당부서의 교통/건설/모빌리티 키워드로 선별한다.
"""

from __future__ import annotations

import asyncio
import gzip
import logging
import os
import re
import ssl
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime
from typing import List, Tuple
from urllib.parse import urlencode, urljoin

import httpx
from bs4 import BeautifulSoup

from .base import PressItem, Source


log = logging.getLogger("press-hub.daegu")

BASE = "https://info.daegu.go.kr"
LIST_URL = f"{BASE}/newshome/mtnmain.php"
BOARD_KEY = "26"

DATE_RE = re.compile(r"(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})")
AID_RE = re.compile(r"[?&]aid=(\d+)")
BUNDLE_TITLE_RE = re.compile(r"대구광역시\s*보도자료\s*\((\d{4}[-./]\d{1,2}[-./]\d{1,2})\)")


@dataclass
class _BundleEntry:
    date: str
    title: str
    link: str


def _load_daegu_keyword_filter() -> tuple[str, ...]:
    """대구시 전용 모빌리티/도시 분야 필터링 키워드.

    필요 시 서버 시작 전 환경변수로 덮어쓰기 가능:
      DAEGU_INCLUDE_KEYWORDS=교통,버스,도로,자동차
    """
    default_keywords = (
        "교통",
        "버스",
        "택시",
        "도로",
        "철도",
        "대중교통",
        "모빌리티",
        "미래차",
        "자율주행",
        "도시철도",
        "지하철",
        "자동차",
        "전기자동차",
        "차량",
        "주차",
        "교통약자",
        "나드리콜",
        "광역교통",
        "공항",
        "물류",
        "운송",
        "건설",
        "차로",
        "통행",
        "BRT",
        "GTX",
    )
    raw = (os.getenv("DAEGU_INCLUDE_KEYWORDS") or "").strip()
    if not raw:
        return default_keywords
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return tuple(parts) if parts else default_keywords


DAEGU_TOPIC_KEYWORDS: tuple[str, ...] = _load_daegu_keyword_filter()


def _make_ssl_context() -> ssl.SSLContext:
    """공공 사이트 호환성을 위한 느슨한 SSL 컨텍스트."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        ctx.minimum_version = ssl.TLSVersion.TLSv1
    except (AttributeError, ValueError):
        pass
    for cipher_str in ("DEFAULT@SECLEVEL=0", "DEFAULT@SECLEVEL=1", "ALL:@SECLEVEL=0"):
        try:
            ctx.set_ciphers(cipher_str)
            break
        except ssl.SSLError:
            continue
    return ctx


DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "Referer": LIST_URL,
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


class DaeguSource(Source):
    id = "daegu"
    name = "대구광역시"
    color = "#008c95"
    enabled = True

    MAX_PAGES = 40
    PAGE_CONCURRENCY = 2
    DETAIL_CONCURRENCY = 6
    REQUEST_TIMEOUT = 12.0

    async def fetch(self, from_date: str, to_date: str) -> List[PressItem]:
        async with httpx.AsyncClient(
            timeout=self.REQUEST_TIMEOUT,
            follow_redirects=True,
            headers=DEFAULT_HEADERS,
            verify=_make_ssl_context(),
            http2=False,
        ) as client:
            return await self._fetch_pages(client, from_date, to_date)

    async def _fetch_pages(
        self,
        client: httpx.AsyncClient,
        from_date: str,
        to_date: str,
    ) -> List[PressItem]:
        items: List[PressItem] = []
        seen: set[str] = set()
        from_date_obj = datetime.strptime(from_date, "%Y-%m-%d").date()

        async def fetch_page(page: int):
            params = self._build_list_params(from_date, to_date, page)
            used_url, status, html = await self._fetch_one(client, LIST_URL, params)
            return page, used_url, status, html

        next_page = 1
        while next_page <= self.MAX_PAGES:
            batch_pages = list(
                range(next_page, min(next_page + self.PAGE_CONCURRENCY, self.MAX_PAGES + 1))
            )
            next_page += len(batch_pages)

            batch_results = await asyncio.gather(
                *(fetch_page(page) for page in batch_pages),
                return_exceptions=True,
            )

            should_stop = False
            for result in batch_results:
                if isinstance(result, Exception):
                    log.exception("[daegu] 병렬 페이지 요청 실패: %s", result)
                    if not items:
                        raise RuntimeError(f"대구시 목록 조회 실패: {result}") from result
                    should_stop = True
                    break

                page, used_url, status, html = result
                bundles = self._parse_bundle_list(html)
                bundle_items = await self._fetch_bundle_items(client, bundles)
                page_items = [
                    it
                    for it in bundle_items
                    if (not it.date) or (from_date <= it.date <= to_date)
                ]

                added = 0
                for it in page_items:
                    key = f"{it.title}|{it.date}|{it.link}"
                    if key in seen:
                        continue
                    seen.add(key)
                    items.append(it)
                    added += 1

                log.info(
                    "[daegu] page=%s status=%s html=%d bytes bundles=%d parsed=%d added=%d url=%s",
                    page,
                    status,
                    len(html),
                    len(bundles),
                    len(page_items),
                    added,
                    used_url,
                )

                if len(bundles) == 0:
                    should_stop = True
                    break

                oldest = self._oldest_bundle_date(bundles)
                if oldest is not None and oldest < from_date_obj:
                    should_stop = True
                    break

            if should_stop:
                break

            await asyncio.sleep(0.05)

        return items

    @staticmethod
    def _oldest_bundle_date(bundles: List[_BundleEntry]) -> date | None:
        vals: List[date] = []
        for bundle in bundles:
            try:
                vals.append(datetime.strptime(bundle.date, "%Y-%m-%d").date())
            except ValueError:
                continue
        return min(vals) if vals else None

    @staticmethod
    def _build_list_params(from_date: str, to_date: str, page: int) -> dict:
        return {
            "mtnkey": "scatelist",
            "mkey": BOARD_KEY,
            "search_start_date": from_date,
            "search_end_date": to_date,
            "bpage": str(page),
        }

    async def _fetch_bundle_items(
        self,
        client: httpx.AsyncClient,
        bundles: List[_BundleEntry],
    ) -> List[PressItem]:
        if not bundles:
            return []

        sem = asyncio.Semaphore(self.DETAIL_CONCURRENCY)
        out: List[PressItem] = []

        async def worker(bundle: _BundleEntry) -> None:
            async with sem:
                try:
                    _used_url, _status, html = await self._fetch_one(client, bundle.link)
                except Exception as e:  # noqa: BLE001
                    log.debug("[daegu] bundle detail 실패 %s: %s", bundle.link, e)
                    return
                out.extend(self._parse_bundle_detail(html, bundle))

        await asyncio.gather(*(worker(bundle) for bundle in bundles), return_exceptions=True)
        return out

    async def _fetch_one(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: dict | None = None,
    ) -> Tuple[str, int, str]:
        """httpx -> urllib 폴백. 반환: (used_url, status_code, html)"""
        try:
            r = await client.get(url, params=params)
            r.raise_for_status()
            html = self._decode_html(r.content, r.headers.get("content-type", ""))
            return str(r.url), r.status_code, html
        except Exception as primary:  # noqa: BLE001
            log.warning("[daegu] httpx 실패 -> urllib 폴백: %s", primary.__class__.__name__)

        status, text, used_url = await asyncio.to_thread(
            self._urllib_fetch, url, params or {}, self.REQUEST_TIMEOUT
        )
        return used_url, status, text

    @classmethod
    def _urllib_fetch(cls, url: str, params: dict, timeout: float = 12.0) -> Tuple[int, str, str]:
        full_url = f"{url}?{urlencode(params)}" if params else url
        req = urllib.request.Request(full_url, headers={**DEFAULT_HEADERS, "Accept-Encoding": "gzip"})
        ctx = _make_ssl_context()
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:  # type: ignore[arg-type]
            raw = resp.read()
            if resp.headers.get("Content-Encoding", "").lower() == "gzip":
                raw = gzip.decompress(raw)
            text = cls._decode_html(raw, resp.headers.get("Content-Type", ""))
            return resp.status, text, full_url

    @staticmethod
    def _decode_html(raw: bytes, content_type: str = "") -> str:
        charset = ""
        m = re.search(r"charset=([\w-]+)", content_type or "", re.I)
        if m:
            charset = m.group(1)

        candidates = [charset, "utf-8", "cp949", "euc-kr"]
        seen: set[str] = set()
        best_text = ""
        best_score = -10**9
        for enc in candidates:
            if not enc:
                continue
            enc = enc.lower()
            if enc in seen:
                continue
            seen.add(enc)
            try:
                text = raw.decode(enc, errors="replace")
            except LookupError:
                continue
            korean_count = len(re.findall(r"[가-힣]", text))
            score = korean_count - text.count("\ufffd") * 50
            if score > best_score:
                best_score = score
                best_text = text
        return best_text or raw.decode("utf-8", errors="replace")

    async def fetch_raw(self, from_date: str, to_date: str, page: int = 1) -> dict:
        """디버깅용: 실제 목록/묶음 파싱 요약을 반환."""
        params = self._build_list_params(from_date, to_date, page)
        out: dict = {"params": params}
        try:
            async with httpx.AsyncClient(
                timeout=20.0,
                follow_redirects=True,
                headers=DEFAULT_HEADERS,
                verify=_make_ssl_context(),
                http2=False,
            ) as client:
                r = await client.get(LIST_URL, params=params)
                html = self._decode_html(r.content, r.headers.get("content-type", ""))
                bundles = self._parse_bundle_list(html)
                out["httpx"] = {
                    "ok": r.is_success,
                    "status": r.status_code,
                    "url": str(r.url),
                    "html_length": len(html),
                    "html_head": html[:4000],
                    "bundle_count": len(bundles),
                    "bundles": [bundle.__dict__ for bundle in bundles[:5]],
                }
        except Exception as e:  # noqa: BLE001
            out["httpx"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}

        try:
            status, text, used_url = await asyncio.to_thread(self._urllib_fetch, LIST_URL, params, 20.0)
            bundles = self._parse_bundle_list(text)
            out["urllib"] = {
                "ok": 200 <= status < 400,
                "status": status,
                "url": used_url,
                "html_length": len(text),
                "html_head": text[:4000],
                "bundle_count": len(bundles),
                "bundles": [bundle.__dict__ for bundle in bundles[:5]],
            }
        except Exception as e:  # noqa: BLE001
            out["urllib"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}

        out["ok"] = bool(out.get("httpx", {}).get("ok") or out.get("urllib", {}).get("ok"))
        return out

    def _parse_bundle_list(self, html: str) -> List[_BundleEntry]:
        soup = BeautifulSoup(html, "lxml")
        entries: List[_BundleEntry] = []
        seen: set[str] = set()

        for a in soup.find_all("a", href=True):
            text = re.sub(r"\s+", " ", a.get_text(" ", strip=True)).strip()
            m = BUNDLE_TITLE_RE.search(text)
            href = (a.get("href") or "").strip()
            if not m or "articleview" not in href or "aid=" not in href:
                continue
            date_str = self._extract_date([m.group(1)])
            if not date_str:
                continue
            link = urljoin(LIST_URL, href)
            key = f"{date_str}|{link}"
            if key in seen:
                continue
            seen.add(key)
            entries.append(_BundleEntry(date=date_str, title=text, link=link))

        return entries

    def _parse_bundle_detail(self, html: str, bundle: _BundleEntry) -> List[PressItem]:
        soup = BeautifulSoup(html, "lxml")
        root = (
            soup.select_one(".article_view_content")
            or soup.select_one("#article")
            or soup.select_one("#body_div")
            or soup
        )
        table = self._find_detail_table(root)
        if table is None:
            return []

        items: List[PressItem] = []
        rows = table.select("tr") or table.find_all("tr")
        for tr in rows:
            cells = tr.find_all(["td", "th"])
            if len(cells) < 2:
                continue
            if "제목" in cells[0].get_text(" ", strip=True) and "담당부서" in cells[1].get_text(" ", strip=True):
                continue

            title_cell = cells[0]
            dept = re.sub(r"\s+", " ", cells[1].get_text(" ", strip=True)).strip()
            link_el = title_cell.find("a", href=True)
            raw_text = re.sub(r"\s+", " ", title_cell.get_text(" ", strip=True)).strip()
            if not raw_text:
                continue

            if link_el:
                title = re.sub(r"\s+", " ", link_el.get_text(" ", strip=True)).strip()
                link = urljoin(LIST_URL, link_el.get("href") or "")
            else:
                title = raw_text.split(" - ", 1)[0].strip()
                link = bundle.link

            title = self._clean_title(title)
            if not title:
                continue
            if not self._is_target_topic_text(title, raw_text, dept):
                continue

            aid = self._extract_aid(link)
            items.append(
                PressItem(
                    source=self.id,
                    sourceName=self.name,
                    num=aid,
                    category="",
                    title=title,
                    link=link,
                    date=bundle.date,
                    dept=dept,
                    attachment=False,
                    views="",
                )
            )

        return items

    @staticmethod
    def _find_detail_table(root):
        for table in root.find_all("table"):
            labels = " ".join(th.get_text(" ", strip=True) for th in table.find_all("th"))
            text = table.get_text(" ", strip=True)
            if ("제목" in labels or "제 목" in text) and "담당부서" in text:
                return table
        return root.find("table")

    @staticmethod
    def _clean_title(text: str) -> str:
        text = re.sub(r"\s+", " ", text or "").strip()
        text = re.sub(r"^[○ㅇ]\s*", "", text)
        return text.strip()

    @staticmethod
    def _extract_date(texts) -> str:
        for t in texts:
            m = DATE_RE.search(t or "")
            if m:
                y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
                return f"{y}-{mo}-{d}"
        return ""

    @staticmethod
    def _extract_aid(url: str) -> str:
        m = AID_RE.search(url or "")
        return m.group(1) if m else ""

    @staticmethod
    def _is_target_topic_text(title: str, raw_text: str, dept: str) -> bool:
        if not DAEGU_TOPIC_KEYWORDS:
            return True
        haystack = " ".join(
            [
                title or "",
                raw_text or "",
                dept or "",
            ]
        )
        return any(keyword in haystack for keyword in DAEGU_TOPIC_KEYWORDS)

