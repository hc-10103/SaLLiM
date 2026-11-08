"""텍스트 질문 → item_key. 이름/별칭 매칭 (LLM 전에)."""
import re

from .schemas import Item, ItemState

BROKEN_WORDS = ("깨진", "깨졌", "깨져", "박살", "금간", "산산조각")
GLASS_WORDS = ("유리", "소주병", "맥주병", "와인병", "음료수병", "잼병", "병", "거울", "컵", "뚜껑")
CATEGORY_TERMS = {"음식물", "투명페트", "플라스틱", "종이", "종이팩", "유리병", "비닐"}


def normalize(s: str) -> str:
    return re.sub(r"[\s\W_]+", "", s.lower())


def extract_user_question(question: str) -> str:
    """생활 가이드 컨텍스트가 앞에 붙은 경우 실제 사용자 질문만 분리한다."""
    marker = "내 상황과 질문:"
    if marker in question:
        return question.split(marker, 1)[-1].strip()
    return question


def _context_only_alias(key: str, term: str, question: str, start: int, end: int) -> bool:
    """용기에 묻은 이물질을 별도로 버릴 품목으로 세지 않는다."""
    nearby = question[max(0, start - 8):min(len(question), end + 20)]
    if key == "cooking_oil" and term == "기름":
        return bool(re.search(r"기름.{0,16}(묻|튀었|얼룩|오염|범벅|배었|밴|착색|씻|세척|닦|제거|비우)", nearby))
    if key == "food_waste" and term == "음식물":
        return bool(re.search(r"음식물.{0,8}(묻|붙|남아|남았|범벅)", nearby))
    if key == "plastic_bag" and term == "비닐":
        if question[end:].startswith("라벨"):
            return True
        if re.search(r"(?:붙은|붙어있는|안떼어지는)비닐", nearby) and re.search(
            r"(?:페트병|배달용기|상자|박스|컵)", question[:start]
        ):
            return True
    if key == "box_tape_sticker" and term in ("테이프", "스티커", "라벨지"):
        if re.search(r"(?:상자|박스)", question[:start]) and re.search(r"붙|안떼|떼어", nearby):
            return True
    if key in ("frying_pan_pot", "pet_bottle_clear") and "식용유" in question:
        if re.search(r"^에.{0,18}(?:남은|담)", question[end:]):
            return True
    return False


def infer_text_state(question: str, item: Item) -> ItemState:
    """문장에 명시된 상태만 반영한다. 세척 가능 여부는 추정하지 않는다."""
    raw = extract_user_question(question)
    state = ItemState()
    if "has_label" in item.conditions:
        if re.search(r"(?:라벨|테이프|송장|스티커|붙은\s*비닐).{0,20}(?:붙|(?:안|못)\s*(?:떼|뗐)|달려)", raw):
            state.has_label = True
        elif re.search(r"(?:라벨|테이프|송장|스티커).{0,8}(?:없|제거했|떼었|뗐)", raw):
            state.has_label = False
    if "has_contents" in item.conditions:
        if re.search(r"(?:내용물|음료|액체|국물).{0,12}(?:남아|남았|들어|담겨|안\s*비웠)", raw):
            state.has_contents = True
        elif re.search(r"(?:내용물|음료|액체|국물).{0,12}(?:없|비웠|비운|버렸)", raw):
            state.has_contents = False
    if "is_dirty" in item.conditions and re.search(
        r"(?:고추기름|기름|양념|소스|국물|음식물).{0,12}(?:묻|튀었|얼룩|오염|배었|밴|착색|범벅)", raw
    ) and not re.search(r"(?:안|않|없이)\s*묻", raw):
        state.is_dirty = True
    return state


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
            start = q.find(term)
            if start >= 0 and not _context_only_alias(key, term, q, start, start + len(term)):
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
    ignored_spans: list[tuple[int, int]] = []
    for key, item in items.items():
        for raw_term in (item.name, *item.aliases):
            term = normalize(raw_term)
            if len(term) < 2:
                continue
            for found in re.finditer(re.escape(term), q):
                if _context_only_alias(key, term, q, *found.span()):
                    ignored_spans.append(found.span())
                    continue
                if term in CATEGORY_TERMS and re.match(
                    r"(?:로|으로|인가|이야|이에요|입니까|류인가|맞나)", q[found.end():]
                ):
                    ignored_spans.append(found.span())
                    continue  # 분류명 질문은 두 번째 물건이 아니다.
                spans.setdefault(found.span(), set()).add(key)

    candidates = [(start, end, next(iter(keys)))
                  for (start, end), keys in spans.items() if len(keys) == 1
                  and not any(ignored_start <= start and end <= ignored_end
                              for ignored_start, ignored_end in ignored_spans)]
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
