"""
보도자료 출처 어댑터의 공통 베이스.

각 지자체/부처별 어댑터는 Source 를 상속해
- id, name, color, enabled 메타데이터
- async fetch(from_date, to_date) -> list[PressItem]

만 구현하면 자동으로 /api/sources, /api/press 에 등록됩니다.
"""
from abc import ABC, abstractmethod
from typing import List, Optional

from pydantic import BaseModel, Field


class PressItem(BaseModel):
    """프론트 표 한 행에 대응하는 정규화된 보도자료 1건."""

    source: str = Field(..., description="출처 ID (e.g. 'molit')")
    sourceName: str = Field(..., description="출처 이름 (e.g. '국토교통부')")
    num: str = Field("", description="원 게시판의 번호 (있으면)")
    category: str = Field("", description="원 게시판의 분류/구분 (있으면)")
    title: str = Field(..., description="제목")
    link: str = Field("", description="원본 보도자료 상세 URL (절대경로)")
    date: str = Field("", description="작성일 YYYY-MM-DD")
    dept: str = Field("", description="담당부서 (e.g. '자동차정책과')")
    attachment: bool = Field(False, description="첨부파일 존재 여부 (UI에서는 미표시)")
    views: str = Field("", description="조회수 (UI에서는 미표시)")


class Source(ABC):
    """모든 출처 어댑터의 베이스."""

    id: str = ""
    name: str = ""
    color: str = "#0066ff"
    enabled: bool = True

    @abstractmethod
    async def fetch(self, from_date: str, to_date: str) -> List[PressItem]:
        """
        from_date, to_date 는 'YYYY-MM-DD' 문자열.
        해당 기간의 보도자료 목록을 반환.
        """
        raise NotImplementedError

    def meta(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "enabled": self.enabled,
        }
