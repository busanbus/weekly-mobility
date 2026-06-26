"""
부산광역시 보도자료 어댑터.

대상: https://www.busan.go.kr/nbtnewsBU
- 기간 파라미터: srchBeginDt, srchEndDt (YYYY-MM-DD)
- 페이지: curPage (1부터)

사이트 구조가 바뀌어도 최대한 견디도록,
1) tbody 행이 가장 많은 table 을 게시판으로 간주하거나
2) 없으면 'a' 링크가 많은 list(ul/ol/div) 컨테이너를 후보로 삼는 휴리스틱을 사용한다.
"""

from __future__ import annotations

import asyncio
import gzip
import os
import logging
import re
import ssl
import urllib.error
import urllib.request
from datetime import date, datetime
from typing import List, Tuple
from urllib.parse import urlencode, urljoin

import httpx
from bs4 import BeautifulSoup

from .base import PressItem, Source


log = logging.getLogger("press-hub.busan")

BASE = "https://www.busan.go.kr"
LIST_URL = f"{BASE}/nbtnewsBU"

DATE_RE = re.compile(r"(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})")
NUM_RE = re.compile(r"^\d{1,8}$")
DETAIL_HREF_RE = re.compile(
    r"(?:^|/)(?:nbtnewsBU)(?:/|$)|[?&](?:boardNo|nttNo|articleNo|idx|no)=", re.I
)
PHONE_RE = re.compile(r"\b\d{3,4}-\d{3,4}\b")


def _load_busan_keyword_filter() -> tuple[str, ...]:
    """부산시 전용 필터링 키워드.

    - 기본 활성: 교통, 도시, 버스
    - 필요 시 서버 시작 전 환경변수로 덮어쓰기 가능:
      BUSAN_INCLUDE_KEYWORDS=교통,도시,버스
    """
    default_keywords = ("교통", "도시", "버스")
    raw = (os.getenv("BUSAN_INCLUDE_KEYWORDS") or "").strip()
    if not raw:
        return default_keywords
    parts = []
    for p in raw.split(","):
        s = p.strip()
        if s:
            parts.append(s)
    return tuple(parts) if parts else default_keywords


BUSAN_TOPIC_KEYWORDS: tuple[str, ...] = _load_busan_keyword_filter()


def _make_ssl_context() -> ssl.SSLContext:
    """정부/공공 사이트 호환성을 위한 느슨한 SSL 컨텍스트."""
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


