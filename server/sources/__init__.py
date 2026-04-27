"""
보도자료 출처 레지스트리.

새 지자체를 추가하려면:
  1. server/sources/<id>.py 를 만들고 Source 를 상속한 클래스를 작성한다.
  2. 아래 IMPLEMENTED 리스트에 인스턴스를 추가한다.
"""
from typing import Dict, List

from .base import PressItem, Source
from .molit import MolitSource


# 실제로 fetch 가능한 어댑터들 (구현 완료)
IMPLEMENTED: List[Source] = [
    MolitSource(),
]

# 아직 구현 전이지만 UI 에는 비활성 칩으로 보여줄 후보 출처들
PLACEHOLDERS: List[Dict] = [
    {"id": "seoul",   "name": "서울특별시",  "color": "#cc0033", "enabled": False},
    {"id": "busan",   "name": "부산광역시",  "color": "#005bac", "enabled": False},
    {"id": "ulsan",   "name": "울산광역시",  "color": "#1e7e34", "enabled": False},
    {"id": "gwangju", "name": "광주광역시",  "color": "#7c3aed", "enabled": False},
]


REGISTRY: Dict[str, Source] = {s.id: s for s in IMPLEMENTED}


def list_meta() -> List[Dict]:
    """구현 + 플레이스홀더를 합쳐 프론트에 줄 목록."""
    return [s.meta() for s in IMPLEMENTED] + PLACEHOLDERS


__all__ = ["Source", "PressItem", "REGISTRY", "list_meta"]
