"""
울산광역시 보도자료 어댑터.

대상: https://www.ulsan.go.kr/u/rep/bbs/list.ulsan
- 목록 페이지: page (1부터)
- 목록 테이블에 제목/담당부서/작성일자/조회수가 있어 상세 페이지 추가 조회 없이 파싱한다.
- 담당부서와 제목의 교통/건설/모빌리티 키워드로 선별한다.
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


log = logging.getLogger("press-hub.ulsan")

BASE = "https://www.ulsan.go.kr"
LIST_URL = f"{BASE}/u/rep/bbs/list.ulsan"
BBS_ID = "BBS_0000000000000027"
MENU_ID = "001004003001000000"

DATE_RE = re.compile(r"(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})")
DATA_ID_RE = re.compile(r"[?&]dataId=(\d+)")


def _load_ulsan_keyword_filter() -> tuple[str, ...]:
    """울산시 전용 모빌리티/도시 분야 필터링 키워드.

    필요 시 서버 시작 전 환경변수로 덮어쓰기 가능:
      ULSAN_INCLUDE_KEYWORDS=교통,버스,도로,자동차
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
        "광역교통",
        "무인교통",
        "보호구역",
        "운송",
        "건설",
        "건설도로",
        "차로",
        "통행",
        "물류",
        "BRT",
        "GTX",
    )
    raw = (os.getenv("ULSAN_INCLUDE_KEYWORDS") or "").strip()
    if not raw:
        return default_keywords
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return tuple(parts) if parts else default_keywords


ULSAN_TOPIC_KEYWORDS: tuple[str, ...] = _load_ulsan_keyword_filter()


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


