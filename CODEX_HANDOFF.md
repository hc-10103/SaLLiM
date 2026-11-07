# SaLLiM (살림) — 유저 테스트 수정 완료 내역 및 Codex 후속 작업 지시서

> **2026-11-07 Codex 검토 추가:** 아래 1·2차 기록은 당시 스냅샷이며 현재 가이드는 26개입니다. 후속 Task 1~4는 로컬 코드에 반영했습니다. `/assist`는 복수 품목을 개별 카드로 반환하고, 물어보기 대화와 되묻기 상태는 최근 10개까지 기기에 저장합니다. 관악구 전용수거 위치 안내에는 확인된 품목별 구청 링크를 연결했습니다. 종이팩 상시 수거함 위치는 공식 목록을 확인하지 못해 표시하지 않습니다. 앱 아이콘과 네이티브 스플래시 설정은 적용했으며 스플래시 확인에는 새 앱 빌드가 필요합니다. `server/.env`와 Python 캐시는 Git 추적에서 제거된 상태입니다. 과거 커밋의 `server/.env`에는 실제 API 키가 들어 있지 않은 것을 확인했습니다.

> **작성일**: 2026-11-07
> **현재 검증 상태**:
> - 백엔드 테스트: `cd server && .venv/bin/python -m pytest -q` → **45 passed**
> - 프론트엔드 타입 검사: `cd app && npx tsc --noEmit` → **0 errors**
> - 프론트엔드 린트: `cd app && npx expo lint` → **0 errors / 0 warnings**

## 1. 지금까지 진행 완료된 작업 요약 (1차 버그 수정 + 2차 UX·콘텐츠 개편)

### 1-1. 백엔드 (`server/`) 및 공통 API 계약 (`shared/api-types.ts`, `app/lib/api-types.ts`)

