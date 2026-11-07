from app import data
from app.assemble import assemble
from app.providers.base import parse_response
from app.schemas import DropOffPoint, ItemState
from tests.conftest import FIXTURES

S = data.load(FIXTURES)
REGION = S.regions["test-region"]


def pet(state=None, conf=1.0):
    return assemble("pet_bottle_clear", S.items["pet_bottle_clear"], REGION, state, conf)


def test_basic_answer_uses_data_and_schedule():
    r = pet()
    assert r.category == "투명페트" and r.confident
    assert r.next_days == ["화", "금"] and r.time == "18:00~24:00"
    assert r.steps[:3] == S.items["pet_bottle_clear"].steps
    assert {s.url for s in r.sources} == {"https://example.com/pet", "https://example.com/region"}


def test_follow_up_asks_first_unknown_condition():
    assert pet().follow_up.key == "has_label"
    assert pet(ItemState(has_label=False)).follow_up.key == "is_dirty"
    assert pet(ItemState(has_label=False, is_dirty=False)).follow_up is None


def test_true_condition_adds_note():
    r = pet(ItemState(has_label=True, is_dirty=False))
    assert "라벨을 먼저 떼야 해요." in r.steps and "라벨을 먼저 떼야 해요." in r.answer
    assert "헹궈도" not in r.answer


def test_low_confidence():
    r = pet(conf=0.5)
    assert not r.confident and r.follow_up is None
    assert "다시 찍거나 이름으로 물어봐 주세요" in r.answer
    assert r.steps == [] and r.next_days == [] and r.time is None
    assert r.category is None and r.sources == [] and r.note is None


def test_region_override():
    r = assemble("battery", S.items["battery"], REGION)
    assert "주민센터" in r.answer and r.steps[0].startswith("주민센터")
    assert r.next_days == [] and r.time is None


def test_dedicated_collection_shows_only_matching_drop_off_point():
    region = REGION.model_copy(update={"drop_off_points": [
        DropOffPoint(type="폐건전지·폐형광등", where="동 주민센터", url="https://example.com/battery"),
        DropOffPoint(type="폐의약품", where="보건소", url="https://example.com/medicine"),
    ]})
    result = assemble("battery", S.items["battery"], region)
    assert len(result.drop_off_points) == 1
    assert result.drop_off_points[0].where == "동 주민센터"


def test_parse_response_rejects_unlisted_key():
    assert parse_response('{"item_key": "car", "confidence": 1}', S.items).item_key is None
    assert parse_response("garbage", S.items).item_key is None
    c = parse_response('```json\n{"item_key":"glass_bottle","confidence":1.7,"state":{"is_dirty":true,"x":1}}\n```', S.items)
    assert c.item_key == "glass_bottle" and c.confidence == 1.0 and c.state.is_dirty is True


def test_josa():
    from app.assemble import eun, euro
    assert [eun(w) for w in ["유리병", "투명 페트병", "종이", "관악구"]] == ["유리병은", "투명 페트병은", "종이는", "관악구는"]
    assert [euro(w) for w in ["유리병", "종이", "캔·고철", "음식물", "일반쓰레기"]] == ["유리병으로", "종이로", "캔·고철로", "음식물로", "일반쓰레기로"]
    assert eun("멸균팩 (두유·주스·생크림 팩)").endswith("은")


def test_prompt_lists_only_known_keys_and_null_rule():
    from app.providers.base import build_prompt
    p = build_prompt(S.items)
    assert all(f"- {k}:" in p for k in S.items)
    assert "null" in p and "unknown" in p and "구분 주의" in p
    assert '"생수병"' in build_prompt(S.items, "생수병")