class UlsanSource(Source):
    id = "ulsan"
    name = "울산광역시"
    color = "#1e7e34"
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
            params = self._build_params(page)
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
                    log.exception("[ulsan] 병렬 페이지 요청 실패: %s", result)
                    if not items:
                        raise RuntimeError(f"울산시 목록 조회 실패: {result}") from result
                    should_stop = True
                    break

                page, used_url, status, html = result
                page_items_before = self._parse(html)
                page_items = [
                    it
                    for it in page_items_before
                    if (not it.date) or (from_date <= it.date <= to_date)
                ]
                page_items = [it for it in page_items if self._is_target_topic(it)]

                added = 0
                for it in page_items:
                    key = f"{it.title}|{it.date}|{it.link}"
                    if key in seen:
                        continue
                    seen.add(key)
                    items.append(it)
                    added += 1

                log.info(
                    "[ulsan] page=%s status=%s html=%d bytes parsed=%d(raw=%d) added=%d url=%s",
                    page,
                    status,
                    len(html),
                    len(page_items),
                    len(page_items_before),
                    added,
                    used_url,
                )

                if len(page_items_before) == 0:
                    should_stop = True
                    break

                oldest = self._oldest_date(page_items_before)
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
    def _build_params(page: int) -> dict:
        return {
            "bbsId": BBS_ID,
            "mId": MENU_ID,
            "page": str(page),
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
            log.warning("[ulsan] httpx 실패 -> urllib 폴백: %s", primary.__class__.__name__)

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
                entries = self._parse(html)
                out["httpx"] = {
                    "ok": r.is_success,
                    "status": r.status_code,
                    "url": str(r.url),
                    "encoding": r.encoding,
                    "html_length": len(html),
                    "html_head": html[:4000],
                    "table_count": html.count("<table"),
                    "parsed_count": len(entries),
                }
        except Exception as e:  # noqa: BLE001
            out["httpx"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}

        try:
            status, text, used_url = await asyncio.to_thread(self._urllib_fetch, LIST_URL, params, 20.0)
            entries = self._parse(text)
            out["urllib"] = {
                "ok": 200 <= status < 400,
                "status": status,
                "url": used_url,
                "html_length": len(text),
                "html_head": text[:4000],
                "table_count": text.count("<table"),
                "parsed_count": len(entries),
            }
        except Exception as e:  # noqa: BLE001
            out["urllib"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}

        out["ok"] = bool(out.get("httpx", {}).get("ok") or out.get("urllib", {}).get("ok"))
        return out

    def _parse(self, html: str) -> List[PressItem]:
        soup = BeautifulSoup(html, "lxml")
        root = soup.select_one("#contents") or soup.select_one("#content") or soup
        table = self._find_board_table(root)
        if table is None:
            return []
        return self._parse_table(table)

    @staticmethod
    def _find_board_table(soup: BeautifulSoup):
        for table in soup.find_all("table"):
            labels = [th.get_text(" ", strip=True) for th in table.find_all("th")]
            normalized = " ".join(labels)
            if "제목" in normalized and "담당부서" in normalized and "작성일자" in normalized:
                return table
        return None

    def _parse_table(self, table) -> List[PressItem]:
        items: List[PressItem] = []
        header_cells = table.select("thead th")
        if not header_cells:
            first_tr = table.find("tr")
            header_cells = first_tr.find_all("th") if first_tr else []
        cols = self._map_header_cells(header_cells)
        rows = table.select("tbody tr") or table.find_all("tr")

        for tr in rows:
            if tr.find_all("th", recursive=False) and not tr.find_all("td", recursive=False):
                continue

            cells = tr.find_all(["td", "th"])
            if len(cells) < 4:
                continue

            idx_title = cols.get("title")
            title_cell = cells[idx_title] if idx_title is not None and idx_title < len(cells) else None
            if title_cell is None:
                continue

            a = title_cell.find("a", href=True)
            if not a:
                continue

            title = re.sub(r"\s+", " ", a.get_text(" ", strip=True)).strip()
            if not title:
                continue

            href = (a.get("href") or "").strip()
            link = urljoin(LIST_URL, href)

            num = self._cell_text(cells, cols.get("num"))
            dept = self._cell_text(cells, cols.get("dept"))
            date_str = self._extract_date([self._cell_text(cells, cols.get("date")), tr.get_text(" ", strip=True)])
            views = self._cell_text(cells, cols.get("views"))

            items.append(
                PressItem(
                    source=self.id,
                    sourceName=self.name,
                    num=num or self._extract_data_id(link),
                    category="",
                    title=title,
                    link=link,
                    date=date_str,
                    dept=dept,
                    views=views,
                    attachment=self._has_attachment(tr),
                )
            )

        return items

    @staticmethod
    def _map_header_cells(th_cells) -> dict:
        def norm(s: str) -> str:
            return re.sub(r"\s+", "", (s or "").strip())

        labels = [norm(th.get_text(" ", strip=True)) for th in th_cells]

        def find_idx(*keywords: str):
            for i, lab in enumerate(labels):
                for k in keywords:
                    if k in lab:
                        return i
            return None

        return {
            "num": find_idx("번호"),
            "title": find_idx("제목"),
            "dept": find_idx("담당부서", "부서"),
            "date": find_idx("작성일자", "작성일", "등록일"),
            "views": find_idx("조회수", "조회"),
        }

    @staticmethod
    def _cell_text(cells, idx) -> str:
        if idx is None or idx >= len(cells):
            return ""
        return re.sub(r"\s+", " ", cells[idx].get_text(" ", strip=True)).strip()

    @staticmethod
    def _extract_date(texts) -> str:
        for t in texts:
            m = DATE_RE.search(t or "")
            if m:
                y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
                return f"{y}-{mo}-{d}"
        return ""

    @staticmethod
    def _extract_data_id(url: str) -> str:
        m = DATA_ID_RE.search(url or "")
        return m.group(1) if m else ""

    @staticmethod
    def _has_attachment(tr) -> bool:
        return bool(
            tr.find("img", alt=re.compile(r"첨부|파일|file|attach", re.I))
            or tr.find("img", src=re.compile(r"file|attach|clip|icon_file", re.I))
            or tr.find("a", href=re.compile(r"download|file|attach", re.I))
        )

    @staticmethod
    def _is_target_topic(item: PressItem) -> bool:
        if not ULSAN_TOPIC_KEYWORDS:
            return True
        haystack = " ".join(
            [
                item.title or "",
                item.dept or "",
            ]
        )
        return any(keyword in haystack for keyword in ULSAN_TOPIC_KEYWORDS)

