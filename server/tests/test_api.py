import base64
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.mark.parametrize("question,kind,item_key", [
    ("남은 찌개를 냄비째 냉장고에 넣어도 괜찮나요?", "tip", None),
    ("흰 티셔츠에 김치 국물이 튀었는데 어떻게 세탁해요?", "tip", None),
    ("전자레인지랑 에어프라이어를 같은 멀티탭에 꽂아도 되나요?", "tip", None),
    ("페트병에 비닐 라벨이 붙어있는데 어떻게 버려요?", "recycling", "pet_bottle_clear"),
    ("배달 용기 윗면에 붙은 비닐이 안 떼어지는데 어떡하죠?", "tip", None),
    ("택배 상자에 테이프랑 송장 스티커 붙어있는데 어떻게 버려요?", "recycling", "cardboard_box"),
    ("테이크아웃 아이스커피 플라스틱 컵도 투명페트로 버려요?", "recycling", "plastic_cup_takeout"),
    ("일회용 종이컵은 일반 종이류인가요, 종이팩인가요?", "recycling", "paper_cup"),
    ("은박 보냉백(보냉 파우치)은 비닐류인가요, 일반쓰레기인가요?", "recycling", "insulated_cooler_bag"),
    ("프라이팬에 남은 식용유(폐식용유)는 어떻게 버려요?", "recycling", "cooking_oil"),
    ("빈 페트병에 폐식용유 담아서 어떻게 버려요?", "recycling", "cooking_oil"),
    ("다 먹은 참치캔이나 스팸캔은 기름을 어떻게 씻어서 버려요?", "recycling", "steel_can_food"),
])
def test_assist_context_regressions(question, kind, item_key):
    from app import data
    from app.main import create_app
    from app.providers.mock import MockVisionProvider

    client = TestClient(create_app(data.load(Path(__file__).parents[2] / "data"), MockVisionProvider()))
    result = client.post("/assist", json={"region_id": "seoul-gwanak", "question": question}).json()
    assert result["kind"] == kind
    assert not result.get("recycling_list")
    if item_key:
        assert result["recycling"]["item_key"] == item_key
    if "라벨이 붙어" in question or "스티커 붙어" in question:
        assert result["recycling"]["answered_state"]["has_label"] is True


def test_assist_guide_context_does_not_trigger_item_list():
    from app import data
    from app.main import create_app
    from app.providers.mock import MockVisionProvider

    client = TestClient(create_app(data.load(Path(__file__).parents[2] / "data"), MockVisionProvider()))
    question = "생활 가이드 주제: 세탁\n기본 안내: 티셔츠와 김치 국물\n내 상황과 질문: 흰 티셔츠는 어떻게 세탁해요?"
    result = client.post("/assist", json={"region_id": "seoul-gwanak", "question": question}).json()
    assert result["kind"] == "tip"

c = TestClient(app)
R = "test-region"


def b64(s: bytes) -> str:
    return base64.b64encode(s).decode()


def test_regions():
    assert c.get("/regions").json() == [{"id": R, "name": "테스트구"}]


def test_items_list_for_browsing():
    response = c.get("/items")
    assert response.status_code == 200
    items = response.json()
    assert items
    assert all({"key", "name", "category", "aliases"} <= item.keys() for item in items)
    assert any(item["key"] == "pet_bottle_clear" for item in items)


def test_health():
    assert c.get("/health").json() == {"status": "ok", "provider": "mock"}


def test_ask_text_alias():
    r = c.post("/ask", json={"region_id": R, "question": "생수병 어떻게 버려?"}).json()
    assert r["item_key"] == "pet_bottle_clear" and r["confident"]
    assert r["follow_up"]["key"] == "has_label"


def test_ask_text_unknown_falls_back_to_mock():
    r = c.post("/ask", json={"region_id": R, "question": "우주선"}).json()
    assert r["item_key"] is None and not r["confident"]
    assert "다시 찍" not in r["answer"]


def test_ask_image_mock():
    r = c.post("/ask", json={"region_id": R, "image_base64": b64(b"MOCK:glass_bottle")}).json()
    assert r["item_key"] == "glass_bottle" and r["next_days"] == ["화"]
    r = c.post("/ask", json={"region_id": R, "image_base64": "data:image/jpeg;base64," + b64(b"\xff\xd8real")}).json()
    assert r["item_key"] is None


