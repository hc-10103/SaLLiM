# 살림 공개 웹앱 호스팅 선택

시연용 기본 조합: **Railway API 서버 + 영구 볼륨**, **Cloudflare Pages 웹앱**.
현재 FastAPI/JSON 코드를 그대로 사용한다. 공개 웹앱 이용자는 Cloudflare 주소를 열고,
모든 질문은 같은 Railway API 서버로 전송된다.

## 선택 이유와 조건

- Railway는 컨테이너와 영구 볼륨을 지원한다. 볼륨을 `/srv/cache`에 붙이면
  `web_advice_cache.json`이 재배포 후에도 남는다.
- Cloudflare Pages는 Expo에서 만든 `app/dist/`를 정적 웹앱으로 제공한다.
- 새 Railway 계정의 체험 크레딧에는 기한과 한도가 있다. 계정이 제한된 체험 상태면
  Gemini·Tavily로 나가는 연결이 제한될 수 있으므로 GitHub 연결 후 네트워크 상태를 확인한다.
  장기 운영 또는 체험 종료 후에는 사용량·요금제를 다시 확인해야 한다.

공식 자료: [Railway 볼륨](https://docs.railway.com/volumes),
[Railway 체험 계정](https://docs.railway.com/pricing/free-trial),
[Cloudflare Pages 빌드 설정](https://developers.cloudflare.com/pages/configuration/build-configuration/),
[Expo 웹앱 게시](https://docs.expo.dev/guides/publishing-websites/).

## 1. Railway: API 서버

현재 VSCode의 로컬 수정 사항을 먼저 확인한 뒤 배포할 GitHub 브랜치에 반영해야 한다.
아직 로컬 수정 사항을 GitHub로 올리지 않았으므로 호스팅 서비스에서 바로 읽을 수는 없다.

1. Railway에 GitHub 계정으로 가입한다. 제한된 체험 계정이면 외부 API 호출이 막힐 수 있다.
2. 이 저장소를 소스로 하는 새 서비스를 만든다. **Root Directory는 레포 루트 `/`**로 두고,
   Dockerfile 경로를 `server/Dockerfile`로 지정한다. Railway 변수로 설정할 때는
   `RAILWAY_DOCKERFILE_PATH=server/Dockerfile`을 사용한다.
3. 서비스 변수에 다음 값을 설정한다. 실제 키는 브라우저 앱이나 GitHub에 입력하지 않는다.

   | 변수 | 값 |
   |---|---|
   | `VISION_PROVIDER` | `gemini` |
   | `GEMINI_API_KEY` | 본인의 Gemini API 키 |
   | `TAVILY_API_KEY` | 본인의 Tavily API 키 |
   | `SALLIM_WEB_CACHE_PATH` | `/srv/cache/web_advice_cache.json` |

4. Railway 볼륨을 서비스에 추가하고 **마운트 경로를 `/srv/cache`**로 설정한다.
   인스턴스는 1개로 둔다. 여러 인스턴스에서 같은 JSON을 동시에 쓰는 구조는 지원하지 않는다.
5. 공개 도메인을 생성하고 `https://.../health`가 `{"status":"ok"}`인지 확인한다.
6. 목록 밖 품목을 한 번 질문한 뒤 같은 질문을 반복해 검색 결과가 재사용되는지 확인한다.

> `compose.yaml`은 로컬 또는 직접 관리하는 서버에서 같은 저장 구조를 실행하기 위한 설정이다.
> Railway 대시보드는 Compose 파일을 자동 적용하지 않으므로 볼륨과 변수를 위와 같이 설정한다.

## 2. Cloudflare Pages: 웹앱 링크

Railway API 주소가 나온 다음 웹앱을 빌드한다. Pages가 이 GitHub 저장소를 읽도록 연결한다.

| Cloudflare Pages 설정 | 값 |
|---|---|
| Root directory | `app` |
| Build command | `npm ci --legacy-peer-deps && npx expo export --platform web` |
| Build output directory | `dist` |
| `NODE_VERSION` | `22` |
| `EXPO_PUBLIC_API_URL` | Railway에서 발급된 공개 `https://...` 주소 |

Pages의 `*.pages.dev` 링크가 시연 링크다. `/ask`를 주소창에서 직접 열어도 앱이 보여야 한다.
Cloudflare Pages는 최상위 `404.html`이 없는 단일 페이지 앱의 경로를 기본 처리한다.
Expo 웹 번들에는 `EXPO_PUBLIC_API_URL`이 빌드 시 포함되므로 API 주소를 바꾸면 웹앱을 다시 배포한다.

## 3. 시연 전 확인

1. 서로 다른 두 브라우저에서 같은 웹앱 링크를 연다.
2. A에서 목록 밖 단일 물품을 검색해 공식 출처가 보이는지 확인한다.
3. B에서 같은 물품을 다시 물어본다. API 서버의 같은 JSON을 사용하므로 검색 없이 답해야 한다.
4. Railway 서비스를 재배포한 뒤에도 같은 답이 남는지 확인한다. 남지 않으면 볼륨 경로를 확인한다.

현재 구현은 검색 결과가 있는 **글 질문**을 저장한다. 사진과 복잡한 혼합 상태는 같은 품목명이라도
재사용을 제한한다. 저장 답변은 30일이 지나면 다시 검색한다.
