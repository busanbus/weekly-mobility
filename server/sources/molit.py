"""
국토교통부 보도자료 어댑터.

대상: https://www.molit.go.kr/USR/NEWS/m_71/lst.jsp
- 게시판 형식의 HTML 을 BeautifulSoup 으로 파싱
- 시작/종료일 파라미터(search_regdate_s, search_regdate_e)로 기간 필터
- psize/lcmspage 로 페이지네이션
- 정확한 셀렉터를 모르므로 '가장 행이 많은 table'을 게시판으로 간주하는 휴리스틱 사용
  (사이트 구조가 살짝 바뀌어도 잘 깨지지 않도록)

한국 정부 사이트 특성:
- TLS 인증서 체인이 비표준일 때가 종종 있어 verify=False 로 설정.
  (사내망/공공망 환경에서의 SSL 핸드쉐이크 실패 회피)
"""
from __future__ import annotations

import asyncio
import gzip
import io
import logging
import re
import ssl
import urllib.error
import urllib.request
from typing import List, Optional, Tuple
from urllib.parse import urlencode, urljoin

import httpx
from bs4 import BeautifulSoup

from .base import PressItem, Source


log = logging.getLogger("press-hub.molit")


BASE = "https://www.molit.go.kr"
LIST_URL = f"{BASE}/USR/NEWS/m_71/lst.jsp"
DETAIL_PATH = "/USR/NEWS/m_71/dtl.jsp"

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


def _make_ssl_context() -> ssl.SSLContext:
    """한국 정부 사이트와의 호환성을 위한 느슨한 SSL 컨텍스트.
    - 인증서 검증 비활성화 (자체서명/체인 누락 회피)
    - TLS 1.0 까지 허용 (Python 3.13 기본은 TLS 1.2+, 일부 정부 사이트는 1.0/1.1)
    - 구형 cipher 허용 (SECLEVEL=0)
    """
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

DATE_RE = re.compile(r"(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})")
NUM_RE = re.compile(r"^\d{1,8}$")
ID_IN_ONCLICK_RE = re.compile(r"['\"](\d{6,})['\"]")