def test_ask_low_confidence_image():
    r = c.post("/ask", json={"region_id": R, "image_base64": b64(b"MOCK:glass_bottle:0.4")}).json()
    assert r["item_key"] == "glass_bottle" and r["confident"] is False


def test_ask_errors():
    assert c.post("/ask", json={"region_id": R}).status_code == 422
    assert c.post("/ask", json={"region_id": R, "image_base64": "@@@"}).status_code == 422
    assert c.post("/ask", json={"region_id": "nope", "question": "생수병"}).status_code == 404


def test_followup():
    r = c.post("/ask/followup", json={"region_id": R, "item_key": "pet_bottle_clear",
                                       "state": {"has_label": True}}).json()
    assert "라벨을 먼저 떼야 해요." in r["answer"] and r["follow_up"]["key"] == "is_dirty"
    assert r["answered_state"]["has_label"] is True
    assert c.post("/ask/followup", json={"region_id": R, "item_key": "x", "state": {}}).status_code == 404
    assert c.post("/ask/followup", json={"region_id": R, "item_key": "pet_bottle_clear",
                                          "state": {"bogus": True}}).status_code == 422


def test_schedule():
    r = c.get("/schedule", params={"region_id": R}).json()
    assert list(r["week"]) == ["월", "화", "수", "목", "금", "토", "일"]
    assert r["today_categories"] == r["week"][r["today"]]
    assert c.get("/schedule", params={"region_id": "nope"}).status_code == 404


def test_assist_recycling_and_living_tip():
    recycling = c.post("/assist", json={"region_id": R, "question": "생수병 어떻게 버려요?"})
    assert recycling.status_code == 200
    assert recycling.json()["kind"] == "recycling"
    assert recycling.json()["recycling"]["item_key"] == "pet_bottle_clear"
    assert recycling.json()["recycling"]["sources"]

    living = c.post("/assist", json={"region_id": R, "question": "자취 빨래 팁 알려줘"})
    assert living.status_code == 200
    assert living.json()["kind"] == "tip"
    assert living.json()["tip"]["steps"]


def test_explicit_recycling_item_uses_stored_guidance_without_ai():
    from app import data
    from app.main import create_app
    from tests.conftest import FIXTURES

    class NoAiProvider:
        def classify_intent(self, question, image):
            raise AssertionError("분리배출 전용 화면은 의도 분류를 호출하지 않아야 함")

        def assist(self, question, image, items):
            raise AssertionError("저장된 품목은 답변 AI를 호출하지 않아야 함")

    cc = TestClient(create_app(data.load(FIXTURES), NoAiProvider()))
    body = cc.post("/assist", json={"region_id": R,
                                    "question": "생수병 어떻게 버려요?",
                                    "purpose": "recycling"}).json()
    assert body["kind"] == "recycling"
    assert body["recycling"]["item_key"] == "pet_bottle_clear"
    assert cc.post("/assist", json={"region_id": R, "question": "생수병", "purpose": "food"}).status_code == 422


def test_explicit_recycling_photo_skips_intent_call():
    from app import data
    from app.main import create_app
    from app.providers.base import AssistDecision, Classification
    from tests.conftest import FIXTURES

    class PhotoProvider:
        def __init__(self):
            self.answer_calls = 0

        def classify_intent(self, question, image):
            raise AssertionError("사용자가 분리배출을 선택했으면 의도 분류를 건너뛰어야 함")

        def assist_with_intent(self, question, image, items, intent):
            assert intent == "recycling"
            self.answer_calls += 1
            return AssistDecision("recycling", Classification("pet_bottle_clear", 0.95))

    provider = PhotoProvider()
    cc = TestClient(create_app(data.load(FIXTURES), provider))
    body = cc.post("/assist", json={"region_id": R, "purpose": "recycling",
                                    "image_base64": b64(b"photo")}).json()
    assert body["kind"] == "recycling"
    assert body["recycling"]["item_key"] == "pet_bottle_clear"
    assert provider.answer_calls == 1


def test_assist_two_cartons_have_separate_official_answers():
    from pathlib import Path
    from app import data
    from app.main import create_app

    root = Path(__file__).parents[2] / "data"
    cc = TestClient(create_app(store=data.load(root)))
    response = cc.post("/assist", json={
        "region_id": "seoul-gwanak",
        "question": "우유팩이랑 멸균팩 어떻게 버려?",
    })
    assert response.status_code == 200
    body = response.json()
    assert body["kind"] == "recycling"
    assert [item["item_key"] for item in body["recycling_list"]] == [
        "milk_carton", "aseptic_carton"
    ]
    assert all(item["steps"] and item["sources"] for item in body["recycling_list"])


