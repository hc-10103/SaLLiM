from app.providers.base import parse_assist_response, parse_intent_response
from app.schemas import Item, Source


ITEMS = {"bottle": Item(name="병", category="유리병", steps=["씻기"],
                        sources=[Source(title="자료", url="https://example.com", updated="2026-11")])}


def test_living_tip_is_structured():
    raw = '{"kind":"tip","category":"생활","title":"빨래","answer":"분리하세요.","steps":["색상별로 나누기"],"caution":null}'
    decision = parse_assist_response(raw, ITEMS)
    assert decision.kind == "tip"
    assert decision.tip.steps == ["색상별로 나누기"]


def test_invalid_or_unsupported_advice_is_not_shown():
    assert parse_assist_response("not json", ITEMS).kind == "unknown"
    assert parse_assist_response('{"kind":"tip","title":"x"}', ITEMS).kind == "unknown"
    decision = parse_assist_response('{"kind":"recycling","item_key":"invented","confidence":1}', ITEMS)
    assert decision.classification.item_key is None


def test_semantic_intent_response_is_validated():
    assert parse_intent_response('{"intent":"food"}') == "food"
    assert parse_intent_response('{"intent":"home_cleaning"}') == "home_cleaning"
    assert parse_intent_response('{"intent":"unsupported"}') is None
    assert parse_intent_response('not json') is None
