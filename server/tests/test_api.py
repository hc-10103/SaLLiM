import base64

import httpx
from fastapi.testclient import TestClient

from app.main import app

c = TestClient(app)
R = "test-region"


def b64(s: bytes) -> str:
    return base64.b64encode(s).decode()


def test_regions():
    assert c.get("/regions").json() == [{"id": R, "name": "테스트구"}]


def test_health():
    assert c.get("/health").json() == {"status": "ok"}


def test_ask_text_alias():
    r = c.post("/ask", json={"region_id": R, "question": "생수병 어떻게 버려?"}).json()
    assert r["item_key"] == "pet_bottle_clear" and r["confident"]
    assert r["follow_up"]["key"] == "has_label"


def test_ask_text_unknown_falls_back_to_mock():
    r = c.post("/ask", json={"region_id": R, "question": "우주선"}).json()
    assert r["item_key"] is None and not r["confident"]


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
    safe = safe_tip(tip)
    assert "섞으세요" not in safe.answer
    assert "제품 표시" in safe.answer
    assert "절대 섞지" in safe.caution
    laundry = TipAdvice(category="자취", title="빨래하기", answer="세제의 제품 표시를 확인하세요.",
                        steps=["색상별로 나누세요."], caution=None)
    assert safe_tip(laundry) == laundry


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
