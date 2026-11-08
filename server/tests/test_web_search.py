import base64

import httpx
from fastapi.testclient import TestClient

from app import data
from app.main import create_app
from app.providers.base import AssistDecision, Classification
from app.providers.gemini import GeminiVisionProvider
from app.schemas import WebAdvice, WebSource
from app.tavily_search import SearchHit, TavilySearch, direct_instruction, item_search_terms
from tests.conftest import FIXTURES


def test_gemini_search_uses_grounding_and_metadata_sources(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_WEB_SEARCH_ENABLED", "true")
    monkeypatch.delenv("GEMINI_SEARCH_MODEL", raising=False)
    captured = {}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured["body"] = kwargs["json"]
        return httpx.Response(200, request=httpx.Request("POST", url), json={"candidates": [{
            "content": {"parts": [{"text": '{"item_name":"고데기","answer":"폐소형가전 수거함을 확인하세요.",'
                                   '"steps":["전원을 분리하세요.","지자체 수거 방법을 확인하세요."]}'}]},
            "groundingMetadata": {
                "webSearchQueries": ["고데기 분리배출 지자체"],
                "groundingChunks": [
                    {"web": {"title": "지자체 안내", "uri": "https://example.go.kr/waste"}},
                    {"web": {"title": "잘못된 링크", "uri": "javascript:alert(1)"}},
                ],
            },
        }]})

    monkeypatch.setattr(httpx, "post", fake_post)
    result = GeminiVisionProvider().search_recycling("고데기 버리기", None, "서울특별시 관악구")
    assert result is not None
    assert result.item_name == "고데기"
    assert [source.url for source in result.sources] == ["https://example.go.kr/waste"]
    assert captured["body"]["tools"] == [{"google_search": {}}]
    assert "gemini-3.5-flash-lite" in captured["url"]


def test_gemini_search_without_grounding_is_not_shown(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_WEB_SEARCH_ENABLED", "true")
    monkeypatch.setattr(httpx, "post", lambda url, **kwargs: httpx.Response(
        200, request=httpx.Request("POST", url), json={"candidates": [{
            "content": {"parts": [{"text": '{"item_name":"고데기","answer":"추측",'
                                   '"steps":["그냥 버리기"]}'}]},
        }]}))
    assert GeminiVisionProvider().search_recycling("고데기", None, "서울") is None


def test_gemini_search_can_be_disabled_without_api_call(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_WEB_SEARCH_ENABLED", "false")
    monkeypatch.setattr(httpx, "post", lambda *args, **kwargs: (_ for _ in ()).throw(
        AssertionError("disabled search must not call Gemini")))
    assert GeminiVisionProvider().search_recycling("고데기", None, "서울") is None


def test_assist_searches_only_after_local_and_model_miss():
    class Provider:
        name = "test"

        def __init__(self):
            self.calls = 0

        def assist(self, question, image, items):
            return AssistDecision("recycling", Classification(None))

        def search_recycling(self, question, image, region_name):
            self.calls += 1
            return WebAdvice(item_name="고데기", answer="지역 수거 방법을 확인하세요.",
                             steps=["전원 분리", "수거함 확인"],
                             sources=[WebSource(title="지자체 안내", url="https://example.go.kr/waste")],
                             searched_on="2026-11-07")

    provider = Provider()
    client = TestClient(create_app(store=data.load(FIXTURES), provider=provider))
    known = client.post("/assist", json={"region_id": "test-region", "question": "생수병 어떻게 버려?"})
    assert known.json()["kind"] == "recycling"
    assert provider.calls == 0
    unknown = client.post("/assist", json={"region_id": "test-region", "question": "고데기 어떻게 버려?"})
    assert unknown.status_code == 200
    assert unknown.json()["kind"] == "web"
    assert unknown.json()["web"]["sources"][0]["url"] == "https://example.go.kr/waste"
    assert provider.calls == 1
    photo = client.post("/assist", json={"region_id": "test-region",
                                         "image_base64": base64.b64encode(b"unknown photo").decode()})
    assert photo.json()["kind"] == "web"
    assert provider.calls == 2


def test_search_quota_error_is_explained_in_answer():
    class LimitedProvider:
        name = "gemini"

        def assist(self, question, image, items):
            return AssistDecision("recycling", Classification(None))

        def search_recycling(self, question, image, region_name):
            request = httpx.Request("POST", "https://generativelanguage.googleapis.com")
            response = httpx.Response(429, request=request)
            response.raise_for_status()

    client = TestClient(create_app(store=data.load(FIXTURES), provider=LimitedProvider()))
    response = client.post("/assist", json={"region_id": "test-region",
                                             "question": "코르크 마개는 어떻게 버려요?"})
    assert response.status_code == 200
    assert response.json()["kind"] == "unknown"
    assert "요금제·사용 한도" in response.json()["message"]


def test_tavily_keeps_only_relevant_official_evidence(monkeypatch):
    captured = {}

    def fake_post(url, **kwargs):
        captured["request"] = kwargs["json"]
        return httpx.Response(200, request=httpx.Request("POST", url), json={"results": [
            {"title": "서울 중구 분리배출 안내", "url": "https://www.junggu.seoul.kr/waste.pdf",
             "content": "코르크 마개는 종량제 봉투로 배출합니다."},
            {"title": "코르크 마개 따기", "url": "https://example.com/open-cork",
             "content": "코르크 마개를 칼로 빼는 법"},
            {"title": "무관한 공식 공지", "url": "https://example.go.kr/notices",
             "content": "청사 휴무 안내"},
        ]})

    monkeypatch.setattr(httpx, "post", fake_post)
    hits = TavilySearch("test-key").search("코르크 마개 어떻게 버려요")
    assert len(hits) == 1
    assert hits[0].source.url == "https://www.junggu.seoul.kr/waste.pdf"
    assert "코르크 마개" in hits[0].excerpt
    assert captured["request"]["search_depth"] == "basic"
    assert captured["request"]["include_answer"] is False


def test_direct_official_instruction_survives_gemini_outage():
    hits = [SearchHit(
        WebSource(title="중구 공식 안내", url="https://www.junggu.seoul.kr/waste.pdf"),
        "코르크따개는 별도 수거함. 코르크마개 쓰레기종량제 봉투로 배출. 코팅 종이는 종량제 봉투.",
    )]
    assert item_search_terms("코르크 마개는 어떻게 분리배출해요?") == "코르크 마개"
    direct = direct_instruction("코르크 마개는 어떻게 분리배출해요?", hits)
    assert direct is not None
    assert direct[0] == "코르크마개 쓰레기종량제 봉투로 배출"
    assert direct[1].url == hits[0].source.url


def test_tavily_fallback_for_unknown_text_and_photo(monkeypatch):
    class Provider:
        name = "test"

        def assist(self, question, image, items):
            return AssistDecision("unknown")

        def describe_search_item(self, image):
            return "코르크 마개"

        def summarize_search_results(self, question, hits):
            assert "코르크 마개" in question
            return WebAdvice(item_name="코르크 마개", answer="종량제 봉투로 배출해요.",
                             steps=["종량제 봉투에 넣기"], sources=[hits[0].source],
                             searched_on="2026-11-08")

    class Search:
        queries = []

        def search(self, query):
            self.queries.append(query)
            return [SearchHit(WebSource(title="공식 안내", url="https://example.go.kr/waste"),
                              "코르크 마개는 종량제 봉투로 배출")]

    search = Search()
    client = TestClient(create_app(store=data.load(FIXTURES), provider=Provider(), tavily=search))
    known = client.post("/assist", json={"region_id": "test-region", "question": "생수병 어떻게 버려요?"})
    assert known.json()["kind"] == "recycling"
    assert search.queries == []
    text = client.post("/assist", json={"region_id": "test-region", "question": "코르크 마개 어떻게 버려요?"})
    assert text.json()["kind"] == "web"
    photo = client.post("/assist", json={"region_id": "test-region",
                                          "image_base64": base64.b64encode(b"unknown photo").decode()})
    assert photo.json()["kind"] == "web"
    assert search.queries == ["코르크 마개 어떻게 버려요?", "코르크 마개"]


def test_tavily_quota_error_is_reported_without_exposing_key():
    class Provider:
        name = "test"

        def assist(self, question, image, items):
            return AssistDecision("unknown")

        def summarize_search_results(self, question, hits):
            raise AssertionError("No evidence should be summarized")

    class LimitedSearch:
        def search(self, query):
            request = httpx.Request("POST", "https://api.tavily.com/search")
            httpx.Response(429, request=request).raise_for_status()

    client = TestClient(create_app(store=data.load(FIXTURES), provider=Provider(),
                                   tavily=LimitedSearch()))
    body = client.post("/assist", json={"region_id": "test-region",
                                        "question": "코르크 마개 어떻게 버려요?"}).json()
    assert body["kind"] == "unknown"
    assert "검색 사용 한도" in body["message"]


def test_ai_estimate_when_no_stored_item_or_search():
    # 저장 품목·검색이 없으면 '모르겠어요' 대신 출처 없는 AI 추정 안내를 준다
    class EstimatingProvider:
        name = "gemini"

        def assist(self, question, image, items):
            return AssistDecision("recycling", Classification(None))

        def estimate_recycling(self, question, image):
            return WebAdvice(item_name="코르크 마개", answer="종량제 봉투로 버려요.", steps=["일반쓰레기로 배출하기"],
                             sources=[], searched_on="2026-11-08", note="AI 추정")

    client = TestClient(create_app(store=data.load(FIXTURES), provider=EstimatingProvider()))
    r = client.post("/assist", json={"region_id": "test-region", "question": "코르크 마개는 어떻게 버려요?"}).json()
    assert r["kind"] == "web" and r["web"]["sources"] == [] and r["web"]["item_name"] == "코르크 마개"


def test_gemini_estimate_parses_json(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    def fake_post(url, **kwargs):
        return httpx.Response(200, request=httpx.Request("POST", url), json={"candidates": [{"content": {"parts": [
            {"text": '{"item_name":"기름 묻은 페트병","answer":"헹궈도 안 지워지면 종량제 봉투로 버려요.",'
                     '"steps":["물로 헹궈 보기","안 지워지면 일반쓰레기로"]}'}]}}]})

    monkeypatch.setattr(httpx, "post", fake_post)
    r = GeminiVisionProvider().estimate_recycling("기름 묻은 페트병", None)
    assert r is not None and r.sources == [] and len(r.steps) == 2
