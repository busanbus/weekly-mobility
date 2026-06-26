"""
서울특별시 보도자료 어댑터.

대상: https://www.seoul.go.kr/news/news_report.do
- 보도자료 게시판 bbsNo=158
- 분야 필터: 교통(465), 주택(467)만 조회
- 목록 테이블에 제목/담당부서/등록일이 구조화되어 있어 상세 페이지 추가 조회 없이 파싱한다.
"""

from __future__ import annotations

import asyncio
import gzip
import logging
import re
import ssl
import urllib.request
from datetime import date, datetime
from typing import List, Tuple
from urllib.parse import urlencode, urljoin

import httpx
from bs4 import BeautifulSoup

from .base import PressItem, Source


log = logging.getLogger("press-hub.seoul")

BASE = "https://www.seoul.go.kr"
LIST_URL = f"{BASE}/news/news_report.do"
BBS_NO = "158"
CATEGORY_TYPES = "465,467"  # 교통, 주택

DATE_RE = re.compile(r"(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})")
NUM_RE = re.compile(r"^\d{1,8}$")
NTT_NO_RE = re.compile(r"fnTbbsView\(['\"]?(\d+)['\"]?\)")


def _make_ssl_context() -> ssl.SSLContext:
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


class SeoulSource(Source):
    id = "seoul"
    name = "서울특별시"
    color = "#cc0033"
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
                    log.exception("[seoul] 병렬 페이지 요청 실패: %s", result)
                    if not items:
                        raise RuntimeError(f"서울시 목록 조회 실패: {result}") from result
                    should_stop = True
                    break

                page, used_url, status, html = result
                page_items_before = self._parse(html)
                page_items = [
                    it for it in page_items_before if (not it.date) or (from_date <= it.date <= to_date)
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
                    "[seoul] page=%s status=%s html=%d bytes parsed=%d(raw=%d) added=%d url=%s",
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
    def _build_params(from_date: str, to_date: str, page: int) -> dict:
        return {
            "bbsNo": BBS_NO,
            "cntPerPage": str(SeoulSource.PAGE_SIZE),
            "curPage": str(page),
            "srchCtgryType": CATEGORY_TYPES,
            # 서울시 스크립트는 날짜 검색값에서 '-'를 제거해 전송한다.
            "srchBeginDt": from_date.replace("-", ""),
            "srchEndDt": to_date.replace("-", ""),
        }

    async def _fetch_one(self, client: httpx.AsyncClient, params: dict) -> Tuple[str, int, str]:
        try:
            r = await client.get(LIST_URL, params=params)
            r.raise_for_status()
            if not r.encoding or r.encoding.lower() in ("iso-8859-1", "ascii"):
                r.encoding = "utf-8"
            return str(r.url), r.status_code, r.text
        except Exception as primary:  # noqa: BLE001
            log.warning("[seoul] httpx 실패 -> urllib 폴백: %s", primary.__class__.__name__)

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
                    "table_count": html.count("<table"),
                    "tbody_tr_count": html.count("<tr"),
                }
        except Exception as e:  # noqa: BLE001
            out["httpx"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}
        out["ok"] = bool(out.get("httpx", {}).get("ok"))
        return out

    def _parse(self, html: str) -> List[PressItem]:
        soup = BeautifulSoup(html, "lxml")
        root = soup.select_one("#content") or soup
        table = self._find_board_table(root)
        if table is None:
            return []
        return self._parse_table(table)

    @staticmethod
    def _find_board_table(soup: BeautifulSoup):
        for table in soup.find_all("table"):
            labels = [th.get_text(" ", strip=True) for th in table.find_all("th")]
            normalized = " ".join(labels)
            if "제목" in normalized and "담당부서" in normalized and "등록일" in normalized:
                return table
        return None

    def _parse_table(self, table) -> List[PressItem]:
        items: List[PressItem] = []
        header_cells = table.select("thead th")
        cols = self._map_header_cells(header_cells)
        rows = table.select("tbody tr") or table.find_all("tr")

        for tr in rows:
            tds = tr.find_all("td")
            if len(tds) < 3:
                continue

            idx_num = cols.get("num")
            idx_title = cols.get("title")
            idx_dept = cols.get("dept")
            idx_date = cols.get("date")

            title_cell = tds[idx_title] if idx_title is not None and idx_title < len(tds) else None
            if title_cell is None:
                continue

            a = title_cell.find("a", href=True)
            if not a:
                continue

            title = re.sub(r"\s+", " ", a.get_text(" ", strip=True)).strip()
            if not title:
                continue

            href = (a.get("href") or "").strip()
            link = self._resolve_link(href)

            num = ""
            if idx_num is not None and idx_num < len(tds):
                num = tds[idx_num].get_text(" ", strip=True)
                num = num if NUM_RE.match(num.replace(",", "")) else ""

            dept = ""
            if idx_dept is not None and idx_dept < len(tds):
                dept = tds[idx_dept].get_text(" ", strip=True)

            date_str = ""
            if idx_date is not None and idx_date < len(tds):
                date_str = self._extract_date([tds[idx_date].get_text(" ", strip=True)])
            if not date_str:
                date_str = self._extract_date([tr.get_text(" ", strip=True)])

            items.append(
                PressItem(
                    source=self.id,
                    sourceName=self.name,
                    num=num,
                    category="",
                    title=title,
                    link=link,
                    date=date_str,
                    dept=dept,
                    attachment=bool(tr.select_one(".sib-ico-set-file")),
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
            "date": find_idx("등록일", "작성일", "게시일"),
        }

    @staticmethod
    def _extract_date(texts) -> str:
        for t in texts:
            m = DATE_RE.search(t)
            if m:
                y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
                return f"{y}-{mo}-{d}"
        return ""

    @staticmethod
    def _resolve_link(href: str) -> str:
        m = NTT_NO_RE.search(href or "")
        if m:
            params = {
                "bbsNo": BBS_NO,
                "nttNo": m.group(1),
                "cntPerPage": str(SeoulSource.PAGE_SIZE),
                "curPage": "1",
                "srchCtgryType": CATEGORY_TYPES,
            }
            return f"{LIST_URL}?{urlencode(params)}"
        return urljoin(BASE, href)