class BusanSource(Source):
    id = "busan"
    name = "부산광역시"
    color = "#005bac"
    enabled = True

    PAGE_SIZE = 15  # 부산시 목록 기본 페이지 크기
    MAX_PAGES = 50  # 무한루프 방지용 안전장치. 실제 종료는 날짜 컷오프/빈 페이지 기준.
    REQUEST_TIMEOUT = 12.0
    PAGE_CONCURRENCY = 3

    async def fetch(self, from_date: str, to_date: str) -> List[PressItem]:
        async with httpx.AsyncClient(
            timeout=self.REQUEST_TIMEOUT,
            follow_redirects=True,
            headers=DEFAULT_HEADERS,
            verify=_make_ssl_context(),
            http2=False,
        ) as client:
            # 결과 품질은 기존 넓은 조회 방식이 가장 좋았으므로 유지한다.
            # 성능은 페이지를 3개씩 병렬 조회해 개선한다.
            return await self._fetch_pages(client, from_date, to_date, search_text="")

    async def _fetch_pages(
        self,
        client: httpx.AsyncClient,
        from_date: str,
        to_date: str,
        search_text: str = "",
    ) -> List[PressItem]:
        items: List[PressItem] = []
        seen: set[str] = set()
        from_date_obj = datetime.strptime(from_date, "%Y-%m-%d").date()

        async def fetch_page(page: int):
            params = self._build_params(from_date, to_date, page, search_text=search_text)
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
                    log.exception("[busan] 병렬 페이지 요청 실패: %s", result)
                    if not items:
                        raise RuntimeError(f"부산시 목록 조회 실패: {result}") from result
                    should_stop = True
                    break

                page, used_url, status, html = result
                page_items = self._parse(html)
                # 기간 재필터 (혹시 서버측 기간필터가 무시되거나 포함 범위가 넓을 수 있음)
                page_items_before = page_items[:]
                page_items = [
                    it for it in page_items if (not it.date) or (from_date <= it.date <= to_date)
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
                    "[busan] broad page=%s status=%s html=%d bytes parsed=%d(raw=%d) added=%d url=%s",
                    page,
                    status,
                    len(html),
                    len(page_items),
                    len(page_items_before),
                    added,
                    used_url,
                )

                # 마지막 페이지 판단은 "필터링 후 개수"가 아니라,
                # 원래 목록에서 파싱한 행 수(raw)가 0 이면 종료.
                if len(page_items_before) == 0:
                    should_stop = True
                    break

                # 날짜가 최신순 정렬되어 있다고 가정하고, 이번 페이지의 최솟값이 시작일보다 과거면 종료.
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

    # ------------------------------------------------------------------ #
    # 요청
    # ------------------------------------------------------------------ #
    @staticmethod
    def _build_params(
        from_date: str,
        to_date: str,
        page: int,
        search_text: str = "",
    ) -> dict:
        return {
            "curPage": str(page),
            "srchBeginDt": from_date,
            "srchEndDt": to_date,
            # srchKey 빈 값은 부산시 목록의 "검색조건 선택" 기본 상태.
            # 제목/내용/부서명 등 전체 후보에서 검색되도록 서버 검색어만 전달한다.
            "srchKey": "",
            "srchText": search_text,
        }

    async def _fetch_one(self, client: httpx.AsyncClient, params: dict) -> Tuple[str, int, str]:
        """httpx → urllib 폴백. 반환: (used_url, status_code, html)"""
        try:
            r = await client.get(LIST_URL, params=params)
            r.raise_for_status()
            if not r.encoding or r.encoding.lower() in ("iso-8859-1", "ascii"):
                r.encoding = "utf-8"
            return str(r.url), r.status_code, r.text
        except Exception as primary:  # noqa: BLE001
            log.warning("[busan] httpx 실패 → urllib 폴백: %s", primary.__class__.__name__)

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
        # httpx
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
                    "a_count": html.count("<a "),
                }
        except Exception as e:  # noqa: BLE001
            out["httpx"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}

        # urllib
        try:
            status, text, used_url = await asyncio.to_thread(self._urllib_fetch, LIST_URL, params, 20.0)
            out["urllib"] = {
                "ok": 200 <= status < 400,
                "status": status,
                "url": used_url,
                "html_length": len(text),
                "html_head": text[:4000],
                "table_count": text.count("<table"),
                "a_count": text.count("<a "),
            }
        except Exception as e:  # noqa: BLE001
            out["urllib"] = {"ok": False, "error": f"{e.__class__.__name__}: {e}"}

        out["ok"] = bool(out.get("httpx", {}).get("ok") or out.get("urllib", {}).get("ok"))
        return out

    # ------------------------------------------------------------------ #
    # 파싱
    # ------------------------------------------------------------------ #
    def _parse(self, html: str) -> List[PressItem]:
        soup = BeautifulSoup(html, "lxml")

        # 부산시 사이트는 메뉴/헤더 링크가 매우 많아 오탐이 발생하기 쉬움.
        # 따라서 본문 컨테이너(#contents)가 있으면 그 안에서만 목록을 찾는다.
        root = soup.select_one("#contents") or soup.select_one("#content") or soup

        # 1) 게시판 table 탐지
        table = self._find_board_table(root)
        if table is not None:
            return self._parse_table(table)

        # 2) table이 없으면 링크 많은 컨테이너(list 형태) 탐지
        container = self._find_link_container(root)
        if container is not None:
            items = self._parse_link_container(container)
            # 오탐 방지: 한 페이지에서 80건 이상 나오면 메뉴를 잡은 것으로 간주하고 폐기
            return items if len(items) <= 80 else []

        return []

    @staticmethod
    def _find_board_table(soup: BeautifulSoup):
        best = None
        best_count = 0
        for t in soup.find_all("table"):
            rows = t.select("tbody tr") or t.find_all("tr")
            if len(rows) > best_count:
                best = t
                best_count = len(rows)
        if best is not None and best_count >= 3:
            return best
        return None

    @staticmethod
    def _find_link_container(soup: BeautifulSoup):
        best = None
        best_score = 0
        # 흔한 컨테이너들 중 링크가 많은 곳
        for cand in soup.find_all(["ul", "ol", "div", "section"]):
            links = cand.find_all("a", href=True)
            if len(links) < 5:
                continue
            text_len = len(cand.get_text(" ", strip=True))
            score = len(links) * 10 + min(text_len, 2000) // 100
            if score > best_score:
                best = cand
                best_score = score
        return best

    def _parse_table(self, table) -> List[PressItem]:
        items: List[PressItem] = []
        thead = table.find("thead")
        header_cells = thead.find_all("th") if thead else []

        # thead 가 없는 테이블도 많아서, 첫 번째 <tr> 이 th 로만 구성된 경우를 헤더로 본다.
        if not header_cells:
            first_tr = table.find("tr")
            if first_tr:
                ths = first_tr.find_all("th", recursive=False)
                if ths and not first_tr.find("td", recursive=False):
                    header_cells = ths

        cols = self._map_header_cells(header_cells) if header_cells else None

        rows = table.select("tbody tr") or table.find_all("tr")
        for tr in rows:
            # 헤더 행 스킵
            if tr.find_all("th", recursive=False) and not tr.find_all("td", recursive=False):
                continue

            tds = tr.find_all("td")
            if len(tds) < 2:
                continue

            a = tr.find("a", href=True)
            # 헤더를 알면 제목 칼럼 우선 선택
            if cols and cols.get("title") is not None:
                idx = cols["title"]
                tds_here = tr.find_all(["td", "th"])
                if idx < len(tds_here):
                    a = tds_here[idx].find("a", href=True) or a

            if not a:
                continue

            raw_title = a.get_text(" ", strip=True)
            href = (a.get("href") or "").strip()
            if not href or href.startswith("#") or href.lower().startswith("javascript"):
                continue
            # 보도자료 상세로 보이는 링크만 허용
            if not DETAIL_HREF_RE.search(href):
                continue
            link = urljoin(BASE, href)
            cell_texts = [td.get_text(" ", strip=True) for td in tds]

            if cols:
                num = ""
                dept = ""
                date_str = ""
                category = ""
                idx_num = cols.get("num")
                idx_title = cols.get("title")
                idx_dept = cols.get("dept")
                idx_cat = cols.get("category") or cols.get("gubun")
                idx_date = cols.get("date")

                tds_here = tr.find_all(["td", "th"])
                if idx_num is not None and idx_num < len(tds_here):
                    num = tds_here[idx_num].get_text(" ", strip=True)
                if idx_dept is not None and idx_dept < len(tds_here):
                    dept = tds_here[idx_dept].get_text(" ", strip=True)
                if idx_cat is not None and idx_cat < len(tds_here):
                    category = tds_here[idx_cat].get_text(" ", strip=True)
                if idx_date is not None and idx_date < len(tds_here):
                    date_str = self._extract_date([tds_here[idx_date].get_text(" ", strip=True)])

                raw_context = " ".join([tds_here[i].get_text(" ", strip=True) for i in range(len(tds_here))])

                # num 이 비어있으면 휴리스틱
                if not num.strip():
                    num = self._extract_num(cell_texts)
                if not date_str.strip():
                    date_str = self._extract_date(cell_texts)
                if not dept.strip():
                    dept = self._extract_writer_dept(tr) or self._extract_dept(cell_texts)
                if not category.strip():
                    category = self._extract_category(cell_texts, dept, date_str, num)
            else:
                num = self._extract_num(cell_texts)
                date_str = self._extract_date(cell_texts)
                dept = self._extract_writer_dept(tr) or self._extract_dept(cell_texts)
                category = self._extract_category(cell_texts, dept, date_str, num)
                raw_context = " ".join(cell_texts)

            # 부산시는 '교통/도시/버스' 키워드가 정제 전 원문에 포함되면 통과
            if not self._is_target_topic_raw(raw_title, raw_context, dept):
                continue

            title = self._clean_title(raw_title)
            if not title:
                continue

            items.append(
                PressItem(
                    source=self.id,
                    sourceName=self.name,
                    num=num,
                    category=category,
                    title=title,
                    link=link,
                    date=date_str,
                    dept=dept,
                )
            )
        return items

    @staticmethod
    def _map_header_cells(th_cells) -> dict:
        """thead th 들의 텍스트로 컬럼 인덱스를 추정."""

        def norm(s: str) -> str:
            return re.sub(r"\s+", "", (s or "").strip())

        labels = [norm(th.get_text(" ", strip=True)) for th in th_cells]
        cols: dict[str, int | None] = {}

        def find_idx(*keywords: str):
            for i, lab in enumerate(labels):
                for k in keywords:
                    if k in lab:
                        return i
            return None

        cols["num"] = find_idx("번호")
        cols["title"] = find_idx("제목", "보도제목")
        cols["dept"] = find_idx("소관부서", "담당부서", "부서", "발표부서", "발표처")
        cols["date"] = find_idx("등록일", "작성일", "게시일", "등록일시")
        cols["category"] = find_idx("분류")
        cols["gubun"] = find_idx("구분")

        if all(v is None for v in cols.values()):
            return {}
        return cols

    def _parse_link_container(self, container) -> List[PressItem]:
        items: List[PressItem] = []
        # 링크 하나가 보도자료 하나라는 가정하에, 주변 텍스트에서 날짜/부서를 추정
        for a in container.find_all("a", href=True):
            raw_title = a.get_text(" ", strip=True)
            href = (a.get("href") or "").strip()
            if not href or href.startswith("#") or href.lower().startswith("javascript"):
                continue
            # 메뉴/공통 링크 배제: 보도자료 상세로 보이는 href만 허용
            if not DETAIL_HREF_RE.search(href):
                continue
            link = urljoin(BASE, href)

            # 같은 li/부모의 텍스트를 활용
            parent = a.find_parent(["li", "tr", "div"])
            context_text = ""
            if parent:
                context_text = parent.get_text(" ", strip=True)
            else:
                context_text = raw_title

            date_str = self._extract_date([context_text])
            dept = self._extract_writer_dept(parent) or self._extract_dept([context_text])

            # 원문 기준 선별 후, 통과한 것만 제목 정제
            if not self._is_target_topic_raw(raw_title, context_text, dept):
                continue

            title = self._clean_title(raw_title)
            if not title or len(title) < 3:
                continue

            items.append(
                PressItem(
                    source=self.id,
                    sourceName=self.name,
                    title=title,
                    link=link,
                    date=date_str,
                    dept=dept,
                )
            )
        return items

    @staticmethod
    def _clean_title(text: str) -> str:
        """목록 셀에 섞여 들어온 부서/담당자/전화/날짜/요약을 최대한 제거해 실제 제목만 남긴다."""
        if not text:
            return ""
        text = re.sub(r"\s+", " ", text).strip()

        # 날짜가 들어오기 시작하면 뒤는 메타/요약일 가능성이 높다.
        m_date = DATE_RE.search(text)
        if m_date:
            text = text[:m_date.start()].strip()

        # 전화번호가 보이면 뒤를 제거
        m_phone = PHONE_RE.search(text)
        if m_phone:
            text = text[:m_phone.start()].strip()

        # '부서명 | 담당자 | 전화' 형태 메타를 잘라내기 위해 파이프 뒤를 제거
        if "|" in text:
            text = text.split("|", 1)[0].strip()

        # 끝에 붙은 부서명 메타 제거 (예: "... 체결 생활체육과")
        text = re.sub(
            r"\s+[가-힣A-Za-z0-9·]{2,20}(?:과|국|관|팀|단|실|본부|센터|청|처)$",
            "",
            text,
        ).strip()

        # 제목이 따옴표/괄호 앞뒤로만 남더라도 그대로 유지
        return text

    @staticmethod
    def _is_target_topic_raw(raw_title: str, raw_context: str, dept: str) -> bool:
        """정제 전 원문(raw title/context) + 부서명 기준으로 부산시 주제어 선별."""
        if not BUSAN_TOPIC_KEYWORDS:
            return True

        haystack = " ".join(
            [
                raw_title or "",
                raw_context or "",
                dept or "",
            ]
        )
        return any(keyword in haystack for keyword in BUSAN_TOPIC_KEYWORDS)

    # --- 필드 추출 ----------------------------------------------------- #
    @staticmethod
    def _extract_num(cell_texts) -> str:
        for t in cell_texts:
            if NUM_RE.match(t.replace(",", "")):
                return t
        return ""

    @staticmethod
    def _extract_date(texts) -> str:
        for t in texts:
            m = DATE_RE.search(t)
            if m:
                y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
                return f"{y}-{mo}-{d}"
        return ""

    @staticmethod
    def _extract_writer_dept(root) -> str:
        """부산시 목록의 writer 메타에서 첫 번째 strong 값을 담당부서로 사용."""
        if root is None:
            return ""
        writer = root.select_one(".txtL.writer, .writer")
        if writer is None:
            return ""
        strong = writer.find("strong")
        if strong is None:
            return ""
        text = strong.get_text(" ", strip=True).replace("\xa0", " ")
        text = re.sub(r"\s+", " ", text).strip(" |:/：")
        return text if 2 <= len(text) <= 30 else ""

    @staticmethod
    def _extract_dept(texts) -> str:
        # 부산시는 검색키에 '부서명'이 존재하므로 목록에도 부서가 있을 가능성이 높음.
        # 휴리스틱: '과/국/관/팀/단/실/본부/센터/청/처' 로 끝나는 2~30자
        dept_re = re.compile(r"([가-힣A-Za-z0-9·\s]{2,30}?(?:과|국|관|팀|단|실|본부|센터|청|처))$")
        for t in texts:
            for token in re.split(r"\s+", t.strip()):
                token = token.strip("·|/()[]{}:,")
                if len(token) < 2 or len(token) > 30:
                    continue
                m = dept_re.search(token)
                if m:
                    return m.group(1).strip()
        return ""

    @staticmethod
    def _extract_category(cell_texts, dept: str, date_str: str, num: str) -> str:
        # 부산시 보도자료 목록에 '분류'가 있을 수도 있어 첫 번째 짧은 텍스트를 시도
        for t in cell_texts:
            if not t or t in (dept, date_str, num):
                continue
            if NUM_RE.match(t.replace(",", "")):
                continue
            if DATE_RE.search(t):
                continue
            if len(t) > 18:
                continue
            return t
        return ""

