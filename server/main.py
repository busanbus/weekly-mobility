"""
보도자료 허브 백엔드 (FastAPI)

- /api/sources         : 출처 목록 (구현 + 플레이스홀더)
- /api/press           : 기간/출처별 보도자료 통합 조회 (실시간 크롤링 + 5분 캐시)
- /api/health          : 헬스체크
- /                    : 워크스페이스 루트 정적 파일 서빙
                         → http://localhost:8000/press-hub.html 로 페이지 접속

같은 origin 으로 정적/HTML 을 함께 서빙하기 때문에 브라우저 CORS 이슈가 없습니다.
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from cachetools import TTLCache
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from sources import REGISTRY, list_meta

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("press-hub")


app = FastAPI(
    title="Press Hub API",
    description="국토교통부/지자체 보도자료 통합 조회 API",
    version="0.1.0",
)

# 동일 origin 으로 서빙되지만, 혹시 다른 dev 서버에서 호출할 경우 대비
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# 5분 TTL 캐시 (key = (from, to, sources tuple))
_cache: TTLCache = TTLCache(maxsize=128, ttl=300)


# ---------------------------------------------------------------------- #
# 유틸
# ---------------------------------------------------------------------- #
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _validate_date(label: str, value: str) -> str:
    if not DATE_RE.match(value):
        raise HTTPException(
            status_code=400,
            detail=f"'{label}' 은 YYYY-MM-DD 형식이어야 합니다. (받은 값: {value})",
        )
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail=f"'{label}' 이 유효한 날짜가 아닙니다.")
    return value


# ---------------------------------------------------------------------- #
# API
# ---------------------------------------------------------------------- #
@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "ts": datetime.now().isoformat(timespec="seconds")}


@app.get("/api/sources")
def get_sources() -> List[Dict]:
    return list_meta()


@app.get("/api/press")
async def get_press(
    from_: str = Query(..., alias="from", description="시작일 YYYY-MM-DD"),
    to: str = Query(..., description="종료일 YYYY-MM-DD"),
    sources: str = Query(..., description="콤마로 구분한 출처 ID 목록 (e.g. 'molit')"),
) -> JSONResponse:
    from_ = _validate_date("from", from_)
    to = _validate_date("to", to)
    if from_ > to:
        raise HTTPException(status_code=400, detail="'from' 이 'to' 보다 이후일 수 없습니다.")

    requested_ids = [s.strip() for s in sources.split(",") if s.strip()]
    if not requested_ids:
        raise HTTPException(status_code=400, detail="최소 1개 이상의 sources 가 필요합니다.")

    # 캐시 조회
    cache_key: Tuple = (from_, to, tuple(sorted(requested_ids)))
    if cache_key in _cache:
        cached = _cache[cache_key]
        log.info(f"cache HIT  {cache_key}  items={len(cached['items'])}")
        return JSONResponse(content=cached)

    # 어댑터 호출 준비
    selected: List[str] = []
    coros = []
    skipped: Dict[str, str] = {}

    for sid in requested_ids:
        adapter = REGISTRY.get(sid)
        if adapter is None:
            skipped[sid] = "지원하지 않는 출처"
            continue
        if not adapter.enabled:
            skipped[sid] = "현재 비활성화된 출처"
            continue
        selected.append(sid)
        coros.append(adapter.fetch(from_, to))

    # 병렬 실행
    log.info(f"fetch {selected}  from={from_} to={to}")
    results = await asyncio.gather(*coros, return_exceptions=True) if coros else []

    items: List[Dict] = []
    stats: Dict[str, Dict] = {}

    for sid, res in zip(selected, results):
        adapter = REGISTRY[sid]
        if isinstance(res, Exception):
            log.warning(f"  [{sid}] FAIL: {res}")
            stats[sid] = {
                "name": adapter.name,
                "ok": False,
                "error": str(res),
                "count": 0,
            }
            continue
        log.info(f"  [{sid}] OK count={len(res)}")
        for item in res:
            items.append(item.model_dump())
        stats[sid] = {
            "name": adapter.name,
            "ok": True,
            "count": len(res),
        }

    for sid, reason in skipped.items():
        stats[sid] = {"name": sid, "ok": False, "error": reason, "count": 0}

    # 최신 날짜 우선 정렬
    items.sort(key=lambda x: (x.get("date") or "", x.get("title") or ""), reverse=True)

    payload = {
        "range": {"from": from_, "to": to},
        "stats": stats,
        "items": items,
        "total": len(items),
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
    }

    # 모든 출처가 정상이고 1건 이상일 때만 캐시 (실패/0건은 다음 호출에서 재시도하도록)
    all_ok = all(s.get("ok") for s in stats.values())
    if all_ok and items:
        _cache[cache_key] = payload
    return JSONResponse(content=payload)


@app.post("/api/cache/clear")
def clear_cache() -> dict:
    n = len(_cache)
    _cache.clear()
    log.info(f"cache cleared (was {n})")
    return {"cleared": n}


@app.get("/api/debug/{source_id}")
async def debug_source(
    source_id: str,
    from_: str = Query(..., alias="from"),
    to: str = Query(...),
    page: int = Query(1, ge=1, le=20),
) -> JSONResponse:
    """특정 출처의 원본 HTML 응답을 그대로 가져온다 (디버깅용).
    각 어댑터에 fetch_raw(from, to, page) 메서드가 있어야 함.
    """
    adapter = REGISTRY.get(source_id)
    if adapter is None or not hasattr(adapter, "fetch_raw"):
        raise HTTPException(status_code=404, detail=f"디버그 미지원: {source_id}")
    from_ = _validate_date("from", from_)
    to = _validate_date("to", to)
    try:
        data = await adapter.fetch_raw(from_, to, page=page)  # type: ignore[attr-defined]
    except Exception as e:  # noqa: BLE001
        log.exception("debug fetch failed")
        return JSONResponse(content={"ok": False, "error": f"{e.__class__.__name__}: {e}"})
    return JSONResponse(content=data)


# ---------------------------------------------------------------------- #
# 정적 파일 서빙
#   server/ 의 부모 디렉터리(weekly-mobility 자체)를 / 로 매핑.
#   → http://localhost:8000/press-hub.html, /index.html, /components/* 모두 동작.
# ---------------------------------------------------------------------- #
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
log.info(f"static root = {WORKSPACE_ROOT}")

app.mount(
    "/",
    StaticFiles(directory=str(WORKSPACE_ROOT), html=True),
    name="static",
)
