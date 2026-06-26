"""
인천광역시 보도자료 어댑터.

대상: https://www.incheon.go.kr/IC010205
- 기간 파라미터: beginDt, endDt (YYYY-MM-DD)
- 페이지: curPage (1부터)
- 목록은 table 이 아니라 .board-blog-list 카드형 목록으로 제공된다.
"""

from __future__ import annotations

import asyncio
import gzip
import logging
import os
import re
import ssl
import urllib.request
from datetime import date, datetime
from typing import List, Tuple
from urllib.parse import urlencode, urljoin

import httpx
from bs4 import BeautifulSoup

from .base import PressItem, Source


log = logging.getLogger("press-hub.incheon")

BASE = "https://www.incheon.go.kr"
LIST_URL = f"{BASE}/IC010205"

DATE_RE = re.compile(r"(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})")
REP_SEQ_RE = re.compile(r"repSeq=([^&]+)")


def _load_incheon_keyword_filter() -> tuple[str, ...]:
    """인천시 전용 모빌리티/도시 분야 필터링 키워드.

    필요 시 서버 시작 전 환경변수로 덮어쓰기 가능:
      INCHEON_INCLUDE_KEYWORDS=교통,도시,버스
    """
    default_keywords = ("교통", "도시", "버스")
    raw = (os.getenv("INCHEON_INCLUDE_KEYWORDS") or "").strip()
    if not raw:
        return default_keywords
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return tuple(parts) if parts else default_keywords


INCHEON_TOPIC_KEYWORDS: tuple[str, ...] = _load_incheon_keyword_filter()


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


