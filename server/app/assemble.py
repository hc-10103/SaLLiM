"""답변 조립 — 템플릿만. 배출법은 data/의 문장 그대로, LLM이 지어내지 않는다."""
import re
from .schemas import (WEEKDAYS, AskResponse, FollowUp, Item, ItemState, RegionData,
                      Source, WasteAreaDetail)

CONFIDENCE_MIN = 0.6
RETRY_MSG = "다시 찍거나 이름으로 물어봐 주세요."
RECYCLING_CATEGORIES = {
    "투명페트", "플라스틱", "종이", "종이팩", "캔·고철", "유리병", "비닐", "스티로폼",
}

FOLLOW_UP_QUESTIONS = {
    "has_label": "라벨이나 스티커가 아직 붙어 있나요?",
    "has_contents": "안에 내용물이 남아 있나요?",
    "is_dirty": "음식물이나 기름이 묻어 있나요?",
    "is_coated": "비닐이나 은박으로 코팅된 종이인가요?",
}

DROP_OFF_TYPES = {
    "milk_carton": "종이팩", "aseptic_carton": "종이팩",
    "battery": "폐건전지·폐형광등", "fluorescent_lamp": "폐건전지·폐형광등",
    "cooking_oil": "폐식용유", "medicine_waste": "폐의약품",
    "clothing": "의류·신발·가방", "small_appliance": "폐가전 무상방문수거",
    "large_appliance": "폐가전 무상방문수거",
    "furniture_large": "대형폐기물", "duvet_blanket": "대형폐기물",
}


def _batchim(word: str) -> int:
    """마지막 글자 받침 번호 (0=없음). 한글이 아니면 0으로 본다."""
    hangul = re.findall(r"[가-힣]", word)
    c = hangul[-1] if hangul else " "
    return (ord(c) - 0xAC00) % 28 if "가" <= c <= "힣" else 0


def eun(word: str) -> str:
    return word + ("은" if _batchim(word) else "는")


def euro(word: str) -> str:
    return word + ("으로" if _batchim(word) not in (0, 8) else "로")  # 8 = ㄹ받침


def unknown_response() -> AskResponse:
    return AskResponse(
        item_key=None, item_name=None, category=None,
        answer="물건 이름, 재질, 오염 상태를 더 자세히 알려주세요.",
        steps=[], next_days=[], time=None, confident=False, follow_up=None, sources=[],
    )


def _dedupe(sources: list[Source]) -> list[Source]:
    seen, out = set(), []
    for s in sources:
        if s.url not in seen:
            seen.add(s.url)
            out.append(s)
    return out


def next_days(region: RegionData, category: str) -> list[str]:
    return [d for d in WEEKDAYS if category in region.week.get(d, [])]


def _area_schedule(area: WasteAreaDetail, category: str) -> tuple[list[str], str | None]:
    if category == "일반쓰레기":
        raw_days, start, end = area.general_days, area.general_start, area.general_end
    elif category == "음식물":
        raw_days, start, end = area.food_days, area.food_start, area.food_end
    elif category in RECYCLING_CATEGORIES:
        raw_days, start, end = area.recycling_days, area.recycling_start, area.recycling_end
    else:
        return [], None
    parts = [p.strip() for p in raw_days.split("+") if p.strip()]
    days = [d for d in WEEKDAYS if d in parts] if parts and all(p in WEEKDAYS for p in parts) else []
    time = f"{start}~{end}" if (start and end) else (start or end or None)
    return days, time


