# 협업 규칙

둘이 하는 프로젝트라 규칙은 최소한으로. **폴더로 영역을 나누고, 만나는 곳은 `shared/` 하나로 좁힌다.**

## 1. 역할과 폴더

| 폴더 | 담당 | 내용 |
|---|---|---|
| `app/` | APP_OWNER | React Native + Expo 앱 |
| `server/` | SERVER_OWNER | FastAPI, LLM/VLM 호출, 프롬프트 |
| `data/` | SERVER_OWNER | 동네 배출 규칙 원본 (출처 필수) |
| `shared/` | 공동 | API 타입 (`api-types.ts`) — 앱·서버의 약속 |
| `docs/`, `CLAUDE.md`, `.github/` | 공동 | 문서, AI 작업 규칙, 템플릿 |

- 원칙적으로 **자기 폴더만** 수정한다. 남의 폴더를 고쳐야 하면 PR에 이유를 적는다 (CODEOWNERS가 자동으로 리뷰를 요청함).
- 공동 파일은 바꾸기 전에 한마디 하고, **그 파일만 담은 작은 PR**로 올린다.

## 2. 브랜치

`main` = 항상 실행되는 상태. 직접 push 금지, PR로만 머지.

```
<영역>/<짧은-설명>

app/camera-ask
app/region-setting
server/ask-api
server/vlm-prompt
data/mangwon-schedule
shared/ask-followup
fix/app-crash-on-empty-answer
chore/ci-setup
```

- 브랜치 하나 = 이슈 하나.
- **1~2일 안에 머지할 크기**로 자른다. 오래 살수록 충돌이 커진다.

## 3. 커밋 메시지

```
<영역>: <무엇을 했는지>

app: 카메라 촬영 화면 추가
server: /ask에 이미지 입력 지원
data: 망원동 배출 요일 추가
shared: AskResponse에 followUp 필드 추가
fix(app): 답변이 비었을 때 크래시 수정
```

- 작게, 자주. 커밋 하나에 한 가지 일.
- `git add .` 대신 **`git add app/`** 처럼 자기 폴더만 올린다.

## 4. 하루 작업 흐름

```bash
# 1) 최신 main에서 시작
git switch main
git pull

# 2) 이슈 번호 확인하고 브랜치 생성
git switch -c app/camera-ask

# 3) 작업 → 커밋
git add app/
git commit -m "app: 카메라 촬영 화면 추가"

# 4) 올리고 PR 만들기 (PR 본문에 closes #이슈번호)
git push -u origin app/camera-ask

# 5) 작업이 길어지면 중간에 main 따라가기
git switch main && git pull
git switch app/camera-ask
git merge main
```

## 5. PR과 리뷰

- PR 템플릿을 채운다. 특히 **확인 방법**과 **스크린샷/답변 예시**.
- 프롬프트를 바꾼 PR은 **같은 질문에 대한 변경 전/후 답변**을 반드시 붙인다.
- 리뷰는 **24시간 안에**. 깐깐하게 볼 필요는 없고 "돌려봤는데 됨 + 이해 안 되는 곳 질문"이면 충분하다. 목적은 서로의 코드를 아는 것.
- 승인 1개 → 작성자가 **Squash and merge** → 브랜치 삭제.

## 6. API 바꾸는 순서 (제일 중요)

1. **API 변경 이슈** 작성 (변경 전/후 타입)
2. 상대가 👍 → 합의
3. `shared/api-types.ts`만 바꾸는 **단독 PR** → 머지
4. 각자 자기 폴더에서 구현

필드 **추가**는 기존 코드를 안 깨니까 가볍게, 필드 **삭제·이름 변경**은 앱·서버 PR을 같은 날 머지한다.

## 7. 이슈 관리

- 모든 작업은 이슈로 시작한다 (템플릿: 기능 / 버그 / 데이터 / API 변경).
- GitHub Projects 보드: `할 일 → 하는 중 → 리뷰 → 완료`
- 하는 중인 이슈는 **한 사람당 최대 2개**.
- 라벨

| 라벨 | 의미 |
|---|---|
| `area:app` `area:server` `area:data` `area:shared` | 영역 |
| `type:feature` `type:bug` `type:data` `type:api` `type:chore` | 종류 |
| `P0` `P1` `P2` | 우선순위 (P0 = 지금 당장) |
| `stage:mvp` `stage:2` `stage:3` | 출시 단계 |
| `blocked` | 상대 작업이나 결정을 기다리는 중 |

## 8. 지켜야 할 것

- `.env`, API 키는 **절대 커밋하지 않는다.** `.env.example`만 올리고 실제 키는 따로 공유.
- `package-lock.json` 충돌 방지: 앱 패키지 추가는 APP_OWNER가 하거나, 추가 전에 말한다.
- `data/`의 규칙은 **출처 URL과 기준일 없으면 넣지 않는다.** 답변에 그대로 표시되기 때문.
- 30분 넘게 막히면 바로 공유한다.

## 9. 리듬

- **주 1회 30분 싱크**: 보드 띄워놓고 지난주 한 것 / 이번 주 할 것 / 막힌 것
- **2주마다** 둘이 같이 폰에 설치해서 실제로 써보기