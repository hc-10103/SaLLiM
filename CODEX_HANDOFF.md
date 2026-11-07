# SaLLiM (살림) — 3차 심층 유저 테스트 리포트 및 Codex 수정 지시서

> **작성일**: 2026-11-08
> **대상 버전**: Tech Trust v2 개편 반영본 (온보딩 · 5탭 구조 · 복수 품목 매칭 · 웹 검색 캐시 · 되묻기 바텀시트 포함)
> **현재 기본 검증 상태**:
> - 백엔드 테스트: `cd server && .venv/bin/python -m pytest -q` → **69 passed**
> - 프론트엔드 타입 검사: `cd app && npx tsc --noEmit` → **0 errors**
> - 프론트엔드 린트: `cd app && npx expo lint` → **0 errors / 0 warnings**

## 1. 3차 테스트에서 발견된 미작동 기능 및 진입 불가 화면 (Broken / Dead Features)

| 우선순위 | 대상 파일 | 증상 (유저 테스트 재현 결과) | 원인 분석 |
| :--- | :--- | :--- | :--- |
| **P0 (진입 불가)** | `app/app/items.tsx`, `app/app/(tabs)/index.tsx`, `app/app/(tabs)/ask.tsx` | **67개 품목 사전 화면(`/items`, `버릴 물건 찾아보기`)이 고립되어 앱 내 어디에서도 진입할 수 없음** | `app/app/items.tsx` 화면과 백엔드 `GET /items` 엔드포인트가 구현되어 있으나, 홈(`index.tsx`)·물어보기(`ask.tsx`)·찍기(`CaptureScreen.tsx`) 어디에도 `router.push("/items")`로 연결되는 버튼이나 진입점이 없음 |
| **P1 (미작동)** | `server/app/assemble.py`, `data/regions/seoul-gwanak.json` | **관악구에서 `대형폐기물`(의자·매트리스·솜이불)이나 `종이팩`(우유팩·멸균팩)을 물어봐도 하단 `우리 동네 전용수거함` 박스가 전혀 표시되지 않음** | `seoul-gwanak.json`의 `drop_off_points`에는 `type: "대형폐기물"`([스마트클린 관악](https://smartclean.gwanak.go.kr)) 항목이 존재하지만 `assemble.py`의 `DROP_OFF_TYPES`에 `"furniture_large": "대형폐기물"`, `"duvet_blanket": "대형폐기물"` 매핑이 누락됨. 반대로 `DROP_OFF_TYPES`에는 `"milk_carton": "종이팩"`, `"aseptic_carton": "종이팩"`, `"paper_cup": "종이팩"`이 매핑되어 있으나 정작 `seoul-gwanak.json`의 `drop_off_points` 배열에 `"type": "종이팩"` 항목이 빠져 있음 |
| **P1 (오작동)** | `app/app/guides.tsx`, `app/components/GuideCard.tsx` | **생활 가이드 목록에서 카드 우측 `✦(AI 질문)` 아이콘을 누르면 내 상황을 입력하는 화면으로 가는 대신, 다짜고짜 1번 예시 질문(예: 치킨 질문)을 `/ask`에서 강제 전송해 버림** | `app/app/guides.tsx` 46행에서 `onAsk` 핸들러가 `router.push({ pathname: "/guide/[id]", params: { id: guide.id, ask: "1" } })` 대신 `router.push({ pathname: "/ask", params: { q: guide.examples?.[0] || ... } })`를 호출하도록 작성되어, 가이드 컨텍스트 없이 고정 질문이 즉시 발송됨 |
| **P2 (미작동)** | `app/app/guides.tsx`, `app/app/favorite/[key].tsx` | **웹에서 `/guides`나 `/favorite/[key]`를 새로고침하거나 URL로 직접 열었을 때 상단 `‹ 돌아가기` 버튼이 작동하지 않음** | `router.canGoBack()` 분기 없이 `router.back()`만 호출하고 있음. 또한 홈(`index.tsx`)의 '즐겨찾는 품목' 가로 리스트에서 클릭해 진입해도 상단 문구가 `"즐겨찾기로 돌아가기"`로 고정 표기됨 |
| **P2 (오작동)** | `app/lib/api.ts`, `app/app/favorite/[key].tsx` | **모크(오프라인) 모드에서 건전지·유리병 등을 즐겨찾기한 뒤 지역을 변경하면 즐겨찾기 상세가 무조건 '투명 페트병'으로 바뀜** | `app/lib/api.ts`의 `followUp()` 모크 구현이 `req.item_key`를 무시하고 항상 `MOCK_PET`을 반환함 |

## 2. 다양한 시나리오 테스트에서 적발된 `match_multiple_texts` & `/assist` 오작동 케이스

전수 테스트 결과, 새로 도입된 `match_multiple_texts` (`server/app/match.py`) 및 `/assist` 분기 (`server/app/main.py` 155~165행)에서 **일반 생활 팁 질문이나 단일 품목 질문을 '2개 품목 분리배출 질문(`recycling_list`)'으로 잘못 쪼개는 치명적 오작동**이 확인되었습니다.

### 2-1. 재현된 오작동 테스트 케이스 표

| 카테고리 | 테스트 입력 질문 | 기대 결과 | 실제 오작동 결과 (`match_multiple_texts`) |
| :--- | :--- | :--- | :--- |
| **생활·요리·세탁 팁 질문 가로채기** | `"남은 찌개를 냄비째 냉장고에 넣어도 괜찮나요?"` (`leftovers` 가이드 예시) | 음식 보관 `tip` 카드 | `['frying_pan_pot', 'large_appliance']` (냄비 고철 배출 + 냉장고 대형폐가전 배출 카드 2개 출력) |
| **생활·요리·세탁 팁 질문 가로채기** | `"흰 티셔츠에 김치 국물이 튀었는데 어떻게 세탁해요?"` (`laundry` 가이드 예시) | 세탁 `tip` 카드 | `['clothing', 'food_waste']` (헌 옷 의류수거함 + 음식물쓰레기 배출 카드 2개 출력) |
| **생활·요리·세탁 팁 질문 가로채기** | `"전자레인지랑 에어프라이어를 같은 멀티탭에 꽂아도 되나요?"` (`power` 가이드 예시) | 전기 안전 `tip` 카드 | `['large_appliance', 'small_appliance']` (대형폐가전 + 소형폐가전 배출 카드 2개 출력) |
| **단일 물건의 부속·라벨 오분리** | `"페트병에 비닐 라벨이 붙어있는데 어떻게 버려요?"` | `pet_bottle_clear` 단일 카드 (`has_label=True`) | `['pet_bottle_clear', 'plastic_bag']` (투명 페트병 + 비닐봉지·뽁뽁이 카드 2개 출력, `has_label` 상태 누락) |
| **단일 물건의 부속·라벨 오분리** | `"배달 용기 윗면에 붙은 비닐이 안 떼어지는데 어떡하죠?"` (`plastic` 가이드 예시) | `plastic_container` 단일 안내 또는 `tip` | `['plastic_container', 'plastic_bag']` (배달용기 + 비닐봉지 카드 2개 출력) |
| **단일 물건의 부속·라벨 오분리** | `"택배 상자에 테이프랑 송장 스티커 붙어있는데 어떻게 버려요?"` | `cardboard_box` 단일 카드 (`has_label=True`) | `['cardboard_box', 'box_tape_sticker']` (상자 + 테이프 2개로 분리, `has_label` 상태 추론 누락) |
| **질문 끝의 배출 분류명 오인식** | `"테이크아웃 아이스커피 플라스틱 컵도 투명페트로 버려요?"` (`pet` 가이드 예시) | `plastic_cup_takeout` 단일 카드 | `['plastic_cup_takeout', 'pet_bottle_clear']` (질문한 분류명 `'투명페트'`를 두 번째 물건으로 오인) |
| **질문 끝의 배출 분류명 오인식** | `"일회용 종이컵은 일반 종이류인가요, 종이팩인가요?"` (`paper-carton` 가이드 예시) | `paper_cup` 단일 카드 | `['paper_cup', 'milk_carton']` (분류명 `'종이팩'`을 우유팩으로 오인) |
| **질문 끝의 배출 분류명 오인식** | `"은박 보냉백(보냉 파우치)은 비닐류인가요, 일반쓰레기인가요?"` (`ice-pack` 가이드 예시) | `insulated_cooler_bag` 단일 카드 | `['insulated_cooler_bag', 'plastic_bag']` (분류명 `'비닐류'`의 `'비닐'`을 비닐봉지로 오인) |
| **용기·조리도구·세척 맥락 오인식** | `"프라이팬에 남은 식용유(폐식용유)는 어떻게 버려요?"` (`sink-drain` 가이드 예시) | `cooking_oil` 단일 카드 | `['frying_pan_pot', 'cooking_oil']` (식용유가 담긴 `'프라이팬'`까지 버릴 고철로 인식) |
| **용기·조리도구·세척 맥락 오인식** | `"빈 페트병에 폐식용유 담아서 어떻게 버려요?"` | `cooking_oil` 단일 카드 | `['pet_bottle_clear', 'cooking_oil']` (폐식용유를 담는 통으로 언급한 `'페트병'`까지 별도 품목으로 인식) |
| **용기·조리도구·세척 맥락 오인식** | `"다 먹은 참치캔이나 스팸캔은 기름을 어떻게 씻어서 버려요?"` (`opened-can` 가이드 예시) | `steel_can_food` 단일 카드 | `['steel_can_food', 'cooking_oil']` (`_context_only_alias`에 `'씻'` 패턴이 없어 `'기름'`을 폐식용유로 오인) |

## 3. Codex 작업 지시서 (우선순위순 구현 가이드)

아래 Task 1 ~ Task 5를 순서대로 수정하고, 모든 변경 후 `pytest`, `tsc --noEmit`, `expo lint`가 통과하는지 확인해 주세요.

### Task 1. [P0] 백엔드 `/assist` 및 `match_multiple_texts` 오탐지 버그 수정 (`server/app/main.py`, `server/app/match.py`)

1. **`server/app/main.py` (155~165행)**:
   - 현재 `if image is None and req.question and (intent is None or text_recycling_intent):` 조건 때문에 `intent is None`인 프로바이더(`MockVisionProvider` 등)에서는 분리배출 키워드가 전혀 없는 요리·세탁·전기 질문(`"남은 찌개를 냄비째 냉장고에 넣어도 괜찮나요?"` 등)도 무조건 `match_multiple_texts`를 타게 됩니다. 또한 가이드 상세(`"내 상황과 질문:" in req.question`) 질문도 가로채고 있습니다.
   - `match_multiple_texts` 빠른 경로 역시 단일 매칭과 동일하게 **`"내 상황과 질문:" not in req.question`이고 `text_recycling_intent`가 `True`일 때만**(또는 명확한 복수 품목 접속사 `이랑`, `하고`, `과`, `와`, `및`, `,`가 있고 분리배출 의도일 때만) 동작하도록 조건을 강화할 것.
   - `recycling_list`를 조립할 때도 단일 매칭과 동일하게 `infer_text_state(req.question, store.items[key])`를 전달해 오염·라벨 상태가 반영되게 할 것.
2. **`server/app/match.py`**:
   - **배출 분류명 질문 제외**: 현재 `key == "food_waste" and term == "음식물"`에 대해서만 `("이야", "인가", "이에요", "입니까", "로")` 접미어를 제외하고 있음. `"투명페트로 버려요?"`, `"종이팩인가요?"`, `"비닐류인가요?"`처럼 분류(카테고리) 이름을 묻는 서술어(`로버려`, `으로버려`, `인가`, `이야`, `류인가`, `맞나` 등)가 바로 뒤에 붙는 경우(`term in ("투명페트", "플라스틱", "종이", "종이팩", "유리병", "비닐")`), 이를 두 번째 배출 물건으로 잡지 않도록 제외 규칙을 일반화할 것.
   - **단일 물건의 부속·오염·용기 맥락 제외 (`_context_only_alias` 및 `infer_text_state`)**:
     - `_context_only_alias`에서 `key == "cooking_oil" and term == "기름"` 정규식에 `씻|세척|닦|제거|비우`를 추가해 `"참치캔 기름을 어떻게 씻어서"`가 `cooking_oil`로 잡히지 않게 할 것.
     - 문장에 `폐식용유`나 `식용유`가 명시된 경우, 이를 담거나 조리하던 용기(`프라이팬에 남은`, `빈 페트병에 담아`)가 별도 배출 품목으로 잡히지 않도록 처리할 것.
     - 문장에 주 용기(`페트병`, `배달 용기`, `택배 상자`, `택배 박스`)와 그 부속물(`비닐 라벨`, `윗면에 붙은 비닐`, `테이프`, `송장`, `스티커`)이 함께 등장하고 `"붙어"`, `"안 떼어"`, `"떼고"` 등의 표현이 있으면 별도 물건 2개로 쪼개지 말고 주 용기 단일 품목 + `state.has_label = True`로 추론(`infer_text_state` 확장)할 것.
   - `server/tests/test_api.py` 및 `server/tests/test_match.py`에 위 12개 오작동 케이스에 대한 회귀 테스트를 추가할 것.

### Task 2. [P0] 고립된 품목 사전 화면(`/items`) 진입점 연결 및 홈 빠른 질문 칩 유지 (`app/app/(tabs)/index.tsx`, `app/app/(tabs)/ask.tsx`, `app/components/CaptureScreen.tsx`)

1. **품목 사전(`/items`) 진입 버튼 추가**:
   - `app/app/(tabs)/index.tsx`(홈 화면): 주 동작 버튼 영역 또는 `즐겨찾는 품목` 섹션 헤더/하단에 **`품목 사전에서 찾아보기` (`router.push("/items")`)** 진입점을 추가할 것.
   - `app/app/(tabs)/ask.tsx`(물어보기 화면): 초기 안내 화면(`visibleMessages.length === 0`)에 `사진으로 물어보기` 카드와 함께 **`품목 사전에서 찾아보기` (`router.push("/items")`)** 버튼을 배치할 것.
   - `app/app/items.tsx`: 상단 SafeArea 여백(`useSafeAreaInsets`)을 다른 화면들과 통일해 모바일 상단 상태바와 겹치지 않게 수정할 것.
2. **홈 화면(`index.tsx`) 자주 찾는 품목 칩 상시 노출**:
   - 현재 `favItems.length > 0`이면 `QUICK_QUESTIONS`(치킨뼈, 아이스팩, 택배상자, 배달용기, 건전지, 남은 약) 칩이 완전히 사라짐. 즐겨찾기가 1~2개 있더라도 자주 헷갈리는 품목 칩(또는 `/items` 바로가기)을 함께 볼 수 있도록 구성을 보완할 것.

### Task 3. [P1] 관악구 전용수거함(`drop_off_points`) 매핑 누락 보완 (`server/app/assemble.py`, `data/regions/seoul-gwanak.json`)

1. `server/app/assemble.py`의 `DROP_OFF_TYPES` 딕셔너리에 다음 매핑을 추가할 것:
   - `"furniture_large": "대형폐기물"`, `"duvet_blanket": "대형폐기물"`
2. `data/regions/seoul-gwanak.json`의 `drop_off_points` 배열에 `"type": "종이팩"` 항목(관악구 21개 동 주민센터 종이팩 전용 수거 및 화장지 교환 안내, [관악구청 재활용품 분리배출 안내](https://www.gwanak.go.kr/site/gwanak/07/10703010200002016051206.jsp))을 추가해 `milk_carton`, `aseptic_carton`, `paper_cup` 조회 시 전용수거처 정보가 정상 노출되게 할 것.
3. `server/tests/test_assemble.py`에 대형폐기물 및 종이팩 질의 시 `drop_off_points`가 반환되는지 검증하는 테스트를 추가할 것.

### Task 4. [P1] 되묻기 바텀시트(`FollowUpSheet`) 자동 팝업 피로도 개선 (`app/components/ResultCard.tsx`, `app/app/(tabs)/ask.tsx`)

1. 현재 `ask.tsx`와 `CaptureScreen.tsx`에서 `autoOpenFollowUp`이 켜져 있어, 사용자가 질문을 보내자마자 기본 배출 결론과 순서를 읽기도 전에 `FollowUpSheet` 모달이 화면을 덮어버리며, 첫 질문에 답하면 시트가 닫히지 않고 2~3번째 되묻기 질문이 연달아 시트에서 이어집니다.
2. **수정 방향**:
   - 결과 카드가 처음 렌더링될 때는 바텀시트가 자동으로 화면을 가리지 않도록 기본값을 `false`로 두어 사용자가 먼저 배출 결론을 읽을 수 있게 하고, 카드 안의 `확인이 필요해요 · 답하기` 배너(또는 카드 내 인라인 `예`/`아니오` 칩 버튼)를 눌렀을 때 답할 수 있게 개선할 것.
   - 바텀시트에서 1회 응답이 완료되면 시트를 닫아 변경된 답변 본문을 바로 확인할 수 있게 할 것.

### Task 5. [P2] 네비게이션 안전장치, 가이드 `✦` 버튼, 대화 비우기 범위 수정 (`app/app/guides.tsx`, `app/app/favorite/[key].tsx`, `app/app/(tabs)/ask.tsx`)

1. **`app/app/guides.tsx`**:
   - 상단 `돌아가기` 버튼의 `onPress`를 `() => (router.canGoBack() ? router.back() : router.replace("/"))`로 수정해 웹 직접 진입 시 먹통이 되지 않게 할 것.
   - `GuideCard`의 `onAsk`가 다짜고짜 `examples[0]` 질문을 `/ask`로 전송하지 않고, `router.push({ pathname: "/guide/[id]", params: { id: guide.id, ask: "1" } })`로 해당 가이드 상세의 AI 질문 입력창으로 이동하게 수정할 것.
2. **`app/app/favorite/[key].tsx`**:
   - 상단 뒤로가기 버튼을 `() => (router.canGoBack() ? router.back() : router.replace("/favorites"))`로 수정하고, 홈에서도 진입할 수 있으므로 문구를 `"이전"`(또는 `"돌아가기"`)으로 통일할 것.
3. **`app/app/(tabs)/ask.tsx`**:
   - 상단 `비우기` 버튼 클릭 시 `setMessages([])` 대신 `setMessages((current) => current.filter((m) => m.regionId !== regionId))`로 수정해 다른 지역에서 저장한 대화 기록이 삭제되지 않도록 할 것.

## 4. Codex에게 바로 붙여넣을 프롬프트

```text
프로젝트 루트의 `CODEX_HANDOFF.md`를 읽고, "3. Codex 작업 지시서"의 Task 1 ~ Task 5를 순서대로 모두 구현해 줘.
특히 Task 1의 "2-1. 재현된 오작동 테스트 케이스 표"에 있는 12개 질문 시나리오가 모두 기대 결과대로 동작하도록 백엔드 테스트를 추가하고, 작업 완료 후 `cd server && .venv/bin/python -m pytest -q`와 `cd app && npx tsc --noEmit && npx expo lint`가 모두 에러 없이 통과하는지 확인해 줘.
```