class MolitSource(Source):
    id = "molit"
    name = "국토교통부"
    color = "#1e6dcb"
    enabled = True

    # 한 페이지당 행 수, 최대 페이지 수
    PAGE_SIZE = 50
    MAX_PAGES = 10

    # 담당부서 추출용 상세페이지 동시 fetch 한도
    DETAIL_CONCURRENCY = 6
    DETAIL_TIMEOUT = 12.0

    @staticmethod
    def _build_params(from_date: str, to_date: str, page: int, psize: int) -> dict:
        return {
            "search_section": "",
            "search": "",
            "search_gubun": "1",
            "search_gubun1": "all",
            "srch_usr_titl": "Y",
            "srch_usr_ctnt": "",
            "psize": str(psize),
            "search_regdate_s": from_date,
            "search_regdate_e": to_date,
            "lst_gbn": "T",
            "lcmspage": str(page),
        }

    @staticmethod
    def _format_error(e: Exception) -> str:
        """httpx 예외는 str() 이 비어있는 경우가 많아 클래스명까지 함께."""
        cls = e.__class__.__name__
        msg = str(e) or repr(e)
        # HTTP status error 면 코드까지
        if isinstance(e, httpx.HTTPStatusError):
            try:
                return f"{cls} {e.response.status_code} ({e.request.url})"
            except Exception:
                pass
        return f"{cls}: {msg}" if msg and msg != cls else cls

    def _new_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            timeout=20.0,
            follow_redirects=True,
            headers=DEFAULT_HEADERS,
            verify=_make_ssl_context(),
            http2=False,
        )

    @staticmethod
    def _urllib_fetch(url: str, params: dict, timeout: float = 20.0) -> Tuple[int, str, str]:
        """httpx 가 TLS 핸드셰이크에서 실패할 때 쓰는 stdlib 폴백.
        Python 3.13 의 까다로운 기본값을 우회하기 위해 별도 SSL 컨텍스트 사용.
        반환: (status_code, response_text, used_url)
        """
        full_url = f"{url}?{urlencode(params)}"
        req = urllib.request.Request(full_url, headers={**DEFAULT_HEADERS, "Accept-Encoding": "gzip"})
        ctx = _make_ssl_context()
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:  # type: ignore[arg-type]
            raw = resp.read()
            # gzip 응답이면 디코딩
            if resp.headers.get("Content-Encoding", "").lower() == "gzip":
                raw = gzip.decompress(raw)
            # 인코딩 추출
            charset = resp.headers.get_content_charset() or "utf-8"
            try:
                text = raw.decode(charset, errors="replace")
            except LookupError:
                text = raw.decode("utf-8", errors="replace")
            return resp.status, text, full_url

    async def _fetch_one(
        self,
        client: httpx.AsyncClient,
        from_date: str,
        to_date: str,
        page: int,
    ) -> Tuple[str, int, str]:
        """한 페이지의 (used_url, status, html) 을 반환. 실패 시 예외."""
        params = self._build_params(from_date, to_date, page, self.PAGE_SIZE)

        # 1차: httpx
        try:
            r = await client.get(LIST_URL, params=params)
            r.raise_for_status()
            if not r.encoding or r.encoding.lower() in ("iso-8859-1", "ascii"):
                r.encoding = "utf-8"
            return str(r.url), r.status_code, r.text
        except Exception as primary:  # noqa: BLE001
            log.warning(
                "[molit] httpx 실패 → urllib 폴백 시도: %s",
                self._format_error(primary),
            )

        # 2차: urllib (TLS 호환성 더 관대)
        try:
            status, text, used_url = await asyncio.to_thread(
                self._urllib_fetch, LIST_URL, params, 20.0
            )
            return used_url, status, text
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"urllib 폴백도 HTTP {e.code}") from e
        except Exception as fallback:  # noqa: BLE001
            raise RuntimeError(
                f"urllib 폴백도 실패: {self._format_error(fallback)}"
            ) from fallback

    async def fetch(self, from_date: str, to_date: str) -> List[PressItem]:
        items: List[PressItem] = []
        seen: set[str] = set()

        async with self._new_client() as client:
            for page in range(1, self.MAX_PAGES + 1):
                try:
                    used_url, status, html = await self._fetch_one(
                        client, from_date, to_date, page
                    )
                except Exception as e:  # noqa: BLE001
                    log.exception("[molit] page=%s 요청 실패", page)
                    if page == 1:
                        raise RuntimeError(
                            f"국토부 목록 조회 실패: {self._format_error(e)}"
                        ) from e
                    break

                page_items = self._parse(html)
                log.info(
                    "[molit] page=%s status=%s html=%d bytes parsed=%d items",
                    page, status, len(html), len(page_items),
                )

                # 서버측 기간 필터가 무시될 가능성 대비, 한 번 더 거름
                page_items = [
                    it for it in page_items
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

                # 새로 추가된 게 거의 없거나, 한 페이지 표시한도가 안 차면 종료
                if added == 0 or len(page_items) < max(5, self.PAGE_SIZE // 2):
                    break

                # 정부 사이트 부담 방지
                await asyncio.sleep(0.2)

            # 담당부서는 리스트 페이지에 안 보이는 경우가 많아, 상세페이지를 동시 fetch.
            await self._enrich_dept(client, items)

        return items

    # ------------------------------------------------------------------ #
    # 담당부서 enrichment (상세페이지 동시 조회)
    # ------------------------------------------------------------------ #
    async def _enrich_dept(self, client: httpx.AsyncClient, items: List[PressItem]) -> None:
        targets = [it for it in items if not it.dept and it.link]
        if not targets:
            return

        sem = asyncio.Semaphore(self.DETAIL_CONCURRENCY)

        async def worker(item: PressItem) -> None:
            async with sem:
                try:
                    html = await self._get_detail_html(client, item.link)
                except Exception as e:  # noqa: BLE001
                    log.debug("[molit] detail 실패 %s: %s", item.link, self._format_error(e))
                    return
                dept = self._extract_dept_from_detail(html)
                if dept:
                    item.dept = dept

        log.info("[molit] enrich dept: %d 건 상세페이지 조회 (동시 %d)",
                 len(targets), self.DETAIL_CONCURRENCY)
        await asyncio.gather(*(worker(it) for it in targets), return_exceptions=True)

        ok = sum(1 for it in targets if it.dept)
        log.info("[molit] enrich dept 완료: %d/%d 건 추출 성공", ok, len(targets))

    async def _get_detail_html(self, client: httpx.AsyncClient, url: str) -> str:
        """상세페이지 HTML. httpx → urllib 폴백."""
        try:
            r = await client.get(url, timeout=self.DETAIL_TIMEOUT)
            r.raise_for_status()
            if not r.encoding or r.encoding.lower() in ("iso-8859-1", "ascii"):
                r.encoding = "utf-8"
            return r.text
        except Exception:
            # urllib 폴백
            return await asyncio.to_thread(self._urllib_fetch_url, url, self.DETAIL_TIMEOUT)

    @staticmethod
    def _urllib_fetch_url(url: str, timeout: float = 12.0) -> str:
        req = urllib.request.Request(url, headers={**DEFAULT_HEADERS, "Accept-Encoding": "gzip"})
        ctx = _make_ssl_context()
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:  # type: ignore[arg-type]
            raw = resp.read()
            if resp.headers.get("Content-Encoding", "").lower() == "gzip":
                raw = gzip.decompress(raw)
            charset = resp.headers.get_content_charset() or "utf-8"
            try:
                return raw.decode(charset, errors="replace")
            except LookupError:
                return raw.decode("utf-8", errors="replace")

    # 담당부서 라벨 후보. (사이트 마이너 변경 대비)
    _DEPT_LABEL_RE = re.compile(r"담당\s*부서|담당과|담당팀|작성부서|등록부서")

    @classmethod
    def _extract_dept_from_detail(cls, html: str) -> str:
        """상세페이지 HTML 에서 '담당부서: XXX과' 패턴을 추출."""
        soup = BeautifulSoup(html, "lxml")

        # 1) <th>담당부서</th><td>XXX과</td> / <dt>담당부서</dt><dd>XXX과</dd>
        for label in soup.find_all(string=cls._DEPT_LABEL_RE):
            parent = label.parent
            if parent is None:
                continue
            # th → 같은 row 의 td
            if parent.name in ("th",):
                td = parent.find_next_sibling("td")
                if td:
                    text = cls._clean_dept_text(td.get_text(" ", strip=True))
                    if text:
                        return text
            # dt → dd
            if parent.name == "dt":
                dd = parent.find_next_sibling("dd")
                if dd:
                    text = cls._clean_dept_text(dd.get_text(" ", strip=True))
                    if text:
                        return text
            # span/strong/label/p 등 인라인: 같은 부모 안의 다음 텍스트 노드
            sibling_text = ""
            for sib in parent.next_siblings:
                if hasattr(sib, "get_text"):
                    sibling_text = sib.get_text(" ", strip=True)
                else:
                    sibling_text = str(sib).strip()
                if sibling_text:
                    break
            text = cls._clean_dept_text(sibling_text)
            if text and cls._DEPT_SUFFIX_RE.search(text):
                return text

        # 2) 최후 수단: 본문 텍스트에서 "담당부서 자동차정책과" 같은 패턴 정규식
        body_text = soup.get_text(" ", strip=True)
        m = re.search(
            r"담당\s*부서\s*[:：]?\s*([가-힣A-Za-z0-9·\s]{2,30}?(?:과|국|관|팀|단|실|처|청|원|센터|위원회|지원단|본부|부))",
            body_text,
        )
        if m:
            return cls._clean_dept_text(m.group(1))

        return ""

    @staticmethod
    def _clean_dept_text(text: str) -> str:
        """'자동차정책과 (전화: 044-...)' 같은 부가정보 제거."""
        if not text:
            return ""
        text = text.strip()
        # 괄호 / 전화 / 이메일 / 콜론 이후 잘라내기
        for sep in ("(", "（", "/", "·", "전화", "tel", "TEL", "Tel", ":", "："):
            idx = text.find(sep)
            if idx > 0:
                text = text[:idx].strip()
        # 너무 길면 첫 명사구 추정
        if len(text) > 30:
            words = text.split()
            text = words[0] if words else text[:30]
        return text.strip()

    # ------------------------------------------------------------------ #
    # 디버그: 원본 HTML 가져오기
    # ------------------------------------------------------------------ #
    async def fetch_raw(self, from_date: str, to_date: str, page: int = 1) -> dict:
        """디버깅용: 두 경로(httpx, urllib) 응답을 모두 보여준다."""
        params = self._build_params(from_date, to_date, page, self.PAGE_SIZE)
        out: dict = {"params": params}

        # 1) httpx
        try:
            async with self._new_client() as client:
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
            out["httpx"] = {"ok": False, "error": self._format_error(e)}

        # 2) urllib 폴백
        try:
            status, text, used_url = await asyncio.to_thread(
                self._urllib_fetch, LIST_URL, params, 20.0
            )
            out["urllib"] = {
                "ok": 200 <= status < 400,
                "status": status,
                "url": used_url,
                "html_length": len(text),
                "html_head": text[:4000],
                "table_count": text.count("<table"),
                "tbody_tr_count": text.count("<tr"),
            }
        except Exception as e:  # noqa: BLE001
            out["urllib"] = {"ok": False, "error": self._format_error(e)}

        out["ok"] = bool(
            (out.get("httpx", {}).get("ok"))
            or (out.get("urllib", {}).get("ok"))
        )
        return out

    # ------------------------------------------------------------------ #
    # 파싱
    # ------------------------------------------------------------------ #
    def _parse(self, html: str) -> List[PressItem]:
        soup = BeautifulSoup(html, "lxml")

        table = self._find_board_table(soup)
        if table is None:
            return []

        rows = table.select("tbody tr") or table.find_all("tr")
        items: List[PressItem] = []

        for tr in rows:
            tds = tr.find_all("td")
            if len(tds) < 2:
                continue

            link_el = tr.find("a")
            if not link_el:
                continue

            title = link_el.get_text(strip=True)
            if not title:
                continue

            link = self._resolve_link(link_el)
            cell_texts = [td.get_text(" ", strip=True) for td in tds]
            link_td_idx = self._index_of_link_cell(tds)

            num = self._extract_num(cell_texts, link_td_idx)
            category = self._extract_category(cell_texts, link_td_idx, num)
            date_str = self._extract_date(cell_texts)
            views = self._extract_views(cell_texts, num)
            has_attach = self._has_attachment(tr)
            dept = self._extract_dept(cell_texts, link_td_idx, exclude={category})

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
                    attachment=has_attach,
                    views=views,
                )
            )

        return items

    # --- 휴리스틱 헬퍼들 -------------------------------------------------- #

    @staticmethod
    def _find_board_table(soup: BeautifulSoup):
        """tbody 행 수가 가장 많은 table 을 게시판 테이블로 간주."""
        best = None
        best_count = 0
        for table in soup.find_all("table"):
            rows = table.select("tbody tr") or table.find_all("tr")
            if len(rows) > best_count:
                best = table
                best_count = len(rows)
        # 본문 표가 너무 작으면 게시판이 아님
        if best is not None and best_count >= 3:
            return best
        return None

    @staticmethod
    def _index_of_link_cell(tds) -> int:
        for i, td in enumerate(tds):
            if td.find("a"):
                return i
        return -1

    def _resolve_link(self, link_el) -> str:
        href = (link_el.get("href") or "").strip()
        onclick = (link_el.get("onclick") or "").strip()

        # 1) onclick("123456") 형태면 ID 추출 → 상세페이지 URL 생성
        if (not href) or href.startswith("#") or href.lower().startswith("javascript"):
            m = ID_IN_ONCLICK_RE.search(onclick)
            if m:
                return f"{BASE}{DETAIL_PATH}?id={m.group(1)}&mode=view"
            return LIST_URL

        # 2) 절대 URL
        if href.startswith("http"):
            return href

        # 3) 쿼리스트링만(?id=...) 인 경우: lst.jsp 같은 목록경로가 아닌 dtl.jsp 로 보정.
        #    JSP 게시판은 같은 디렉터리의 dtl.jsp 가 detail 인 경우가 많음.
        if href.startswith("?"):
            return f"{BASE}{DETAIL_PATH}{href}"

        return urljoin(BASE + DETAIL_PATH, href)

    @staticmethod
    def _extract_num(cell_texts, link_td_idx) -> str:
        for i, t in enumerate(cell_texts):
            if i == link_td_idx:
                continue
            if NUM_RE.match(t.replace(",", "")):
                return t
        return ""

    @staticmethod
    def _extract_category(cell_texts, link_td_idx, num) -> str:
        for i, t in enumerate(cell_texts):
            if i == link_td_idx or not t or t == num:
                continue
            if len(t) > 14:
                continue
            if NUM_RE.match(t.replace(",", "")):
                continue
            if DATE_RE.search(t):
                continue
            return t
        return ""

    @staticmethod
    def _extract_date(cell_texts) -> str:
        for t in cell_texts:
            m = DATE_RE.search(t)
            if m:
                y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
                return f"{y}-{mo}-{d}"
        return ""

    @staticmethod
    def _extract_views(cell_texts, num) -> str:
        # 마지막 숫자 셀을 조회수로 추정 (번호와 같으면 제외)
        for t in reversed(cell_texts):
            clean = t.replace(",", "")
            if NUM_RE.match(clean) and t != num:
                return t
        return ""

    @staticmethod
    def _has_attachment(tr) -> bool:
        if tr.find("img", alt=re.compile(r"첨부|파일|file|attach", re.I)):
            return True
        if tr.find("img", src=re.compile(r"file|attach|clip|paperclip", re.I)):
            return True
        if tr.find(class_=re.compile(r"file|attach|clip", re.I)):
            return True
        if tr.find("a", href=re.compile(r"download|file|attach", re.I)):
            return True
        return False

    # 담당부서 이름의 전형적인 접미사 (ex. 자동차정책과, 광역교통정책국, 항공안전정책관…)
    _DEPT_SUFFIX_RE = re.compile(
        r"(과|국|관|팀|단|실|처|청|원|센터|위원회|지원단|본부|부)$"
    )

    @classmethod
    def _extract_dept(cls, cell_texts, link_td_idx, exclude=None) -> str:
        """리스트 행 셀들 중 부서명 패턴(끝이 과/국/관/팀 등)인 짧은 텍스트를 찾는다.
        exclude 에 든 텍스트(예: 이미 분류로 잡힌 값)는 제외.
        """
        exclude = set(exclude or ())
        for i, t in enumerate(cell_texts):
            if i == link_td_idx or not t or t in exclude:
                continue
            if len(t) > 18 or len(t) < 2:
                continue
            if NUM_RE.match(t.replace(",", "")):
                continue
            if DATE_RE.search(t):
                continue
            if cls._DEPT_SUFFIX_RE.search(t):
                return t
        return ""