1. **공식 관리구역(`area_id`) 기반 배출 요일·시간 자동 연동**
   - **수정 파일**: `shared/api-types.ts`, `app/lib/api-types.ts`, `server/app/schemas.py`, `server/app/assemble.py`, `server/app/main.py`
   - **변경 내용**:
     - `AskRequest`(및 `AssistRequest`)와 `FollowUpRequest`에 선택 필드 `area_id?: string` 추가.
     - 관악구 외 지역(`region_id: "nationwide"`)을 선택한 유저라도 `area_id`([공공데이터포털 행정안전부 생활쓰레기배출정보](https://www.data.go.kr/data/15155080/openapi.do) 관리구역 ID)가 함께 전달되면, 품목 카테고리(`일반쓰레기` → `general_days`/`general_start~end`, `음식물` → `food_days`/`food_start~end`, 8대 재활용 품목 → `recycling_days`/`recycling_start~end`)에 맞춰 `next_days`, `time`, `note`, `sources`를 자동 조립하도록 구현.
     - `/assist` 요청에서 이미지 없이 명확한 분리배출 키워드(`버려`, `분리`, `재활용`, `쓰레기`, `배출`)와 단일 품목이 매칭될 경우 LLM 호출 전 `match_text()`로 즉시 정확한 공식 데이터를 반환하는 빠른 경로(Fast-path) 추가.
2. **파손 상태 오분류 방지 및 가이드 컨텍스트 간섭 차단**
   - **수정 파일**: `server/app/match.py`, `server/app/providers/mock.py`, `server/tests/test_match.py`
   - **변경 내용**:
     - `"유리병이 깨졌는데 어떻게 버려요?"`, `"맥주병 깨졌어"` 등 파손 키워드(`깨진`, `깨졌`, `깨져`, `박살`, `금간`, `산산조각`)가 포함된 유리·병·거울·컵 질문이 일반 `glass_bottle`로 매칭되지 않고 `broken_glass`(깨진 유리·특수종량제)로 우선 매칭되도록 개선.
     - `"형광등이 깨졌어"`처럼 파손된 형광등 질문이 `fluorescent_lamp`(깨지지 않은 것 전용수거)로 오매칭되지 않도록 차단.
     - 가이드 상세 화면(`app/app/guide/[id].tsx`)에서 `내 상황과 질문:` 접두어로 감싸 보낸 질문의 경우, 앞부분 가이드 요약에 포함된 단어 때문에 엉뚱한 품목으로 매칭되지 않도록 `extract_user_question()`으로 실제 사용자 질문만 분리해 매칭.
3. **공공데이터 오타 정제**
   - **수정 파일**: `server/app/waste_data.py`, `server/tests/test_waste_areas.py`
   - **변경 내용**: 관악구 등 행정안전부 스냅샷 원본의 `"투병한 비닐에 분리배출"` 오타를 로드 시점에 `"투명한 비닐에 분리배출"`로 정제.

### 1-2. 프론트엔드 (`app/`) 화면 재배치·추가·수정·삭제

1. **홈 화면 (`app/app/(tabs)/index.tsx`)**
   - **통합·삭제**: 관악구 선택 시 행안부 카드(`area`)와 주간 일정 카드(`weekly`)가 2개로 중복 노출되던 문제를 단일 카드로 통합하고, 하단의 중복 주의 문구 삭제.
   - **추가**:
     - 모든 지역 관리구역 카드 상단에 **오늘 요일 기준 배출 가능 품목 브리핑 배지**(`오늘(토)은 정기 배출 품목이 없는 날이에요` / `오늘(월) 배출 가능: 일반쓰레기 · 음식물 · 재활용품`) 추가.
     - `무엇이 궁금하세요?` 아래에 **자주 헷갈리는 품목 원터치 질문 칩 6종**(`🍗 치킨뼈·계란껍데기`, `🧊 아이스팩`, `📦 택배상자`, `🥤 배달용기`, `🔋 건전지`, `💊 남은 약`)을 배치해 터치 시 `/ask?q=...`로 즉시 질문 실행.
2. **물어보기 화면 (`app/app/(tabs)/ask.tsx`)**
   - **재배치**: 기존에 `ScrollView` 맨 아래에 묻혀 있던 `TextInput`과 `질문 보내기` 버튼을 **`KeyboardAvoidingView` 기반 하단 고정 입력 바(`[입력창] [보내기]`)**로 분리·재배치.
   - **수정·추가**:
     - `onContentSizeChange`마다 무조건 맨 아래로 점프해 긴 답변의 상단이 잘리던 문제를 해결(`shouldScroll` ref로 새 질문 등록 시에만 스크롤).
     - 홈 화면 칩 등에서 전달된 `?q=` 쿼리 파라미터 자동 실행 지원 및 상단 `대화 비우기` 버튼, 선택 지역 원터치 변경 바 추가.
3. **생활 가이드 목록 (`app/app/(tabs)/guides.tsx`) 및 상세 (`app/app/guide/[id].tsx`, `app/lib/guides.ts`)**
   - **재배치**: 2×2 큰 주제 박스를 상시 노출되는 **가로 카테고리 필터 칩(`전체 22`, `🍱 음식 7`, `🧺 청소·세탁 4`, `♻️ 분리배출 6`, `🏠 집·안전 5`)**과 검색어 지우기(`✕`) 버튼으로 개편.
   - **추가·수정**:
     - 모든 가이드 상세 화면에 하드코딩되어 있던 `"예: 냉장고에 하루 뒀는데 먹어도 될까요?"` 문구를 제거하고, 22개 각 가이드 주제에 맞는 **맞춤형 연관 질문 칩 2개씩(총 44개, 터치 시 즉시 AI 질문)**으로 교체.
     - 가이드 상세 하단에 **같은 주제의 추천 가이드 2개** 섹션 추가 및 `?ask=1` 진입 시 입력창 `autoFocus` 적용, AI 답변 수신 후 렌더링 완료 시점에 맞춘 자동 스크롤 수정.
     - [서울특별시 분리배출 기준](https://news.seoul.go.kr/env/archives/564022) 출처 기반으로 **`싱크대 배수구 냄새·물때 줄이기`(`sink-drain`)**와 **`다 쓴 건전지와 전구 버리는 법`(`bulb-battery`)** 가이드 2종 신규 추가.
4. **내 지역 설정 (`app/app/(tabs)/settings.tsx`)**
   - **버그 수정**: 검색창에 검색어를 입력한 채 `지역별 요일 없이 전국 공통 안내 사용` 버튼을 누르면 검색어가 지역명으로 저장되던 버그를 `"전국 공통 안내"` 고정 저장으로 수정.
   - **추가**: 복수 관리구역 시·군·구 선택 시 구역명 병기(`서울특별시 서초구 (방배2동)`), 선택된 지역 카드 내 **`홈에서 일정 보기 ›` 이동 버튼** 추가, 검색창 하단 **주요 지역 원터치 검색 칩 6종** 추가.
5. **카메라 (`app/app/capture.tsx`) 및 결과 카드 (`app/components/ResultCard.tsx`, `app/components/WasteAreaCard.tsx`)**
   - **추가·재배치**: `capture.tsx`에서 사진 선택 시 검은 빈 아이콘 박스 대신 **실제 선택한 사진 미리보기(`Image`)**를 표시하고, `사진 찍기` / `앨범에서 고르기` 버튼을 좌우 2열로 재배치.
   - **수정**:
     - `capture.tsx`, `guide/[id].tsx` 상단 뒤로가기 문구를 `‹ 이전 화면으로`로 통일하고 웹 직접 진입 시(`!router.canGoBack()`) 안전하게 홈/가이드 목록으로 이동하도록 fallback 처리.
     - `ResultCard.tsx`에서 요약문(`answer`)에 이미 포함된 문장이 `steps`에 중복 출력되지 않도록 필터링하고, 되묻기(`follow_up`) 응답 중 중복 클릭 방지(`busy`) 및 응답 완료 배지(`✓ 라벨·스티커 부착: 예`) 표시, 현재 경로(`/ask`, `/capture`)와 중복되는 재시도 버튼 숨김 처리.
     - `ResultCard.tsx` 및 `WasteAreaCard.tsx`의 출처([식품안전나라](https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs401&menu_grp=MENU_NEW02&menu_no=4419&ntctxt_no=1068743), [한국소비자원](https://www.kca.go.kr/home/sub.do?menukey=4004&mode=view&no=1003585726&page=67), [주택도시보증공사](https://m.khug.or.kr/jeonse/web/s03/s030103.jsp), [공공데이터포털](https://www.data.go.kr/data/15155080/openapi.do) 등)에 클릭 가능한 링크 스타일과 `↗` 아이콘 적용.

## 2. Codex가 이어서 진행하면 좋을 후속 작업 지시서 (우선순위순)

아래 작업들은 아키텍처 확장이나 추가 데이터·기능 고도화가 필요한 항목들입니다. Codex에게 원하는 번호를 지정해 바로 지시할 수 있습니다.

### Task 1. 복수 품목 동시 질문 처리 지원 (`server/app/match.py`, `server/app/main.py`, `app/components/AssistCard.tsx`)
- **배경 및 문제**: 사용자가 `"우유팩이랑 멸균팩 같이 버려도 돼?"`, `"소주병이랑 맥주캔 어떻게 버려?"`, `"양파껍질이랑 계란껍질 음식물이야?"`처럼 한 질문에 두 가지 이상의 품목을 동시에 물어볼 때, 현재 `match_text()`는 가장 긴 별칭 길이가 동점이면 모호성 방지를 위해 `None`을 반환합니다. 그 결과 분리배출 질문임에도 공식 `recycling` 카드가 아닌 일반 AI `tip` 카드로 빠지거나 `unknown`이 반환됩니다.
- **구현 지시사항**:
  1. `server/app/match.py`에 `match_multiple_texts(question: str, items: dict[str, Item], max_items: int = 3) -> list[str]` 함수를 추가하되, 기존 단일 매칭 함수 `match_text()`의 시그니처와 동작(`test_ambiguous_returns_none` 통과)은 그대로 유지할 것.
  2. 한 문장에서 2~3개의 품목이 명확히 감지된 경우, `AssistResponse`에 선택 필드 `recycling_list?: AskResponse[]`(또는 주 품목 `recycling` + 추가 품목 배열)를 내려주어 프론트엔드 `AssistCard.tsx`에서 각각의 공식 분리배출 카드를 순서대로 렌더링할 것.
  3. `server/tests/test_api.py`에 `"우유팩이랑 멸균팩 어떻게 버려?"` 요청 시 두 품목의 배출 안내가 모두 포함되는지 검증하는 테스트를 추가할 것.

### Task 2. 물어보기(`ask.tsx`) 대화 기록 로컬 저장 (`AsyncStorage`) 및 복원
- **배경 및 문제**: 현재 `app/app/(tabs)/ask.tsx`의 `messages` 상태는 컴포넌트 메모리(`useState`)에만 있어서, 앱을 새로고침하거나 다른 화면을 다녀오면서 리마운트되면 방금 물어본 분리배출·생활 팁 답변 내역이 사라집니다.
- **구현 지시사항**:
  1. `@react-native-async-storage/async-storage`를 사용해 최근 대화 최대 10개(`salim_recent_messages_v1`)를 저장·복원하도록 `app/lib/storage.ts`(또는 `ask.tsx` 내부 훅)를 구현할 것.
  2. 상단 `대화 비우기` 버튼을 누르면 `AsyncStorage`에 저장된 기록도 함께 삭제되도록 연동할 것.

### Task 3. 관악구 공식 출처 세부 URL 보강 및 전용수거함(`drop_off_points`) 화면 노출
- **배경 및 문제**:
  1. `data/regions/seoul-gwanak.json`에는 이미 `drop_off_points`(폐건전지·폐형광등·종이팩·폐의약품·의류수거함 위치 안내) 데이터가 들어 있으나, 현재 `server/app/schemas.py`의 `AskResponse`나 프론트엔드 `ResultCard.tsx`에서 `drop_off_points`를 화면에 표시하지 않고 있습니다.
  2. `REPORT.md`에 기록된 것처럼 `data/regions/seoul-gwanak.json`의 `sources` URL이 루트 도메인(`https://www.gwanak.go.kr`)으로 되어 있어 세부 안내 페이지 연결이 필요합니다.
- **구현 지시사항**:
  1. `item.category == "전용수거"` 또는 `"종이팩"`인 품목을 질의할 때, 해당 `RegionData`의 `drop_off_points`를 `AskResponse`의 `drop_off_points`(선택 필드)로 포함해 내려주고 `ResultCard.tsx` 하단에 **"📍 우리 동네 전용수거함 위치"** 박스로 표시할 것.
  2. `server/tests/test_assemble.py`에 전용수거 품목 질의 시 `drop_off_points`가 포함되는지 테스트를 추가할 것.

### Task 4. 디자인 에셋(앱 아이콘·스플래시) 적용 및 Git 워킹트리 정리
- **배경 및 문제**:
  1. `docs/design/brand/`에 디자인된 앱 아이콘과 스플래시 시안이 있으나 `app/assets/` 및 `app/app.json`에는 아직 기본 플레이스홀더 에셋이 연결되어 있습니다.
  2. Git 워킹트리에 삭제된 구버전 `.pyc` 캐시 파일들과 `server/.env` 변경분이 남아 있습니다.
- **구현 지시사항**:
  1. `docs/design/brand/`의 확정된 아이콘·스플래시 에셋을 `app/assets/`에 반영하고 `app/app.json` 설정을 점검할 것.
  2. `.gitignore`에 `__pycache__/`, `*.pyc`, `.env`, `.env.local`이 모두 포함되어 있는지 확인하고 `git rm --cached`로 불필요한 추적 파일을 정리할 것.

## 3. Codex에게 바로 붙여넣을 프롬프트

```text
프로젝트 루트의 `CODEX_HANDOFF.md` 파일을 먼저 읽고 현재까지 반영된 1·2차 수정 내역을 파악해 줘.
그다음 `CODEX_HANDOFF.md`의 "2. Codex가 이어서 진행하면 좋을 후속 작업 지시서"에 정리된 Task 1 ~ Task 4를 순서대로 구현하고, 마지막에 `cd server && .venv/bin/python -m pytest -q`와 `cd app && npx tsc --noEmit && npx expo lint`가 모두 통과하는지 확인해 줘.
```

## 4. 2026-11-07 추가 검증 및 남은 확인

- 백엔드 `pytest`: **50 passed**. 프론트엔드 타입 검사·린트·웹/iOS/Android 번들 내보내기 모두 통과.
- 로컬 웹앱에서 `우유팩이랑 멸균팩 어떻게 버려?`가 두 공식 분리배출 카드로 표시되는 것을 확인. 새로고침 후 대화·되묻기 상태 복원 및 `대화 비우기` 동작 확인.
- 실제 Gemini 설정의 로컬 서버로 냉장고 청소 질문을 보내 생활 팁 응답 수신 확인. 사진 인식은 이번 검증 범위에 포함하지 않음.
- 앱 아이콘·스플래시는 코드와 에셋에 적용했으나 Expo Go 미리보기만으로 네이티브 스플래시의 최종 모양은 확인할 수 없음. 새 개발 빌드에서 확인할 것.
- 관악구 외 지역의 전용수거함 위치 데이터는 아직 없으며, 관악구 종이팩 상시 수거함의 공식 위치 목록도 확인되지 않음. 앱은 확인되지 않은 위치를 표시하지 않음.
- 로컬 개발 서버는 8000(API), 8081(Expo) 포트로 실행 중. 휴대폰 테스트 시 맥북과 같은 와이파이 연결 및 `app/.env.local`의 맥북 IP 확인 필요.
