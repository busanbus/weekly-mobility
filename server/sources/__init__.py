"""
보도자료 출처 레지스트리.

새 지자체를 추가하려면:
  1. server/sources/<id>.py 를 만들고 Source 를 상속한 클래스를 작성한다.
  2. 아래 IMPLEMENTED 리스트에 인스턴스를 추가한다.
"""
from typing import Dict, List

from .base import PressItem, Source
from .busan import BusanSource
from .daegu import DaeguSource
from .daejeon import DaejeonSource
from .gwangju import GwangjuSource
from .incheon import IncheonSource
from .jeju import JejuSource
from .molit import MolitSource
from .seoul import SeoulSource
from .sejong import SejongSource
from .ulsan import UlsanSource


# 실제로 fetch 가능한 어댑터들 (구현 완료)
IMPLEMENTED: List[Source] = [
    MolitSource(),
    BusanSource(),
    SeoulSource(),
    IncheonSource(),
    GwangjuSource(),
    UlsanSource(),
    DaeguSource(),
    DaejeonSource(),
    SejongSource(),
    JejuSource(),
]

# 아직 구현 전이지만 UI 에는 비활성 칩으로 보여줄 후보 출처들
PLACEHOLDERS: List[Dict] = []


REGISTRY: Dict[str, Source] = {s.id: s for s in IMPLEMENTED}


def list_meta() -> List[Dict]:
    """구현 + 플레이스홀더를 합쳐 프론트에 줄 목록."""
    return [s.meta() for s in IMPLEMENTED] + PLACEHOLDERS


__all__ = ["Source", "PressItem", "REGISTRY", "list_meta"]