class IncheonSource(Source):
    id = "incheon"
    name = "인천광역시"
    color = "#0070bd"
    enabled = True

    PAGE_SIZE = 10
    MAX_PAGES = 80
    PAGE_CONCURRENCY = 3
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
            params = self._build_params(from_date, to_date, page)
            used_url, status, html = await self._fetch_one(client, params)
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
                    log.exception("[incheon] 병렬 페이지 요청 실패: %s", result)
                    if not items:
                        raise RuntimeError(f"인천시 목록 조회 실패: {result}") from result
                    should_stop = True
                    break

                page, used_url, status, html = result
                page_entries_before = self._parse_with_context(html)
                date_filtered = [
                    (it, raw_context)
                    for it, raw_context in page_entries_before
                    if (not it.date) or (from_date <= it.date <= to_date)
                ]
                page_entries = [
                    (it, raw_context)
                    for it, raw_context in date_filtered
                    if self._is_target_topic_raw(it.title, raw_context, it.dept)
                ]

                added = 0
                for it, _raw_context in page_entries:
                    key = f"{it.title}|{it.date}|{it.link}"
                    if key in seen:
                        continue
                    seen.add(key)
                    items.append(it)
                    added += 1

                log.info(
                    "[incheon] page=%s status=%s html=%d bytes parsed=%d(raw=%d) added=%d url=%s",
                    page,
                    status,
                    len(html),
                    len(page_entries),
                    len(page_entries_before),
                    added,
                    used_url,
                )

                if len(page_entries_before) == 0:
                    should_stop = True
                    break

                oldest = self._oldest_date([it for it, _raw_context in page_entries_before])
                if oldest is not None and oldest < from_date_obj:
                    should_stop = True
                    break

            if should_stop:
                break

            await asyncio.sleep(0.03)

        return items

    @staticmethod
    def _oldest_date(items: List[PressItem]) -> date | None:
        vals: List[date] = []
        for it in items:
            if not it.date:
                continue
            try:
                vals.append(datetime.strptime(it.date, "%Y-%m-%d").date())
            except ValueError:
                continue
        return min(vals) if vals else None

    @staticmethod
    def _build_params(from_date: str, to_date: str, page: int) -> dict:
        return {
            "curPage": str(page),
            "beginDt": from_date,
            "endDt": to_date,
            "srchMainManagerDeptNm": "",
            "srchRepTitle": "",
            "srchRepContents": "",
        }

    async def _fetch_one(self, client: httpx.AsyncClient, params: dict) -> Tuple[str, int, str]:
        """httpx -> urllib 폴백. 반환: (used_url, status_code, html)"""
        try:
            r = await client.get(LIST_URL, params=params)
            r.raise_for_status()
            if not r.encoding or r.encoding.lower() in ("iso-8859-1", "ascii"):
                r.encoding = "utf-8"
            return str(r.url), r.status_code, r.text
        except Exception as primary:  # noqa: BLE001
            log.warning("[incheon] httpx 실패 -> urllib 폴백: %s", primary.__class__.__name__)

        status, text, used_url = await asyncio.to_thread(
            self._urllib_fetch, LIST_URL, params, self.REQUEST_TIMEOUT
        )
        return used_url, status, text

    @staticmethod
    def _urllib_fetch(url: str, params: dict, timeout: float = 12.0) -> Tuple[int, str, str]:
        full_url = f"{url}?{urlencode(params)}"
        req = urllib.request.Request(full_url, headers={**DEFAULT_HEADERS, "Accept-Encoding": "gzip"})
        ctx = _make_ssl_context()
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:  # type: ignore[arg-type]
            raw = resp.read()
            if resp.headers.get("Content-Encoding", "").lower() == "gzip":
                raw = gzip.decompress(raw)
            charset = resp.headers.get_content_charset() or "utf-8"
            try:
                text = raw.decode(charset, errors="replace")
            except LookupError:
                text = raw.decode("utf-8", errors="replace")
            return resp.status, text, full_url

    async def fetch_raw(self, from_date: str, to_date: str, page: int = 1) -> dict:
        """디버깅용: 실제 응답 HTML 일부/요약을 반환."""
        params = self._build_params(from_date, to_date, page)
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
                if not r.encoding or r.encoding.lower() in ("iso-8859-1", "ascii"):
                    r.encoding = "utf-8"
                html = r.text
                out["httpx"] = {
                    "ok": r.is_success,
                    "status": r.status_code,
                    "url": str(r.url),
                    "encoding": r.encoding,
                    "html_length": len(html),
                    "html_head": html[:4000],
                    "card_count": html.count("<li>"),
                    "repseq_count": html.count("repSeq="),
                }
        except Exception as e:  # noqa: BLE001
            out["httpx"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}

        try:
            status, text, used_url = await asyncio.to_thread(self._urllib_fetch, LIST_URL, params, 20.0)
            out["urllib"] = {
                "ok": 200 <= status < 400,
                "status": status,
                "url": used_url,
                "html_length": len(text),
                "html_head": text[:4000],
                "card_count": text.count("<li>"),
                "repseq_count": text.count("repSeq="),
            }
        except Exception as e:  # noqa: BLE001
            out["urllib"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}

        out["ok"] = bool(out.get("httpx", {}).get("ok") or out.get("urllib", {}).get("ok"))
        return out

    def _parse(self, html: str) -> List[PressItem]:
        return [it for it, _raw_context in self._parse_with_context(html)]

    def _parse_with_context(self, html: str) -> List[Tuple[PressItem, str]]:
        soup = BeautifulSoup(html, "lxml")
        root = soup.select_one(".board-blog-list") or soup
        items: List[Tuple[PressItem, str]] = []

        for li in root.select("li"):
            a = li.find("a", href=True)
            if not a:
                continue
            href = self._extract_href(a)
            if not href:
                continue

            title = self._extract_title(li)
            if not title:
                continue

            date_str, dept = self._extract_meta(li)
            raw_context = li.get_text(" ", strip=True)
            item = PressItem(
                source=self.id,
                sourceName=self.name,
                num=self._extract_num(href),
                category="",
                title=title,
                link=urljoin(BASE, href),
                date=date_str,
                dept=dept,
                attachment=self._has_attachment(li),
            )
            items.append((item, raw_context))

        return items

    @staticmethod
    def _extract_href(a) -> str:
        href = (a.get("href") or "").strip()
        onclick = (a.get("onclick") or "").strip()
        if "repSeq=" in href and "/IC010205/view" in href:
            return href

        for value in (href, onclick):
            if "repSeq=" not in value:
                continue
            url_match = re.search(r"(https?://[^'\"\s)]+/IC010205/view\?[^'\"\s)]+|/IC010205/view\?[^'\"\s)]+)", value)
            if url_match:
                return url_match.group(1)
            rep_seq_match = REP_SEQ_RE.search(value)
            if rep_seq_match:
                return f"/IC010205/view?repSeq={rep_seq_match.group(1)}"
        return ""

    @staticmethod
    def _extract_title(li) -> str:
        subject = li.select_one(".subject")
        if subject:
            title = subject.get_text(" ", strip=True)
            if title:
                return re.sub(r"\s+", " ", title).strip()
        img = li.find("img", alt=True)
        if img:
            title = (img.get("alt") or "").strip()
            if title:
                return re.sub(r"\s+", " ", title).strip()
        a = li.find("a")
        if a:
            text = a.get_text(" ", strip=True)
            if text:
                # 링크 전체 텍스트에는 요약/메타가 섞일 수 있어 첫 문장성 제목 후보만 사용한다.
                text = re.split(r"\s{2,}|제공일자|제공부서", text, maxsplit=1)[0]
                return re.sub(r"\s+", " ", text).strip()
        return ""

    @staticmethod
    def _extract_meta(li) -> tuple[str, str]:
        date_str = ""
        dept = ""
        for dl in li.select("dl.item"):
            dt = dl.find("dt")
            dd = dl.find("dd")
            if not dt or not dd:
                continue
            label = dt.get_text(" ", strip=True)
            value = dd.get_text(" ", strip=True)
            if "제공일자" in label:
                date_str = IncheonSource._extract_date([value])
            elif "제공부서" in label:
                dept = value
        if not date_str:
            date_str = IncheonSource._extract_date([li.get_text(" ", strip=True)])
        return date_str, dept

    @staticmethod
    def _extract_date(texts) -> str:
        for t in texts:
            m = DATE_RE.search(t)
            if m:
                y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
                return f"{y}-{mo}-{d}"
        return ""

    @staticmethod
    def _extract_num(href: str) -> str:
        m = REP_SEQ_RE.search(href or "")
        if not m:
            return ""
        return m.group(1)

    @staticmethod
    def _has_attachment(li) -> bool:
        return bool(
            li.find(class_=re.compile(r"file|attach", re.I))
            or li.find("a", href=re.compile(r"download|file|attach|dmsFileDownload", re.I))
        )

    @staticmethod
    def _is_target_topic_raw(raw_title: str, raw_context: str, dept: str) -> bool:
        if not INCHEON_TOPIC_KEYWORDS:
            return True
        haystack = " ".join(
            [
                raw_title or "",
                raw_context or "",
                dept or "",
            ]
        )
        return any(keyword in haystack for keyword in INCHEON_TOPIC_KEYWORDS)
