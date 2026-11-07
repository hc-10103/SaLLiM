from app import data
from app.match import match_multiple_texts, match_text
from tests.conftest import FIXTURES

ITEMS = data.load(FIXTURES).items


def test_exact_and_alias():
    assert match_text("투명 페트병", ITEMS) == "pet_bottle_clear"
    assert match_text("생수병", ITEMS) == "pet_bottle_clear"


def test_contained_in_sentence():
    assert match_text("소주병은 어떻게 버려요?", ITEMS) == "glass_bottle"
    assert match_text("다 쓴 건전지 버리는 법", ITEMS) == "battery"


def test_no_match():
    assert match_text("냉장고", ITEMS) is None
    assert match_text("   ", ITEMS) is None


def test_ambiguous_returns_none():
    # 같은 길이 별칭이 두 품목에 걸치면 고르지 않는다
    assert match_text("생수병이랑 소주병", ITEMS) is None


def test_guide_context_prefix_is_ignored_when_matching():
    q = "생활 가이드 주제: 배달 용기\n기본 안내: 생수병과 소주병\n내 상황과 질문:\n건전지 버리는 법"
    assert match_text(q, ITEMS) == "battery"


def test_multiple_items_keep_question_order_and_single_match_unchanged():
    assert match_multiple_texts("생수병이랑 소주병 어떻게 버려?", ITEMS) == [
        "pet_bottle_clear", "glass_bottle"
    ]
    assert match_text("생수병이랑 소주병", ITEMS) is None
    assert match_multiple_texts("소주병과 생수병, 건전지", ITEMS, max_items=2) == [
        "glass_bottle", "pet_bottle_clear"
    ]


def test_multiple_items_with_broken_glass_falls_back():
    assert match_multiple_texts("깨진 소주병이랑 건전지 버려요", ITEMS) == []
