# SaLLiM (살림) — 삶을 간단하게

사진이나 채팅으로 분리배출·자취·생활 문제를 물어보는 앱. 분리배출은 **우리 동네 규칙**으로,
일반 생활 질문은 Gemini가 실행 순서로 정리해 답한다.

```
[사진] → ① VLM: 품목만 판별 (data/items.json의 item_key 중에서, 모르면 unknown)
       → ② 데이터 조회: 품목 배출법 + 동네 요일·시간·전용수거
       → ③ 템플릿으로 답변 조립 (LLM이 배출법을 지어내지 않음)
       → 상태가 애매하면 되묻기 ("라벨이 붙어 있나요?") → VLM 없이 다시 조립
       → 목록에 없는 물품이면 저장된 웹 답변 확인 → 없으면 Tavily로 공식 자료 검색
       → Gemini가 공식 자료를 요약하고 확인된 답변을 JSON에 저장
```

## 폴더

| 경로 | 내용 |
|---|---|
| `app/` | Expo(TypeScript, expo-router) 앱. `design/v2` 화면을 바탕으로 홈 / 찍기 / 물어보기 / 즐겨찾기 / 설정을 제공하고, 홈에서 생활 가이드 목록을 연다 |
| `server/` | FastAPI. `/health` `/regions` `/assist` `/ask` `/ask/followup` `/schedule` `/waste-areas` |
| `shared/api-types.ts` | API 계약 (원본). 앱은 `app/lib/api-types.ts` 복사본 사용 |
| `data/items.json` | 품목 67개 — 전국 공통 기준, 항목마다 출처 |
| `data/web_advice_cache.json` | 목록 밖 품목의 공식 웹 검색 답변. 서버가 자동 저장하며 로컬 파일이므로 Git에는 올리지 않음 |
| `data/regions/<id>.json` | 동네 요일·시간·전용수거·예외(note). 관악구 상세 안내와 전국 공통 기본 안내 제공 |
| `data/waste_areas.json` | 행정안전부 전국 생활쓰레기배출정보 CSV에서 추린 관리구역별 요일·시간. 갱신 방법은 `docs/research/waste-data.md` |
| `docs/design/` | 디자인 4안·추천안 토큰·컴포넌트 명세·아이콘 (`docs/design/index.html`) |
| `docs/research/` | 출처 기록, 경쟁 조사, VLM 혼동 품목, 평가 계획 |

## 서버 실행

```bash
cd server
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env            # 기본 VISION_PROVIDER=mock
.venv/bin/python -m pytest -q   # 테스트
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --env-file .env --reload
curl -X POST localhost:8000/ask -H 'content-type: application/json' \
  -d '{"region_id":"seoul-gwanak","question":"생수병"}'
curl -X POST localhost:8000/assist -H 'content-type: application/json' \
  -d '{"region_id":"seoul-gwanak","question":"욕실 곰팡이 어떻게 청소해요?"}'
```

- 시작할 때 `data/`를 스키마로 검증한다. 틀리면 `DataError`로 바로 멈춘다 (출처 없는 품목도 거부).
- `VISION_PROVIDER=mock`은 실제 사진을 항상 unknown으로 돌려준다 (테스트용 바이트 `MOCK:<item_key>[:신뢰도]`만 인식).
  `gemini`는 설정된 API 프로젝트 요금제와 사용량에 따라 과금된다. 키와 사용 한도를 AI Studio에서 확인한다.
- 앱의 사진·채팅은 `/assist`를 호출한다. `kind=recycling`이면 검증된 품목·동네 데이터로 배출법을 만들고,
  `kind=web`이면 공식 자료 검색 결과·확인 날짜·출처 링크를 보여주고, `kind=tip`이면 AI가 일반 생활 팁을 단계별로 정리한다. 생활 팁에는 실시간 웹 검색이나 출처 검증이 없으므로
  위험하거나 비용이 큰 상황에는 전문가 확인 안내를 표시한다.
- 품목 목록에서 고른 물건과 사진 화면에서 사용자가 `분리배출`을 선택한 요청은 `purpose=recycling`을 보낸다.
  서버는 별도의 의도 분류 호출을 건너뛴다. 저장된 품목은 AI 없이 답하고, 사진은 품목 인식에만 AI를 사용한다.
  사진 화면의 `생활 문제`와 자유 채팅은 질문·사진의 의도를 먼저 분류해 맥락에 맞는 답변을 만든다.
