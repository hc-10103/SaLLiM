"""VLM 프로바이더 인터페이스. VLM은 '뭔지'만 고른다 — 배출법은 data/가 답한다."""
import json
import re
from dataclasses import dataclass, field
from typing import Literal

from pydantic import ValidationError

from ..schemas import Item, ItemState, TipAdvice, WebAdvice

TipTopic = Literal["recycling", "food", "home_cleaning", "laundry", "other"]


@dataclass
class Classification:
    item_key: str | None          # items의 key 중 하나, 모르면 None
    confidence: float = 0.0       # 0~1
    state: ItemState = field(default_factory=ItemState)  # 판단 못 한 상태는 None
    mixed: bool = False           # 봉투·더미에 여러 쓰레기가 섞임 → 품목 하나로 답하지 않는다


@dataclass
class AssistDecision:
    kind: str
    classification: Classification | None = None
    tip: TipAdvice | None = None


class VisionProvider:
    name = "base"

    def classify(self, image: bytes, items: dict[str, Item]) -> Classification:
        raise NotImplementedError

    def match_text(self, question: str, items: dict[str, Item]) -> Classification:
        raise NotImplementedError

    def assist(self, question: str | None, image: bytes | None,
               items: dict[str, Item]) -> AssistDecision:
        raise NotImplementedError

    def classify_intent(self, question: str | None, image: bytes | None) -> TipTopic | None:
        return None

    def assist_with_intent(self, question: str | None, image: bytes | None,
                           items: dict[str, Item], intent: TipTopic | None) -> AssistDecision:
        return self.assist(question, image, items)

    def search_recycling(self, question: str | None, image: bytes | None,
                         region_name: str) -> WebAdvice | None:
        return None


def build_intent_prompt(question: str | None) -> str:
    return (
        "사용자 질문과 사진의 실제 목적을 분류하세요. 단어 하나('씻다', '세척', '버리다')만으로 판단하지 말고 "
        "대상과 사용자의 의도를 함께 보세요. 식재료를 씻거나 조리·섭취하는 법은 food, "
        "집안 표면·가구·욕실을 청소하는 법은 home_cleaning, 옷·빨래는 laundry, "
        "물건을 버리거나 분리배출하는 법은 recycling, 나머지는 other입니다. "
        "설명 없이 JSON 하나만 답하세요: "
        '{"intent":"recycling|food|home_cleaning|laundry|other"}. '
        f"사용자 질문: {question or '사진의 상황을 알려줘'}"
    )


def parse_intent_response(text: str) -> TipTopic | None:
    try:
        intent = json.loads(text).get("intent")
    except (ValueError, AttributeError, TypeError):
        return None
    return intent if intent in ("recycling", "food", "home_cleaning", "laundry", "other") else None


