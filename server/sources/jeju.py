"""
제주도 보도자료 어댑터.

대상: https://www.jeju.go.kr/news/bodo/list.htm
- 목록 페이지: page (1부터)
- 기간 검색: dr.start, dr.end
- 분야 검색: category=3070 이 건설·교통
- 목록 카드에 제목/부제/요약/담당부서/날짜가 있어 상세 페이지 추가 조회 없이 파싱한다.
- 건설·교통 분야는 우선 포함하고, 전체 목록에서는 제목/요약/담당부서 키워드로 추가 선별한다.
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


log = logging.getLogger("press-hub.jeju")

BASE = "https://www.jeju.go.kr"
LIST_URL = f"{BASE}/news/bodo/list.htm"
CONSTRUCTION_TRAFFIC_CATEGORY = "3070"

DATE_RE = re.compile(r"(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})")
SEQ_RE = re.compile(r"[?&]seq=(\d+)")


def _load_jeju_keyword_filter() -> tuple[str, ...]:
    """제주도 전용 교통/건설/모빌리티 분야 필터링 키워드.

    필요 시 서버 시작 전 환경변수로 덮어쓰기 가능:
      JEJU_INCLUDE_KEYWORDS=교통,버스,도로,공항
    """
    default_keywords = (
        "교통",
        "버스",
        "택시",
        "도로",
        "철도",
        "대중교통",
        "모빌리티",
        "자율주행",
        "미래차",
        "전기차",
        "전기자동차",
        "자동차",
        "차량",
        "주차",
        "교통약자",
        "공항",
        "항공",
        "항만",
        "물류",
        "운송",
        "차로",
        "통행",
        "보행",
        "자전거",
        "스마트도시",
        "도시계획",
        "건설",
    )
    raw = (os.getenv("JEJU_INCLUDE_KEYWORDS") or "").strip()
    if not raw:
        return default_keywords
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return tuple(parts) if parts else default_keywords


JEJU_TOPIC_KEYWORDS: tuple[str, ...] = _load_jeju_keyword_filter()


@dataclass
class _ParsedEntry:
    item: PressItem
    raw_context: str


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


class JejuSource(Source):
    id = "jeju"
    name = "제주특별자치도"
    color = "#f58220"
    # 클라우드(해외) IP에서 jeju.go.kr 접속이 차단/타임아웃되어 임시 비활성화.
    # 로컬에서 돌릴 때 다시 쓰려면 True 로 바꾸거나 환경변수로 제어하면 된다.
    enabled = False

    MAX_PAGES = 50
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
            items: List[PressItem] = []
            seen: set[str] = set()

            category_items = await self._fetch_pages(
                client,
                from_date,
                to_date,
                category=CONSTRUCTION_TRAFFIC_CATEGORY,
                require_keyword=False,
            )
            self._extend_unique(items, seen, category_items)

            keyword_items = await self._fetch_pages(
                client,
                from_date,
                to_date,
                category="",
                require_keyword=True,
            )
            self._extend_unique(items, seen, keyword_items)

            return items

    async def _fetch_pages(
        self,
        client: httpx.AsyncClient,
        from_date: str,
        to_date: str,
        *,
        category: str,
        require_keyword: bool,
    ) -> List[PressItem]:
        items: List[PressItem] = []
        seen: set[str] = set()
        from_date_obj = datetime.strptime(from_date, "%Y-%m-%d").date()

        async def fetch_page(page: int):
            params = self._build_params(from_date, to_date, page, category)
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
                    log.exception("[jeju] 병렬 페이지 요청 실패: %s", result)
                    if not items:
                        raise RuntimeError(f"제주도 목록 조회 실패: {result}") from result
                    should_stop = True
                    break

                page, used_url, status, html = result
                page_entries_before = self._parse_entries(
                    html,
                    category_name="건설·교통" if category else "",
                )
                page_entries = [
                    entry
                    for entry in page_entries_before
                    if (not entry.item.date) or (from_date <= entry.item.date <= to_date)
                ]
                if require_keyword:
                    page_entries = [
                        entry for entry in page_entries if self._is_target_topic(entry)
                    ]

                added = 0
                for entry in page_entries:
                    key = self._key(entry.item)
                    if key in seen:
                        continue
                    seen.add(key)
                    items.append(entry.item)
                    added += 1

                log.info(
                    "[jeju] page=%s category=%s status=%s html=%d bytes parsed=%d(raw=%d) added=%d url=%s",
                    page,
                    category or "all",
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

                oldest = self._oldest_date([entry.item for entry in page_entries_before])
                if oldest is not None and oldest < from_date_obj:
                    should_stop = True
                    break

            if should_stop:
                break

            await asyncio.sleep(0.03)

        return items

    @staticmethod
    def _extend_unique(target: List[PressItem], seen: set[str], incoming: List[PressItem]) -> None:
        for item in incoming:
            key = JejuSource._key(item)
            if key in seen:
                continue
            seen.add(key)
            target.append(item)

    @staticmethod
    def _key(item: PressItem) -> str:
        return item.num or item.link or f"{item.title}|{item.date}|{item.dept}"

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
    def _build_params(from_date: str, to_date: str, page: int, category: str = "") -> dict:
        params = {
            "dr.start": from_date,
            "dr.end": to_date,
        }
        if page > 1:
            params["page"] = str(page)
        if category:
            params["category"] = category
        return params

    async def _fetch_one(self, client: httpx.AsyncClient, params: dict) -> Tuple[str, int, str]:
        """httpx -> urllib 폴백. 반환: (used_url, status_code, html)"""
        try:
            r = await client.get(LIST_URL, params=params)
            r.raise_for_status()
            if not r.encoding or r.encoding.lower() in ("iso-8859-1", "ascii"):
                r.encoding = "utf-8"
            return str(r.url), r.status_code, r.text
        except Exception as primary:  # noqa: BLE001
            log.warning("[jeju] httpx 실패 -> urllib 폴백: %s", primary.__class__.__name__)

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

    async def fetch_raw(
        self,
        from_date: str,
        to_date: str,
        page: int = 1,
        category: str = CONSTRUCTION_TRAFFIC_CATEGORY,
    ) -> dict:
        """디버깅용: 실제 목록 HTML 응답 일부/요약을 반환."""
        params = self._build_params(from_date, to_date, page, category)
        out: dict = {"params": params, "range": {"from": from_date, "to": to_date}}
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
                entries = self._parse_entries(html, category_name="건설·교통" if category else "")
                out["httpx"] = {
                    "ok": r.is_success,
                    "status": r.status_code,
                    "url": str(r.url),
                    "encoding": r.encoding,
                    "html_length": len(html),
                    "html_head": html[:4000],
                    "parsed_count": len(entries),
                    "sample": [entry.item.dict() for entry in entries[:5]],
                }
        except Exception as e:  # noqa: BLE001
            out["httpx"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}

        try:
            status, text, used_url = await asyncio.to_thread(self._urllib_fetch, LIST_URL, params, 20.0)
            entries = self._parse_entries(text, category_name="건설·교통" if category else "")
            out["urllib"] = {
                "ok": 200 <= status < 400,
                "status": status,
                "url": used_url,
                "html_length": len(text),
                "html_head": text[:4000],
                "parsed_count": len(entries),
                "sample": [entry.item.dict() for entry in entries[:5]],
            }
        except Exception as e:  # noqa: BLE001
            out["urllib"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}

        out["ok"] = bool(out.get("httpx", {}).get("ok") or out.get("urllib", {}).get("ok"))
        return out

    def _parse_entries(self, html: str, *, category_name: str = "") -> List[_ParsedEntry]:
        soup = BeautifulSoup(html, "lxml")
        root = soup.select_one("#content") or soup.select_one("#contents") or soup
        entries: List[_ParsedEntry] = []

        for article in root.select(".board-news__article"):
            a = article.find("a", href=True)
            if not a:
                continue

            title = self._text(article.select_one("strong.text-ellipsis"))
            subtitle = self._text(article.select_one(".tit2"))
            summary = self._text(article.select_one(".txt"))
            meta = self._text(article.select_one(".date"))
            dept, date_str = self._parse_meta(meta)

            if not title or not date_str:
                continue

            href = (a.get("href") or "").strip()
            link = urljoin(BASE, href)
            seq = self._extract_seq(link)
            raw_context = self._text(article)

            entries.append(
                _ParsedEntry(
                    item=PressItem(
                        source=self.id,
                        sourceName=self.name,
                        num=seq,
                        category=category_name,
                        title=title,
                        link=link,
                        date=date_str,
                        dept=dept,
                        attachment=self._has_attachment(article),
                    ),
                    raw_context=" ".join([title, subtitle, summary, dept, raw_context]),
                )
            )

        return entries

    @staticmethod
    def _text(node) -> str:
        if node is None:
            return ""
        return re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip()

    @staticmethod
    def _parse_meta(meta: str) -> tuple[str, str]:
        date_str = JejuSource._extract_date([meta])
        dept = meta
        if "|" in dept:
            dept = dept.split("|", 1)[0]
        dept = DATE_RE.sub("", dept)
        dept = re.sub(r"[\s|]+", " ", dept).strip()
        return dept, date_str

    @staticmethod
    def _extract_date(texts) -> str:
        for t in texts:
            m = DATE_RE.search(t or "")
            if m:
                y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
                return f"{y}-{mo}-{d}"
        return ""

    @staticmethod
    def _extract_seq(url: str) -> str:
        m = SEQ_RE.search(url or "")
        return m.group(1) if m else ""

    @staticmethod
    def _has_attachment(article) -> bool:
        return bool(
            article.find("img", alt=re.compile(r"첨부|파일|file|attach", re.I))
            or article.find("img", src=re.compile(r"file|attach|clip", re.I))
            or article.find("a", href=re.compile(r"download|file|attach", re.I))
        )

    @staticmethod
    def _is_target_topic(entry: _ParsedEntry) -> bool:
        if not JEJU_TOPIC_KEYWORDS:
            return True
        haystack = " ".join(
            [
                entry.raw_context or "",
                entry.item.title or "",
                entry.item.dept or "",
            ]
        )
        return any(keyword in haystack for keyword in JEJU_TOPIC_KEYWORDS)

