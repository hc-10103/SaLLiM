"""Tavily에서 공식 분리배출 안내의 관련 문장만 찾는다."""
import re
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx

from .schemas import WebSource

OFFICIAL_DOMAINS = ("go.kr", "keco.or.kr", "wasteguide.or.kr", "seoul.kr")
IGNORED_WORDS = {"어떻게", "버려요", "버리나요", "분리배출", "재활용", "쓰레기", "배출", "방법", "한국", "대한민국"}
DISPOSAL_WORDS = ("종량제", "분리배출", "재활용", "수거", "배출", "일반쓰레기", "음식물쓰레기", "폐기")


@dataclass(frozen=True)
class SearchHit:
    source: WebSource
    excerpt: str


def _trusted_url(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https":
        return False
    if any(host == domain or host.endswith("." + domain) for domain in OFFICIAL_DOMAINS):
        return True
    # 대학이 재게시한 정부 배출 지침 PDF도 출처를 명확히 표시해 사용할 수 있다.
    return host.endswith(".ac.kr") and parsed.path.lower().endswith(".pdf")


def _keywords(query: str) -> list[str]:
    return [word for word in re.findall(r"[가-힣A-Za-z0-9]{2,}", query)
            if word not in IGNORED_WORDS and not word.startswith(("어떻", "버리", "분리", "재활용"))]


def item_search_terms(question: str) -> str:
    """질문형 문장을 Tavily가 찾기 쉬운 물품명 위주로 줄인다."""
    short = re.split(r"(?:은|는|을|를)?\s*(?:어떻게|어디에|어디로|어디서|버리는|분리배출하는)",
                     question.strip(), maxsplit=1)[0]
    return short.strip(" ?!.,")[:100] or question.strip()[:100]


def direct_instruction(question: str, hits: list[SearchHit]) -> tuple[str, WebSource] | None:
    """요약 모델 장애 시 원문에서 물품명 직후의 짧은 배출 문장만 가져온다."""
    keywords = _keywords(item_search_terms(question))
    if not keywords:
        return None
    pattern = re.compile(r"\s*".join(re.escape(word) for word in keywords[:3]), re.I)
    for hit in hits:
        match = pattern.search(hit.excerpt)
        if not match:
            continue
        following = hit.excerpt[match.end():match.end() + 90]
        action = re.match(r".{0,65}?(?:배출|버리세요|버리기)", following, re.S)
        if not action:
            continue
        sentence = re.sub(r"\s+", " ", hit.excerpt[match.start():match.end()] + action.group(0)).strip()
        if len(sentence) <= 100:
            return sentence, hit.source
    return None


class TavilySearch:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def search(self, query: str) -> list[SearchHit]:
        terms = item_search_terms(query)
        keywords = _keywords(terms)
        if not keywords:
            return []
        response = httpx.post(
            "https://api.tavily.com/search", timeout=20,
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={"query": f"{terms} 분리배출 방법 한국",
                  "search_depth": "basic", "max_results": 8,
                  "include_answer": False, "include_raw_content": False},
        )
        response.raise_for_status()
        hits: list[SearchHit] = []
        seen: set[str] = set()
        for result in response.json().get("results", []):
            url = result.get("url", "")
            content = result.get("content", "")
            title = result.get("title", "")
            if not all(isinstance(value, str) for value in (url, content, title)):
                continue
            if not _trusted_url(url) or url in seen:
                continue
            item_pattern = re.compile(r"\s*".join(re.escape(word) for word in keywords[:3]), re.I)
            item_match = item_pattern.search(content)
            if not item_match:
                continue
            # 물품명 바로 주변에 배출 지시가 없는 색인·새활용 기사 등은 제외한다.
            start = max(0, item_match.start() - 80)
            local_evidence = content[start:item_match.end() + 140]
            if not any(word in local_evidence for word in DISPOSAL_WORDS):
                continue
            excerpt = local_evidence.strip()
            seen.add(url)
            hits.append(SearchHit(WebSource(title=title[:120] or urlparse(url).hostname or "공식 안내", url=url), excerpt))
            if len(hits) == 3:
                break
        return hits