def build_assist_prompt(items: dict[str, Item], question: str | None,
                        intent: TipTopic | None = None) -> str:
    names = "\n".join(f"{key}: {item.name}" for key, item in items.items())
    context = {
        "food": "질문 의도는 식재료 세척·조리·섭취입니다. kind=tip으로 답하세요. 집안 청소 제품 사용법으로 답하지 마세요. 식재료에 가정용 세정제나 표백제를 권하지 마세요. 과일·채소 세척 질문은 물 세척을 기본으로 안내하고, 식초·베이킹소다에 담그는 방법을 필수 단계처럼 권하지 마세요.\n",
        "home_cleaning": "질문 의도는 집안 청소입니다. 청소용 화학제품의 비율·방치 시간·새 혼합법을 제안하지 말고 제조사 표시를 따르도록 하세요. 서로 다른 세정제를 섞지 말라고 하세요.\n",
        "laundry": "질문 의도는 의류 세탁입니다. 식재료 세척이나 집안 청소로 바꾸지 마세요.\n",
        "recycling": "질문 의도는 물건의 배출·분리수거입니다. kind=recycling으로 답하세요.\n",
        "other": "질문의 대상과 목적에 맞춰 답하고, 표면적으로 비슷한 단어 때문에 다른 주제로 바꾸지 마세요.\n",
    }.get(intent, "")
    return (
        "당신은 한국의 자취·생활 도우미입니다. 사용자 질문과 사진을 보고 JSON 하나만 답하세요. "
        "사진에 따로 놓인 물건이 여러 개면 중심 물건을 보세요. 사진에서 보이지 않는 상태는 추측하지 마세요.\n"
        f"{MIXED_GUIDE}\n"
        f"사용자 질문: {question or '사진 속 물건이나 생활 문제를 알려줘'}\n"
        f"{context}"
        "분리배출 질문이나 버릴 물건 사진이면 kind=recycling. 이때 아래 목록의 item_key만 고르고, "
        "없거나 불확실하면 item_key=unknown, confidence=0. "
        "배출 방법·요일은 작성하지 마세요.\n"
        "청소, 세탁, 보관, 요리, 자취 준비 등 생활 문제면 kind=tip. "
        "짧고 실행 가능한 방법을 1~5단계로 제시하세요. 사진만으로 원인을 단정하지 마세요. "
        "가스 냄새·감전·화재·심각한 건강 문제 등 위험 상황은 직접 수리나 처치를 안내하지 말고 "
        "안전한 대피·전문기관 연락을 권하세요. 확인하지 않은 출처나 수치를 지어내지 마세요.\n"
        "질문이 불명확하거나 범위 밖이면 kind=unknown.\n"
        f"분리배출 품목:\n{names}\n"
        f"분리배출 상태: {STATE_GUIDE}\n{DISAMBIGUATION_GUIDE}\n"
        'JSON 형식: {"kind":"recycling|tip|unknown",'
        '"item_key":"목록 key 또는 unknown","confidence":0.0,"mixed":false,'
        '"state":{"has_label":null,"has_contents":null,"is_dirty":null,"is_coated":null},'
        '"category":"자취|생활","title":"짧은 제목","answer":"핵심 한두 문장",'
        '"steps":["실행 단계"],"caution":"주의할 점 또는 null"}. '
        "recycling에서는 item_key/confidence/mixed/state만, tip에서는 category/title/answer/steps/caution만 필요합니다."
    )


def parse_assist_response(text: str, items: dict[str, Item]) -> AssistDecision:
    try:
        raw = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return AssistDecision("unknown")
    if not isinstance(raw, dict):
        return AssistDecision("unknown")
    if raw.get("kind") == "recycling":
        c = parse_response(text, items)
        return AssistDecision("recycling", classification=c)
    if raw.get("kind") == "tip":
        try:
            tip = TipAdvice.model_validate(raw)
        except ValidationError:
            return AssistDecision("unknown")
        return AssistDecision("tip", tip=tip)
    return AssistDecision("unknown")


# 상태·혼동 규칙: docs/research/vlm-hints.md (researcher R6) 반영
STATE_GUIDE = (
    "has_label: 라벨/스티커/테이프가 붙어 있음, "
    "has_contents: 내용물/액체/가스가 남아 있음, "
    "is_dirty: 음식물·고추기름·이물질로 오염됨, "
    "is_coated: 비닐·은박 코팅된 종이. "
    "사진에서 눈으로 확실히 보이거나 사용자가 글로 명시한 상태일 때만 true/false. "
    "불투명 용기 내부(캔·종이팩·튜브)나 가려진 면처럼 확인할 수 없으면 반드시 null "
    "(추측 금지 — null이면 사용자에게 되묻는다)."
)

