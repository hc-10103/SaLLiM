"""웹 답변 캐시는 검색을 줄이되 출처와 유효 기간을 지킨다."""
import json
from datetime import date, timedelta

from fastapi.testclient import TestClient

from app import data
from app.main import create_app
from app.providers.base import AssistDecision
from app.schemas import WebAdvice, WebSource
from app.tavily_search import SearchHit
from app.web_cache import WebAdviceCache
from tests.conftest import FIXTURES


QUESTION = "코르크 마개 어떻게 분리배출해요?"
REGION = "test-region"
SOURCE = WebSource(title="지자체 공식 안내", url="https://example.go.kr/waste")


class UnknownProvider:
    def __init__(self):
        self.calls = 0
        self.intent_calls = 0

    def classify_intent(self, question, image):
        self.intent_calls += 1
        return "recycling"

    def assist(self, question, image, items):
        self.calls += 1
        return AssistDecision("unknown")

    def summarize_search_results(self, question, hits):
        return WebAdvice(item_name="코르크 마개", answer="종량제 봉투로 배출해요.",
                         steps=["종량제 봉투에 넣기"], sources=[hits[0].source],
                         searched_on=date.today().isoformat())


class OfficialSearch:
    def __init__(self):
        self.calls = 0

    def search(self, query):
        self.calls += 1
        return [SearchHit(SOURCE, "코르크 마개는 종량제 봉투로 배출")]


def test_official_web_answer_is_saved_and_reused_across_app_instances(tmp_path):
    path = tmp_path / "web_advice_cache.json"
    provider, search = UnknownProvider(), OfficialSearch()
    cache = WebAdviceCache(path)
    client = TestClient(create_app(store=data.load(FIXTURES), provider=provider,
                                   tavily=search, web_cache=cache))
    first = client.post("/assist", json={"region_id": REGION, "question": QUESTION}).json()
    assert first["kind"] == "web"
    assert provider.calls == search.calls == 1
    assert provider.intent_calls == 1
    saved = json.loads(path.read_text(encoding="utf-8"))
    assert saved["entries"][0]["web"]["sources"][0]["url"] == SOURCE.url

    other_provider, other_search = UnknownProvider(), OfficialSearch()
    other = TestClient(create_app(store=data.load(FIXTURES), provider=other_provider,
                                  tavily=other_search, web_cache=WebAdviceCache(path)))
    repeated = other.post("/assist", json={"region_id": REGION, "question": QUESTION}).json()
    assert repeated["web"] == first["web"]
    rephrased = other.post("/assist", json={"region_id": REGION,
                                             "question": "코르크마개는 어디에 버려요?"}).json()
    assert rephrased["web"] == first["web"]
    assert other_provider.calls == other_provider.intent_calls == other_search.calls == 0
    known = other.post("/assist", json={"region_id": REGION,
                                         "question": "생수병 어떻게 버려요?"}).json()
    assert known["kind"] == "recycling"


def test_cache_expires_and_rejects_unofficial_sources(tmp_path):
    cache = WebAdviceCache(tmp_path / "cache.json")
    official = WebAdvice(item_name="코르크 마개", answer="종량제 봉투로 배출해요.",
                         steps=["종량제 봉투에 넣기"], sources=[SOURCE],
                         searched_on=date.today().isoformat())
    cache.put(QUESTION, REGION, None, official)
    assert cache.get(QUESTION, REGION, None) == official
    assert cache.get("코르크마개는 어디에 버려요?", REGION, None) == official
    assert cache.get("기름 묻은 코르크 마개는 어떻게 버려요?", REGION, None) is None
    assert cache.get(QUESTION, "another-region", None) is None
    assert cache.get(QUESTION, REGION, "different-area") is None
    saved = json.loads(cache.path.read_text(encoding="utf-8"))
    saved["entries"][0]["saved_on"] = (date.today() - timedelta(days=31)).isoformat()
    cache.path.write_text(json.dumps(saved), encoding="utf-8")
    assert cache.get(QUESTION, REGION, None) is None

    unofficial = official.model_copy(update={"sources": [WebSource(
        title="블로그", url="https://example.com/blog")]})
    second = WebAdviceCache(tmp_path / "other.json")
    second.put(QUESTION, REGION, None, unofficial)
    assert not second.path.exists()
