"""
광주광역시 보도자료 어댑터.

대상: https://www.gwangju.go.kr/boardList.do?boardId=BD_0000000027&pageId=www789
- 목록 페이지: movePage, recordCnt
- 목록에는 작성일이 없어 상세 페이지를 병렬 조회해 작성일/본문을 추출한다.
- 분류가 교통/건설이면 반드시 포함하고, 그 외 분류는 모빌리티 키워드로 선별한다.
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


log = logging.getLogger("press-hub.gwangju")

BASE = "https://www.gwangju.go.kr"
LIST_URL = f"{BASE}/boardList.do"
PAGE_ID = "www789"
BOARD_ID = "BD_0000000027"

DATE_RE = re.compile(r"(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})")
SEQ_RE = re.compile(r"[?&]seq=(\d+)")
NUM_RE = re.compile(r"^\d{1,8}$")

MANDATORY_CATEGORIES = {"교통", "건설"}
GWANGJU_CATEGORIES = {
    "이슈",
    "행정",
    "경제",
    "문화",
    "복지",
    "환경",
    "건설",
    "교통",
    "체육",
    "안전",
    "소통",
}


@dataclass
class _ListEntry:
    item: PressItem
    detail_url: str
    body_text: str = ""


def _load_gwangju_keyword_filter() -> tuple[str, ...]:
    """광주시 전용 모빌리티/도시 분야 필터링 키워드.

    필요 시 서버 시작 전 환경변수로 덮어쓰기 가능:
      GWANGJU_INCLUDE_KEYWORDS=교통,도시,버스,미래차
    """
    default_keywords = (
        "교통",
        "버스",
        "미래차",
        "자율주행",
        "도로",
        "철도",
        "대중교통",
        "모빌리티",
        "도시철도",
        "도시계획",
        "도시개발",
        "스마트도시",
        "지하철",
        "택시",
        "자동차",
        "주차",
        "교통약자",
        "공유자전거",
        "자전거",
        "공항",
        "물류",
        "차로",
        "통행",
        "BRT",
        "GTX",
    )
    raw = (os.getenv("GWANGJU_INCLUDE_KEYWORDS") or "").strip()
    if not raw:
        return default_keywords
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return tuple(parts) if parts else default_keywords


GWANGJU_TOPIC_KEYWORDS: tuple[str, ...] = _load_gwangju_keyword_filter()


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


class GwangjuSource(Source):
    id = "gwangju"
    name = "광주광역시"
    color = "#7c3aed"
    enabled = True

    PAGE_SIZE = 30
    MAX_PAGES = 60
    PAGE_CONCURRENCY = 2
    DETAIL_CONCURRENCY = 8
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
            params = self._build_params(page)
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
                    log.exception("[gwangju] 병렬 페이지 요청 실패: %s", result)
                    if not items:
                        raise RuntimeError(f"광주시 목록 조회 실패: {result}") from result
                    should_stop = True
                    break

                page, used_url, status, html = result
                entries = self._parse_list(html, page)
                await self._enrich_details(client, entries)

                dated_items = [entry.item for entry in entries]
                page_entries = [
                    entry
                    for entry in entries
                    if (not entry.item.date) or (from_date <= entry.item.date <= to_date)
                ]
                page_entries = [entry for entry in page_entries if self._is_target_topic(entry)]
                page_items = [entry.item for entry in page_entries]

                added = 0
                for it in page_items:
                    key = f"{it.title}|{it.date}|{it.link}"
                    if key in seen:
                        continue
                    seen.add(key)
                    items.append(it)
                    added += 1

                log.info(
                    "[gwangju] page=%s status=%s html=%d bytes parsed=%d(raw=%d) added=%d url=%s",
                    page,
                    status,
                    len(html),
                    len(page_items),
                    len(entries),
                    added,
                    used_url,
                )

                if len(entries) == 0:
                    should_stop = True
                    break

                oldest = self._oldest_date(dated_items)
                if oldest is not None and oldest < from_date_obj:
                    should_stop = True
                    break

            if should_stop:
                break

            await asyncio.sleep(0.05)

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
    def _build_params(page: int) -> dict:
        return {
            "pageId": PAGE_ID,
            "boardId": BOARD_ID,
            "movePage": str(page),
            "recordCnt": str(GwangjuSource.PAGE_SIZE),
        }

    async def fetch_raw(self, from_date: str, to_date: str, page: int = 1) -> dict:
        """디버깅용: 실제 목록 HTML 응답 일부/요약을 반환."""
        params = self._build_params(page)
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
                entries = self._parse_list(html, page)
                out["httpx"] = {
                    "ok": r.is_success,
                    "status": r.status_code,
                    "url": str(r.url),
                    "encoding": r.encoding,
                    "html_length": len(html),
                    "html_head": html[:4000],
                    "board_view_count": html.count("boardView.do"),
                    "parsed_count": len(entries),
                }
        except Exception as e:  # noqa: BLE001
            out["httpx"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}

        try:
            status, text, used_url = await asyncio.to_thread(self._urllib_fetch, LIST_URL, params, 20.0)
            entries = self._parse_list(text, page)
            out["urllib"] = {
                "ok": 200 <= status < 400,
                "status": status,
                "url": used_url,
                "html_length": len(text),
                "html_head": text[:4000],
                "board_view_count": text.count("boardView.do"),
                "parsed_count": len(entries),
            }
        except Exception as e:  # noqa: BLE001
            out["urllib"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}

        out["ok"] = bool(out.get("httpx", {}).get("ok") or out.get("urllib", {}).get("ok"))
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
            if not r.encoding or r.encoding.lower() in ("iso-8859-1", "ascii"):
                r.encoding = "utf-8"
            return str(r.url), r.status_code, r.text
        except Exception as primary:  # noqa: BLE001
            log.warning("[gwangju] httpx 실패 -> urllib 폴백: %s", primary.__class__.__name__)

        status, text, used_url = await asyncio.to_thread(
            self._urllib_fetch, url, params or {}, self.REQUEST_TIMEOUT
        )
        return used_url, status, text

    @staticmethod
    def _urllib_fetch(url: str, params: dict, timeout: float = 12.0) -> Tuple[int, str, str]:
        full_url = f"{url}?{urlencode(params)}" if params else url
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

    async def _enrich_details(self, client: httpx.AsyncClient, entries: List[_ListEntry]) -> None:
        if not entries:
            return

        sem = asyncio.Semaphore(self.DETAIL_CONCURRENCY)

        async def worker(entry: _ListEntry) -> None:
            async with sem:
                try:
                    _used_url, _status, html = await self._fetch_one(client, entry.detail_url)
                except Exception as e:  # noqa: BLE001
                    log.debug("[gwangju] detail 실패 %s: %s", entry.detail_url, e)
                    return
                date_str, body_text, has_attachment = self._parse_detail(html)
                if date_str:
                    entry.item.date = date_str
                if body_text:
                    entry.body_text = body_text[:4000]
                entry.item.attachment = has_attachment

        await asyncio.gather(*(worker(entry) for entry in entries), return_exceptions=True)

    def _parse_list(self, html: str, page: int) -> List[_ListEntry]:
        soup = BeautifulSoup(html, "lxml")
        root = soup.select_one("#contents") or soup.select_one("#content") or soup
        entries: List[_ListEntry] = []

        for a in root.find_all("a", href=True):
            href = (a.get("href") or "").strip()
            if "boardView.do" not in href or "seq=" not in href:
                continue
            title = re.sub(r"\s+", " ", a.get_text(" ", strip=True)).strip()
            if not title:
                continue

            tr = a.find_parent("tr")
            row_text = tr.get_text(" ", strip=True) if tr else a.find_parent().get_text(" ", strip=True)
            category = self._extract_category(row_text)
            num = self._extract_num(row_text)
            views = self._extract_views(row_text)
            detail_url = urljoin(BASE, href)

            item = PressItem(
                source=self.id,
                sourceName=self.name,
                num=num or self._extract_seq(detail_url),
                category=category,
                title=title,
                link=detail_url,
                date="",
                dept="",
                views=views,
            )
            entries.append(_ListEntry(item=item, detail_url=detail_url))

        return entries

    @staticmethod
    def _extract_category(text: str) -> str:
        m = re.search(r"분류\s*([가-힣]+)", text or "")
        if m and m.group(1) in GWANGJU_CATEGORIES:
            return m.group(1)
        for category in GWANGJU_CATEGORIES:
            if re.search(rf"(?:^|\s){re.escape(category)}(?:\s|$)", text or ""):
                return category
        return ""

    @staticmethod
    def _extract_num(text: str) -> str:
        m = re.search(r"번호\s*([0-9,]+)", text or "")
        if m:
            return m.group(1)
        return ""

    @staticmethod
    def _extract_seq(url: str) -> str:
        m = SEQ_RE.search(url or "")
        return m.group(1) if m else ""

    @staticmethod
    def _extract_views(text: str) -> str:
        m = re.search(r"조회\s*([0-9,]+)", text or "")
        return m.group(1) if m else ""

    @staticmethod
    def _parse_detail(html: str) -> tuple[str, str, bool]:
        soup = BeautifulSoup(html, "lxml")
        root = (
            soup.select_one(".board_view")
            or soup.select_one(".boardView")
            or soup.select_one(".bbs_view")
            or soup.select_one(".view")
            or soup.select_one("#contents")
            or soup.select_one("#content")
            or soup
        )
        text = root.get_text(" ", strip=True)
        date_str = ""
        m = re.search(r"작성일\s*[:：]?\s*(\d{4}[-./]\d{1,2}[-./]\d{1,2})", text)
        if m:
            date_str = GwangjuSource._extract_date([m.group(1)])
        if not date_str:
            date_str = GwangjuSource._extract_date([text])

        body_text = text
        marker = "작성일"
        idx = body_text.find(marker)
        if idx >= 0:
            body_text = body_text[idx + len(marker):]
        for tail in ("1유형", "첨부파일", "다음글", "이전글", "자료관리"):
            tail_idx = body_text.find(tail)
            if tail_idx > 0:
                body_text = body_text[:tail_idx]
                break
        body_text = re.sub(r"\s+", " ", body_text).strip()

        has_attachment = "첨부파일" in text and "첨부파일 없음" not in text
        return date_str, body_text, has_attachment

    @staticmethod
    def _extract_date(texts) -> str:
        for t in texts:
            m = DATE_RE.search(t)
            if m:
                y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
                return f"{y}-{mo}-{d}"
        return ""

    @staticmethod
    def _is_target_topic(entry: _ListEntry) -> bool:
        item = entry.item
        if item.category in MANDATORY_CATEGORIES:
            return True
        if not GWANGJU_TOPIC_KEYWORDS:
            return True
        haystack = " ".join(
            [
                item.title or "",
                item.category or "",
                entry.body_text or "",
            ]
        )
        return any(keyword in haystack for keyword in GWANGJU_TOPIC_KEYWORDS)

