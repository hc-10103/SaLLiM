"""결정적 Mock. 테스트·개발 기본값. 실제 사진은 항상 unknown.

이미지 바이트가 b"MOCK:<item_key>[:<confidence>]" 이면 그 품목을 돌려준다.
"""
from ..match import extract_user_question, match_text
from ..schemas import Item, TipAdvice
from .base import AssistDecision, Classification, VisionProvider


class MockVisionProvider(VisionProvider):
    name = "mock"

    def classify(self, image: bytes, items: dict[str, Item]) -> Classification:
        if image.startswith(b"MOCK:"):
            parts = image[5:].decode("utf-8", "ignore").strip().split(":")
            if parts[0] in items:
                conf = float(parts[1]) if len(parts) > 1 else 0.9
                return Classification(parts[0], conf)
        return Classification(None, 0.0)

    def match_text(self, question: str, items: dict[str, Item]) -> Classification:
        return Classification(None, 0.0)

    def assist(self, question: str | None, image: bytes | None,
               items: dict[str, Item]) -> AssistDecision:
        if image is not None:
            return AssistDecision("recycling", self.classify(image, items)) if image.startswith(b"MOCK:") else AssistDecision("unknown")
        q = extract_user_question(question or "")
        if any(word in q for word in ("버려", "분리", "재활용", "쓰레기", "배출")):
            key = match_text(q, items)
            return AssistDecision("recycling", Classification(key, 1.0 if key else 0.0))
        if any(word in q for word in ("청소", "세탁", "빨래", "자취", "보관", "냄새", "먹어도", "해동", "냉장고")):
            return AssistDecision("tip", tip=TipAdvice(
                category="자취", title="생활 문제 해결 예시",
                answer="이 화면은 예시 답변이에요. Gemini를 연결하면 질문에 맞게 답해요.",
                steps=["문제 상황을 구체적으로 설명해 주세요.", "사진이 있다면 함께 올려 주세요."],
                caution="예시 데이터이므로 실제 상황에 그대로 적용하지 마세요.",
            ))
        return AssistDecision("unknown")