def test_assist_two_peels_does_not_add_food_waste_category_as_item():
    from pathlib import Path
    from app import data
    from app.main import create_app

    cc = TestClient(create_app(store=data.load(Path(__file__).parents[2] / "data")))
    body = cc.post("/assist", json={
        "region_id": "seoul-gwanak", "question": "양파껍질이랑 계란껍질 음식물이야?",
    }).json()
    assert [item["item_key"] for item in body["recycling_list"]] == [
        "onion_garlic_peel", "eggshell"
    ]


def test_oily_delivery_container_uses_only_relevant_stored_guidance():
    from pathlib import Path
    from app import data
    from app.main import create_app

    cc = TestClient(create_app(store=data.load(Path(__file__).parents[2] / "data")))
    for payload in (
        {"question": "배달 용기에 고추기름이 묻었는데 어떻게 버려요?"},
        {"question": "음식물 묻은 배달용기는 어떻게 버려요?"},
        {"question": "고추기름이 빨갛게 밴 배달 플라스틱 통은 어떻게 버려요?"},
        {"question": "배달 용기에 고추기름이 묻었는데 어떻게 버려요?",
         "image_base64": b64(b"MOCK:plastic_container")},
    ):
        body = cc.post("/assist", json={"region_id": "nationwide", **payload}).json()
        assert body["kind"] == "recycling"
        assert body["recycling_list"] is None
        item = body["recycling"]
        assert item["item_key"] == "plastic_container"
        assert item["answered_state"]["is_dirty"] is True
        assert "씻어도 지워지지 않으면 일반쓰레기" in item["answer"]
        assert "지워지지 않는 용기는 일반쓰레기" in item["steps"][-1]
        assert "폐식용유" not in item["answer"]
        assert item["sources"]


def test_assist_image_and_validation():
    image = c.post("/assist", json={"region_id": R, "image_base64": b64(b"MOCK:glass_bottle")})
    assert image.status_code == 200
    assert image.json()["recycling"]["item_key"] == "glass_bottle"
    uncertain = c.post("/assist", json={"region_id": R, "image_base64": b64(b"MOCK:glass_bottle:0.4")}).json()
    assert uncertain["recycling"]["steps"] == []
    assert uncertain["recycling"]["confident"] is False
    assert c.post("/assist", json={"region_id": R, "image_base64": b64(b"not a known photo")}).json()["kind"] == "unknown"
    assert c.post("/assist", json={"region_id": R}).status_code == 422
    assert c.post("/assist", json={"region_id": R, "image_base64": "@@@"}).status_code == 422
    assert c.post("/assist", json={"region_id": R, "question": "a" * 501}).status_code == 422
    assert c.post("/assist", json={"region_id": "nope", "question": "빨래 팁"}).status_code == 404


def test_cleaner_advice_is_replaced_with_label_instructions():
    from app.main import safe_tip
    from app.schemas import TipAdvice
    tip = TipAdvice(category="생활", title="욕실", answer="락스에 식초를 섞으세요.",
                    steps=["30분 두세요."], caution=None)
    safe = safe_tip(tip, "home_cleaning")
    assert "섞으세요" not in safe.answer
    assert "제품 표시" in safe.answer
    assert "절대 섞지" in safe.caution
    laundry = TipAdvice(category="자취", title="빨래하기", answer="세제의 제품 표시를 확인하세요.",
                        steps=["색상별로 나누세요."], caution=None)
    assert safe_tip(laundry) == laundry


def test_food_preparation_is_not_rewritten_as_household_cleaning():
    from app.main import safe_tip
    from app.providers.base import build_assist_prompt, build_intent_prompt
    from app.schemas import TipAdvice

    food = TipAdvice(
        category="생활", title="방울토마토 세척",
        answer="흐르는 물에 방울토마토를 씻으세요.",
        steps=["먹기 직전에 씻으세요."], caution="식초는 필요하지 않아요.",
    )
    assert safe_tip(food, "food") == food
    assert "식재료 세척" in build_assist_prompt({}, "방울토마토 세척법", "food")
    assert "식재료를 씻거나" in build_intent_prompt("방울토마토 세척법")

    unsafe = TipAdvice(category="생활", title="닭 세척", answer="락스로 씻으세요.", steps=[])
    assert "락스로 씻으세요" not in safe_tip(unsafe, "food").answer
    assert "청소 제품은 표시대로" not in safe_tip(unsafe, "food").title
    assert "식재료 세척" not in build_assist_prompt({}, "욕실 곰팡이는 어떻게 청소하나요?", "home_cleaning")


