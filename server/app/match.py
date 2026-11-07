"""텍스트 질문 → item_key. 이름/별칭 매칭 (LLM 전에)."""
import re

from .schemas import Item

BROKEN_WORDS = ("깨진", "깨졌", "깨져", "박살", "금간", "산산조각")
GLASS_WORDS = ("유리", "소주병", "맥주병", "와인병", "음료수병", "잼병", "병", "거울", "컵", "뚜껑")


def normalize(s: str) -> str:
    return re.sub(r"[\s\W_]+", "", s.lower())


def extract_user_question(question: str) -> str:
    """생활 가이드 컨텍스트가 앞에 붙은 경우 실제 사용자 질문만 분리한다."""
    marker = "내 상황과 질문:"
    if marker in question:
        return question.split(marker, 1)[-1].strip()
    return question


def match_text(question: str, items: dict[str, Item]) -> str | None:
    """정확히 같으면 그 품목, 아니면 질문에 들어 있는 가장 긴 이름/별칭.
    가장 긴 후보가 여러 품목에 걸치면 모호하므로 None (→ 프로바이더 fallback)."""
    raw = extract_user_question(question)
    q = normalize(raw)
    if not q:
        return None
    if any(b in q for b in BROKEN_WORDS):
        if "broken_glass" in items and any(g in q for g in GLASS_WORDS):
            return "broken_glass"
        if any(l in q for l in ("형광등", "삼파장")):
            return None
    best_len, best = 0, set()
    for key, it in items.items():
        for term in (normalize(t) for t in [it.name, *it.aliases]):
            if len(term) < 2:
                continue  # 한 글자 별칭은 오매칭 위험
            if term == q:
                return key
            if term in q:
                if len(term) > best_len:
                    best_len, best = len(term), {key}
                elif len(term) == best_len:
                    best.add(key)
    return best.pop() if len(best) == 1 else None


def match_multiple_texts(question: str, items: dict[str, Item], max_items: int = 3) -> list[str]:
    """겹치지 않는 명확한 품목 표현을 질문에 나온 순서대로 찾는다.

    긴 별칭을 우선하고 같은 표현이 여러 품목을 가리키면 그 표현은 건너뛴다.
    단일 품목의 모호성 처리 규칙은 match_text에 그대로 둔다.
    """
    q = normalize(extract_user_question(question))
    if not q or max_items < 1:
        return []
    if any(word in q for word in BROKEN_WORDS) and any(
        word in q for word in (*GLASS_WORDS, "형광등", "삼파장")
    ):
        return []  # 파손 상태의 적용 범위를 문장만으로 안전하게 나눌 수 없다.

    spans: dict[tuple[int, int], set[str]] = {}
    for key, item in items.items():
        for raw_term in (item.name, *item.aliases):
            term = normalize(raw_term)
            if len(term) < 2:
                continue
            for found in re.finditer(re.escape(term), q):
                if key == "food_waste" and term == "음식물" and q[found.end():].startswith(
                    ("이야", "인가", "이에요", "입니까", "로")
                ):
                    continue  # "계란껍질 음식물이야?"의 음식물은 품목이 아닌 분류다.
                spans.setdefault(found.span(), set()).add(key)

    candidates = [(start, end, next(iter(keys)))
                  for (start, end), keys in spans.items() if len(keys) == 1]
    candidates.sort(key=lambda row: (-(row[1] - row[0]), row[0]))
    chosen: list[tuple[int, int, str]] = []
    for start, end, key in candidates:
        if any(not (end <= old_start or start >= old_end)
               for old_start, old_end, _ in chosen):
            continue
        chosen.append((start, end, key))

    ordered = sorted(chosen)
    keys = []
    for _, _, key in ordered:
        if key not in keys:
            keys.append(key)
        if len(keys) >= max_items:
            break
    return keys