def assemble(item_key: str, item: Item, region: RegionData,
             state: ItemState | None = None, confidence: float = 1.0,
             area: WasteAreaDetail | None = None) -> AskResponse:
    state = state or ItemState()
    confident = confidence >= CONFIDENCE_MIN
    steps = list(item.steps)

    # 상태가 True인 조건만 안내에 붙인다. 모르는(None) 조건은 하나 되묻는다.
    notes = [text for key, text in item.conditions.items() if getattr(state, key) is True]
    unknown = [key for key in item.conditions if getattr(state, key) is None]
    follow_up = (FollowUp(key=unknown[0], question=FOLLOW_UP_QUESTIONS[unknown[0]])
                 if confident and unknown else None)

    override = region.overrides.get(item_key)
    days = next_days(region, item.category)
    sched_time = region.time
    sched_name = region.name
    sched_note = region.note
    extra_sources = list(region.sources)

    if not days and area is not None:
        area_days, area_time = _area_schedule(area, item.category)
        if area_days:
            days = area_days
            sched_time = area_time
            sched_name = f"{area.city} {area.district}"
            sched_note = "행정안전부 등록 배출일정 기준이에요. 공동주택·공휴일에는 실제 배출 일정이 다를 수 있어요."
            extra_sources.insert(0, Source(
                title=f"행정안전부 생활쓰레기배출정보 ({area.city} {area.district})",
                url=area.source_url,
                updated=area.data_date or area.downloaded_on,
            ))

    if override:
        answer = f"{item.name}: {region.name}에서는 {override}"
        steps.insert(0, override)
    else:
        answer = f"{eun(item.name)} {euro(item.category)} 버려요."
        if days:
            answer += f" {eun(sched_name)} {'·'.join(days)}요일" + (f" {sched_time}" if sched_time else "") + "에 내놓아요."
    if notes:
        # 질문에 드러난 오염·라벨 상태를 일반 배출법보다 먼저 보여준다.
        if item_key == "plastic_container" and state.is_dirty is True:
            answer = (f"{eun(item.name)} 먼저 음식물과 국물을 비우고 기름기를 씻어 보세요. "
                      f"{item.conditions['is_dirty']} "
                      f"깨끗이 씻겼다면 {euro(item.category)} 배출해요.")
        elif state.is_dirty is True and "일반쓰레기" in item.conditions.get("is_dirty", ""):
            # '기름 묻은 페트병'처럼 오염을 말하면 기본 배출법보다 오염 기준을 결론으로 둔다.
            others = [n for n in notes if n != item.conditions["is_dirty"]]
            answer = " ".join([f"오염된 {item.name}이라면, {item.conditions['is_dirty']}",
                               f"물로 헹궈서 깨끗해지면 {euro(item.category)} 배출해요.", *others])
        else:
            answer = " ".join(notes) + " " + answer
    if not confident:
        answer = f"아마 {item.name} 같아요. 확실하지 않으니 {RETRY_MSG}"
        # 추정한 품목의 배출법을 확정된 안내처럼 노출하지 않는다.
        return AskResponse(
            item_key=item_key, item_name=item.name, category=None,
            answer=answer, steps=[], next_days=[], time=None,
            confident=False, confidence=round(confidence, 2), follow_up=None, sources=[], note=None,
        )

    if (item_key != "plastic_container" and state.is_dirty is True
            and "일반쓰레기" in item.conditions.get("is_dirty", "")):
        steps = ["물로 헹궈 보고, 기름·이물질이 지워지지 않으면 일반쓰레기(종량제 봉투)로 배출하기",
                 *[f"깨끗해졌다면: {step}" if i == 0 else step for i, step in enumerate(steps)]]
        notes = [n for n in notes if n != item.conditions["is_dirty"]]
    if item_key == "plastic_container" and state.is_dirty is True:
        steps[-1] = ("깨끗이 씻긴 용기는 플라스틱류로, 기름·양념이 지워지지 않는 용기는 "
                     "일반쓰레기(종량제 봉투)로 배출하기")
        notes = []  # 조건은 결론과 마지막 단계에 이미 반영했다.

    return AskResponse(
        item_key=item_key, item_name=item.name, category=item.category,
        answer=answer, steps=steps + notes, next_days=days,
        time=sched_time if days else None,
        confident=confident, confidence=round(confidence, 2), follow_up=follow_up,
        sources=_dedupe([*item.sources, *extra_sources]),
        note=sched_note,
        drop_off_points=[point for point in region.drop_off_points
                         if point.type == DROP_OFF_TYPES.get(item_key)],
        answered_state=state,
    )
