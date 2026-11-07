# 살림 웹앱 시연 배포: FastAPI + JSON

추천 호스팅의 실제 설정값은 [Railway + Cloudflare Pages 가이드](hosting-railway-cloudflare.md)를 따른다.

현재 FastAPI가 백엔드다. `data/items.json`과 지역 JSON은 배포할 때 포함되는 기준 자료이고,
검색으로 얻은 답변은 실행 중에 `web_advice_cache.json`에 추가된다. 방문자 기기에는 이 파일이 필요 없다.
모든 방문자가 같은 API 서버에 요청하므로 서버의 저장 파일을 함께 사용한다.

## 1. API 서버의 영구 저장 공간

레포 루트의 `compose.yaml`은 API 서버 한 개와 `web_advice` 영구 볼륨을 실행한다.
실제 API 키는 `server/.env`에 두고 Git에 올리지 않는다.

```bash
docker compose up --build -d
docker compose ps
curl http://localhost:8000/health
```

이미 로컬 서버가 8000번 포트를 사용 중이면 `SALLIM_API_PORT=18000 docker compose up --build -d`로
실행하고 `http://localhost:18000/health`를 확인한다.

Compose는 `SALLIM_WEB_CACHE_PATH=/srv/cache/web_advice_cache.json`과 `/srv/cache` 볼륨을 설정한다.
컨테이너를 다시 만들어도 같은 볼륨을 붙이면 검색 답변이 남는다. 볼륨을 삭제하거나 서버 자체의
저장 장치를 잃으면 답변도 사라지므로, 장기 운영에는 볼륨 백업이 필요하다.

공개 호스팅에서도 **쓰기 가능한 영구 볼륨을 `/srv/cache`에 연결**하고 환경변수
`SALLIM_WEB_CACHE_PATH=/srv/cache/web_advice_cache.json`을 설정한다. 영구 볼륨을 제공하지 않는
호스팅이라면 현재 JSON 캐시를 오래 보존할 수 없다. 시연 환경에서는 API 서버를 한 인스턴스,
한 프로세스로 실행한다. 여러 인스턴스가 같은 JSON을 동시에 수정하는 운영 방식에는 DB가 필요하다.

`data/web_advice_cache.json`은 Git과 Docker 빌드에서 제외된다. 로컬에서 검색했던 답변을 배포 서버에
자동으로 복사하지 않으며, 배포 서버에서 처음 검색한 뒤 그 서버의 볼륨에 저장된다.

## 2. 웹앱 링크 연결

1. API 서버를 공개 HTTPS 주소에 배포하고 `/health`에서 `{"status":"ok"}`를 확인한다.
2. 웹앱 빌드 환경변수 `EXPO_PUBLIC_API_URL`에 **공개 API 주소**를 설정한다.
3. Expo 웹앱을 별도 웹 호스팅에 배포하고, 그 링크를 방문자에게 공유한다.
4. 방문자 기기에서 저장된 품목 질문, 목록 밖 품목 질문, 사진 질문을 각각 시험한다.

```bash
cd app
EXPO_PUBLIC_API_URL=https://YOUR_PUBLIC_API_URL npx expo export --platform web
# 생성된 app/dist/를 정적 웹 호스팅에 배포한다.
```

현재 Expo 웹 출력은 단일 페이지 앱이므로 호스팅의 알 수 없는 경로 요청을 `index.html`로
돌리도록 설정한다. 예를 들어 `/ask` 링크를 직접 열어도 앱이 떠야 한다.

`EXPO_PUBLIC_API_URL`이 없으면 앱은 예시 데이터 모드가 된다. `localhost`나 맥북의 사설 IP를
공개 웹앱 빌드에 넣으면 외부 방문자는 API에 접속하지 못한다. Gemini·Tavily 키는 서버에만 둔다.

## 3. JSON에서 DB로 발전시키는 시점

현재 `server/app/web_cache.py`가 검색 답변의 조회·저장을 맡는다. 품목 데이터와 답변 API는 그대로 두고,
나중에 이 저장 부분을 DB 구현으로 바꾸면 된다. 여러 서버 인스턴스, 운영자 검수, 사용자별 기록,
출처 변경 이력이나 대량 검색이 필요해지면 DB 전환을 검토한다.

## 4. 공개 시연 전에 확인할 점

- API 키 사용량 한도를 확인한다. 지금 API에는 사용자 인증이나 요청 수 제한이 없어 공개 주소에
  자동 요청이 몰리면 Gemini·Tavily 호출이 늘어날 수 있다.
- 최초의 미등록 품목 질문은 검색 때문에 느릴 수 있다. 같은 품목의 일반 질문은 저장 결과를 재사용한다.
- 저장 답변은 30일 뒤 다시 검색한다. 지역 배출 요일·장소는 별도 공식 지역 자료를 따른다.