def test_assist_keeps_food_answer_for_cooking_question():
    from app import data
    from app.main import create_app
    from app.providers.base import AssistDecision
    from app.schemas import TipAdvice
    from tests.conftest import FIXTURES

    food = TipAdvice(category="생활", title="닭고기 조리", answer="생닭은 씻지 않고 조리하세요.",
                     steps=["충분히 익혀 주세요."], caution="식초 세척은 필요하지 않아요.")

    class FoodProvider:
        def assist(self, question, image, items):
            return AssistDecision("tip", tip=food)

    cc = TestClient(create_app(data.load(FIXTURES), FoodProvider()))
    response = cc.post("/assist", json={"region_id": R, "question": "닭은 씻어서 조리하나요?"})
    assert response.status_code == 200
    assert response.json()["kind"] == "tip"
    assert response.json()["tip"]["title"] == food.title
    assert response.json()["tip"]["answer"] == food.answer


def test_assist_uses_semantic_intent_for_different_meanings_of_washing():
    from app import data
    from app.main import create_app
    from app.providers.base import AssistDecision
    from app.schemas import TipAdvice
    from tests.conftest import FIXTURES

    class IntentProvider:
        def classify_intent(self, question, image):
            return {"방울토마토 세척법": "food", "욕실 세척법": "home_cleaning",
                    "셔츠 세척법": "laundry", "쓰레기통 세척법": "home_cleaning"}[question]

        def assist_with_intent(self, question, image, items, intent):
            if intent == "food":
                return AssistDecision("tip", tip=TipAdvice(
                    category="생활", title="방울토마토 씻기", answer="방울토마토를 물에 씻으세요.",
                    steps=[], caution="식초 세척은 필요하지 않아요."))
            if intent == "home_cleaning":
                return AssistDecision("tip", tip=TipAdvice(
                    category="생활", title="욕실 세척", answer="락스에 식초를 섞으세요.", steps=[]))
            return AssistDecision("tip", tip=TipAdvice(
                category="자취", title="셔츠 세탁", answer="의류 표시를 확인하세요.", steps=[]))

    provider = IntentProvider()
    cc = TestClient(create_app(data.load(FIXTURES), provider))
    food = cc.post("/assist", json={"region_id": R, "question": "방울토마토 세척법"}).json()
    home = cc.post("/assist", json={"region_id": R, "question": "욕실 세척법"}).json()
    laundry = cc.post("/assist", json={"region_id": R, "question": "셔츠 세척법"}).json()
    trash_can = cc.post("/assist", json={"region_id": R, "question": "쓰레기통 세척법"}).json()
    assert food["kind"] == "tip" and food["tip"]["title"] == "방울토마토 씻기"
    assert home["tip"]["title"] == "청소 제품은 표시대로 사용해요"
    assert laundry["tip"]["title"] == "셔츠 세탁"
    assert trash_can["kind"] == "tip"


def test_note_passthrough(monkeypatch):
    from app.main import create_app
    from app import data
    from tests.conftest import FIXTURES
    store = data.load(FIXTURES)
    store.regions["test-region"].note = "아파트는 단지 안내를 따르세요"
    cc = TestClient(create_app(store))
    assert cc.get("/schedule", params={"region_id": R}).json()["note"] == "아파트는 단지 안내를 따르세요"
    r = cc.post("/ask", json={"region_id": R, "question": "생수병"}).json()
    assert r["note"] == "아파트는 단지 안내를 따르세요"


def test_ai_service_failure_is_safe_for_app():
    from app.main import create_app
    from app import data
    from tests.conftest import FIXTURES

    class FailingProvider:
        def match_text(self, question, items):
            response = httpx.Response(503, request=httpx.Request("POST", "https://example.invalid"))
            response.raise_for_status()

    cc = TestClient(create_app(data.load(FIXTURES), FailingProvider()))
    r = cc.post("/ask", json={"region_id": R, "question": "우주선"})
    assert r.status_code == 503
    assert "잠시 후 다시 시도" in r.json()["detail"]


def test_assist_mixed_trash_bag_photo():
    r = c.post("/assist", json={"region_id": R, "image_base64": b64(b"MOCK:mixed"), "purpose": "recycling"}).json()
    assert r["kind"] == "unknown" and "섞여" in r["message"]