- 저장된 품목에서 못 찾은 분리배출 질문은 서버 `.env`에 `TAVILY_API_KEY`가 있으면 Tavily로 검색한다.
  지자체·환경공단 등 공식 자료와 정부 지침을 재게시한 대학 PDF 중 물품명 주변에 배출 근거가 있는 결과만 사용한다.
  Gemini가 근거를 정리하고, 요약에 실패하면 확인 가능한 원문 문장이나 공식 출처를 표시한다.
  사진에서 목록 밖 물건을 찾지 못한 경우에는 Gemini가 물품명을 추출한 뒤 검색한다.
  `TAVILY_API_KEY`가 없으면 기존 동작을 유지하며, Gemini 자체 웹 검색은 기본 비활성화다.
  `.env`의 키를 추가하거나 바꾼 뒤에는 서버를 재시작한다.
- 글 질문에 대한 공식 출처의 웹 답변은 `data/web_advice_cache.json`에 자동 저장한다. 같은 질문·지역·관리구역이면
  30일 동안 Gemini와 Tavily를 다시 호출하지 않는다. 상태 설명이 없는 단순한 품목 질문은 표현이 조금 달라도
  품목명 기준으로 재사용한다. 오염·혼합 상태가 들어간 질문은 별개로 취급한다. 30일이 지나면 공식 자료를 다시 확인한다.
  질문 원문 대신 해시를 저장하고, 품목명·답변·출처·확인 날짜를 기록한다.
  사진은 캐시하지 않는다. 파일을 지우면 검색을 다시 수행하며, 배포 서버의 파일 저장 공간이 초기화되면 캐시도 사라진다.
  저장 위치는 서버 환경변수 `SALLIM_WEB_CACHE_PATH`로 바꿀 수 있다.
- 정확도 평가: `docs/research/eval-plan.md`의 30개 물건을 찍어 `server/eval/images/`에 넣고
  `.venv/bin/python -m eval.run_eval --provider <p> --labels eval/labels-real.csv`
- 배포: `docs/agents/hosting-railway-cloudflare.md` (추천 호스팅),
  `docs/agents/deploy-guide.md` (JSON 저장 구조와 공통 점검)
- JSON 저장을 유지하는 Docker 시연: 레포 루트에서 `docker compose up --build -d`.
  `compose.yaml`이 서버와 영구 볼륨을 함께 실행한다. 공개 웹앱 링크는 별도 배포가 필요하다.

## 앱 실행

```bash
cd app
npm ci --legacy-peer-deps
cp .env.example .env.local
# .env.local의 YOUR_COMPUTER_LAN_IP를 현재 컴퓨터의 와이파이 IP로 수정
npx expo start --lan
npx tsc --noEmit
```

- `app/.env.local`에는 서버 주소만 넣는다. `GEMINI_API_KEY`는 `server/.env`에만 넣는다.
- 서버는 별도 터미널에서 `cd server && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --env-file .env`로 켠다.
- 연결 확인: 컴퓨터에서 `http://localhost:8000/health`, 휴대폰에서 `http://<컴퓨터 IP>:8000/health`를 열었을 때 `{"status":"ok"}`가 보여야 한다.
- 앱이 `예시 데이터`를 표시하면 서버 주소가 앱에 반영되지 않은 것이다. `.env.local`을 확인하고 Expo Go에서 앱을 새로고침한다.
- 설정에서 지역을 검색해 공식 관리구역을 고르면 홈에 일반·음식물·재활용품 배출 요일과 자료 기준일이 나온다. 서버를 바꾼 뒤에는 서버를 재시작해야 한다.

APK: `app/eas.json`의 `CHANGE_ME`를 실제 서버 주소로 바꾼 뒤 `eas build -p android --profile preview`.

## 데이터 규칙

- 품목 추가: `data/items.json`에 `item_key`(영문 snake_case, 안 바뀜), `category`(12개 중 하나), `steps`, `conditions`(키는 `has_label` `has_contents` `is_dirty` `is_coated`만), **`sources` 필수**.
- 웹 검색 캐시는 검토 전 자료이므로 `items.json`에 자동 추가하지 않는다. 반복해서 쓰일 품목은 출처를 검토한 뒤 위 형식으로 추가한다.
- `conditions[key]` 문장은 그 상태가 **true(예)**일 때 안내에 붙는다. 모르면 그 키로 되묻는다.
- 동네 추가: `data/regions/<id>.json` (파일명 = id). 모르는 값은 비우고 추측하지 않는다. 아파트·동별 차이는 `note`.
- 틀린 배출 안내는 과태료로 이어진다 — 출처와 "모르면 모른다"가 제일 중요하다.
