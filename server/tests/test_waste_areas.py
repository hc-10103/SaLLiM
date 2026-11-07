"""공식 스냅샷에서 시군구·관리구역을 잘 찾는지 확인한다."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_official_area_lookup():
    result = client.get("/waste-areas", params={"query": "서울 마포구"})
    assert result.status_code == 200
    data = result.json()
    assert data["total"] == 1
    area = data["items"][0]
    assert (area["city"], area["district"]) == ("서울특별시", "마포구")
    detail = client.get(f"/waste-areas/{area['id']}").json()
    assert detail["recycling_days"]
    assert detail["data_date"]
    assert detail["source_url"].startswith("https://www.data.go.kr/")


def test_district_with_different_collection_zones_needs_area_selection():
    broad = client.get("/waste-areas", params={"query": "서초구"}).json()
    assert broad["total"] > 1
    narrow = client.get("/waste-areas", params={"query": "서초구 방배2동"}).json()
    assert narrow["total"] == 1
    assert narrow["items"][0]["target"] == "방배2동"


def test_missing_area_and_invalid_search():
    assert client.get("/waste-areas/no-such-area").status_code == 404
    assert client.get("/waste-areas", params={"query": "가"}).status_code == 422


def test_area_id_enriches_nationwide_recycling_schedule_and_cleans_typo():
    gwanak = client.get("/waste-areas", params={"query": "관악구"}).json()["items"][0]
    detail = client.get(f"/waste-areas/{gwanak['id']}").json()
    assert "투병한" not in detail["recycling_method"]
    assert "투명한 비닐" in detail["recycling_method"]

    mapo = client.get("/waste-areas", params={"query": "서울 마포구"}).json()["items"][0]
    r = client.post("/ask", json={
        "region_id": "test-region",
        "area_id": mapo["id"],
        "question": "건전지",
    }).json()
    assert r["item_key"] == "battery"
