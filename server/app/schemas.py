"""API + 데이터 스키마. shared/api-types.ts와 같은 모양."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Category = Literal[
    "투명페트", "플라스틱", "종이", "종이팩", "캔·고철", "유리병",
    "비닐", "스티로폼", "일반쓰레기", "음식물", "전용수거", "대형폐기물",
]
StateKey = Literal["has_label", "has_contents", "is_dirty", "is_coated"]
WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]


class Source(BaseModel):
    title: str = Field(min_length=1)
    url: str = Field(min_length=1)
    updated: str


class Region(BaseModel):
    id: str
    name: str


class ItemSummary(BaseModel):
    key: str
    name: str
    category: Category
    aliases: list[str]


class ItemState(BaseModel):
    model_config = ConfigDict(extra="forbid")
    has_label: bool | None = None
    has_contents: bool | None = None
    is_dirty: bool | None = None
    is_coated: bool | None = None


class AskRequest(BaseModel):
    region_id: str
    area_id: str | None = None
    question: str | None = None
    image_base64: str | None = None

    @model_validator(mode="after")
    def _need_input(self):
        if not (self.question and self.question.strip()) and not self.image_base64:
            raise ValueError("question 또는 image_base64 중 하나는 필요합니다")
        return self


class AssistRequest(AskRequest):
    question: str | None = Field(default=None, max_length=500)
    purpose: Literal["recycling"] | None = None  # 사용자가 분리배출 전용 흐름을 선택한 경우


class TipAdvice(BaseModel):
    category: Literal["자취", "생활"]
    title: str = Field(min_length=1, max_length=80)
    answer: str = Field(min_length=1, max_length=600)
    steps: list[str] = Field(default_factory=list, max_length=6)
    caution: str | None = Field(default=None, max_length=300)


class WebSource(BaseModel):
    title: str = Field(min_length=1)
    url: str = Field(pattern=r"^https://")


class WebAdvice(BaseModel):
    item_name: str = Field(min_length=1, max_length=80)
    answer: str = Field(min_length=1, max_length=600)
    steps: list[str] = Field(min_length=1, max_length=5)
    sources: list[WebSource] = Field(default_factory=list, max_length=5)  # 비어 있으면 AI 추정 안내
    searched_on: str
    note: str = "웹에서 찾은 일반 안내예요. 배출 요일·장소는 거주지 지자체나 공동주택 안내를 확인하세요."


class FollowUpRequest(BaseModel):
    region_id: str
    area_id: str | None = None
    item_key: str
    state: ItemState


class FollowUp(BaseModel):
    key: StateKey
    question: str


class AskResponse(BaseModel):
    item_key: str | None
    item_name: str | None
    category: Category | None
    answer: str
    steps: list[str]
    next_days: list[str]
    time: str | None
    schedule_pending: bool = False  # 세척 결과에 따라 배출 방식이 달라 아직 요일을 정할 수 없음
    confident: bool
    confidence: float | None = None  # 0~1, 사진 인식 확신도 (확신 낮음 화면에 % 표시)
    follow_up: FollowUp | None
    sources: list[Source]
    note: str | None = None  # 동네 데이터의 예외 안내 (아파트별 요일 차이 등)
    drop_off_points: list["DropOffPoint"] = Field(default_factory=list)
    answered_state: ItemState = Field(default_factory=ItemState)


class AssistResponse(BaseModel):
    kind: Literal["recycling", "tip", "web", "unknown"]
    recycling: AskResponse | None = None
    recycling_list: list[AskResponse] | None = None
    tip: TipAdvice | None = None
    web: WebAdvice | None = None
    message: str | None = None


class ScheduleResponse(BaseModel):
    region_id: str
    today: str
    today_categories: list[str]
    week: dict[str, list[str]]
    time: str | None
    sources: list[Source]
    note: str | None = None


class WasteAreaSummary(BaseModel):
    id: str
    city: str
    district: str
    zone: str
    target: str
    data_date: str


class WasteAreaSearch(BaseModel):
    items: list[WasteAreaSummary]
    total: int
    downloaded_on: str


class WasteAreaDetail(WasteAreaSummary):
    place_type: str
    place: str
    general_method: str
    food_method: str
    recycling_method: str
    general_days: str
    food_days: str
    recycling_days: str
    general_start: str
    general_end: str
    food_start: str
    food_end: str
    recycling_start: str
    recycling_end: str
    no_collection_days: str
    department: str
    phone: str
    source_url: str
    downloaded_on: str


# ---- 데이터 파일 스키마 (data/) ----

class Item(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1)
    aliases: list[str] = []
    category: Category
    visual_hint: str = ""
    steps: list[str]
    conditions: dict[StateKey, str] = {}
    sources: list[Source] = Field(min_length=1)  # 출처 없는 항목 금지
    note: str | None = None


class DropOffPoint(BaseModel):
    type: str
    where: str
    url: str | None = None


class RegionData(BaseModel):
    id: str
    name: str
    week: dict[Literal["월", "화", "수", "목", "금", "토", "일"], list[Category]] = {}
    time: str | None = None
    overrides: dict[str, str] = {}
    drop_off_points: list[DropOffPoint] = []
    sources: list[Source] = Field(min_length=1)
    note: str | None = None