DISAMBIGUATION_GUIDE = (
    "구분 주의: "
    "(1) 무색 투명 음료병만 pet_bottle_clear. 유색 페트병(plastic_bottle_colored)이나 입구가 넓은 "
    "테이크아웃 컵(plastic_cup_takeout)은 아니다. "
    "(2) 붉은 라면 기름 자국이나 은박 뚜껑 테두리가 있는 컵은 paper_cup이 아니라 cup_ramen. "
    "(3) 깨진 유리·거울·내열유리(broken_glass)와 불투명 도자기(ceramic_dish)는 glass_bottle이 아니다. "
    "(4) 계란껍데기(eggshell), 뼈·생선가시(animal_bone), 조개·견과류 껍데기·단단한 씨(shellfish_nut_shell), "
    "양파·마늘 마른 껍질·파뿌리·티백(onion_garlic_peel)은 food_waste가 아니다. "
    "(5) 솜이불·베개·방석(duvet_blanket)과 바퀴 달린 캐리어(furniture_large)는 clothing이 아니다. "
    "(6) 봉투(종량제·비닐봉투) 안에 여러 쓰레기가 섞여 담긴 사진이나 쓰레기 더미는 안에 보이는 물건 하나를 "
    "고르지 말고 item_key=unknown, confidence=0. 봉투 속 물건은 품목이 아니다. "
    "두 품목 사이에서 애매하면 confidence를 0.6 미만으로. 따로 놓인 물건이 여러 개면 가운데 가장 크게 찍힌 것 하나."
)


MIXED_GUIDE = (
    "mixed 판단: 종량제봉투·비닐봉투 안에 여러 쓰레기가 섞여 담겨 있거나, 여러 종류 쓰레기가 한데 쌓인 더미면 mixed=true. "
    "이때 봉투 속에 보이는 물건(페트병 등) 하나를 품목으로 고르지 마세요(서버가 종량제 봉투 안내로 바꿉니다). "
    "물건 하나(또는 같은 물건 여러 개)만 찍힌 사진이면 mixed=false."
)


def _item_lines(items: dict[str, Item]) -> str:
    return "\n".join(f"- {k}: {it.name}" + (f" — {it.visual_hint}" if it.visual_hint else "")
                     for k, it in items.items())


def build_prompt(items: dict[str, Item], question: str | None = None) -> str:
    task = (f'사용자 질문: "{question}"\n질문이 가리키는 품목을 고르세요.' if question
            else "사진 속 주된 버릴 물건 하나를 고르세요.")
    return (
        "당신은 분리배출 품목 분류기입니다. 배출 방법은 말하지 말고 품목만 고릅니다.\n"
        f"{task}\n아래 목록의 key 중에서만 고르고, 목록에 없거나 확실하지 않으면 \"unknown\".\n\n"
        f"품목 목록:\n{_item_lines(items)}\n\n"
        f"{DISAMBIGUATION_GUIDE}\n\n"
        f"상태: {STATE_GUIDE}\n\n{MIXED_GUIDE}\n\n"
        'JSON 하나만 출력: {"item_key": "<key 또는 unknown>", "confidence": 0~1, "mixed": true|false, '
        '"state": {"has_label": true|false|null, "has_contents": ..., "is_dirty": ..., "is_coated": ...}}'
    )


def parse_response(text: str, items: dict[str, Item]) -> Classification:
    """모델 출력 → Classification. 목록 밖 key나 깨진 JSON은 unknown."""
    m = re.search(r"\{.*\}", text, re.S)
    try:
        data = json.loads(m.group(0)) if m else {}
    except json.JSONDecodeError:
        data = {}
    if data.get("mixed") is True:
        # 섞인 봉투는 봉투 속 물건이 아니라 '종량제 봉투' 자체로 안내한다 (재활용품은 빼라고 함께 안내).
        if "general_waste_bag" in items:
            return Classification("general_waste_bag", 0.9, mixed=True)
        return Classification(None, 0.0, mixed=True)
    key = data.get("item_key")
    if key not in items:
        return Classification(None, 0.0)
    try:
        conf = min(max(float(data.get("confidence", 0)), 0.0), 1.0)
    except (TypeError, ValueError):
        conf = 0.0
    raw_state = data.get("state") if isinstance(data.get("state"), dict) else {}
    state = ItemState(**{k: v for k, v in raw_state.items()
                         if k in ItemState.model_fields and isinstance(v, bool)})
    return Classification(key, conf, state)
