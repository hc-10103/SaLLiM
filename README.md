# SaLLiM (살림) — 삶을 간단하게

사진이나 채팅으로 분리배출·자취·생활 문제를 물어보는 앱. 분리배출은 **우리 동네 규칙**으로,
일반 생활 질문은 Gemini가 실행 순서로 정리해 답한다.

```
[사진] → ① VLM: 품목만 판별 (data/items.json의 item_key 중에서, 모르면 unknown)
       → ② 데이터 조회: 품목 배출법 + 동네 요일·시간·전용수거
       → ③ 템플릿으로 답변 조립 (LLM이 배출법을 지어내지 않음)
       → 상태가 애매하면 되묻기 ("라벨이 붙어 있나요?") → VLM 없이 다시 조립
```

## 폴더

| 경로 | 내용 |
|---|---|
| `app/` | Expo(TypeScript, expo-router) 앱. 탭: 홈·생활 팁 / 사진 / 채팅 / 설정 |
| `server/` | FastAPI. `/health` `/regions` `/assist` `/ask` `/ask/followup` `/schedule` `/waste-areas` |
| `shared/api-types.ts` | API 계약 (원본). 앱은 `app/lib/api-types.ts` 복사본 사용 |
| `data/items.json` | 품목 67개 — 전국 공통 기준, 항목마다 출처 |
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
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --env-file .env
curl -X POST localhost:8000/ask -H 'content-type: application/json' \
  -d '{"region_id":"seoul-gwanak","question":"생수병"}'
curl -X POST localhost:8000/assist -H 'content-type: application/json' \
  -d '{"region_id":"seoul-gwanak","question":"욕실 곰팡이 어떻게 청소해요?"}'
```

- 시작할 때 `data/`를 스키마로 검증한다. 틀리면 `DataError`로 바로 멈춘다 (출처 없는 품목도 거부).
- `VISION_PROVIDER=mock`은 실제 사진을 항상 unknown으로 돌려준다 (테스트용 바이트 `MOCK:<item_key>[:신뢰도]`만 인식).
  `claude`/`gemini`는 **유료 API 과금** — 키를 넣기 전에 콘솔 사용 한도부터 걸 것.
- 앱의 사진·채팅은 `/assist`를 호출한다. `kind=recycling`이면 검증된 품목·동네 데이터로 배출법을 만들고,
  `kind=tip`이면 AI가 일반 생활 팁을 단계별로 정리한다. 생활 팁에는 실시간 웹 검색이나 출처 검증이 없으므로
  위험하거나 비용이 큰 상황에는 전문가 확인 안내를 표시한다.
- 정확도 평가: `docs/research/eval-plan.md`의 30개 물건을 찍어 `server/eval/images/`에 넣고
  `.venv/bin/python -m eval.run_eval --provider <p> --labels eval/labels-real.csv`
- 배포: `docs/agents/deploy-guide.md` (`server/Dockerfile`, 레포 루트에서 빌드)

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
- `conditions[key]` 문장은 그 상태가 **true(예)**일 때 안내에 붙는다. 모르면 그 키로 되묻는다.
- 동네 추가: `data/regions/<id>.json` (파일명 = id). 모르는 값은 비우고 추측하지 않는다. 아파트·동별 차이는 `note`.
- 틀린 배출 안내는 과태료로 이어진다 — 출처와 "모르면 모른다"가 제일 중요하다.
