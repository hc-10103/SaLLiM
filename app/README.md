# SaLLiM app

- `EXPO_PUBLIC_API_URL` 없으면 mock(예시 데이터) 모드. 화면에 경고가 뜬다.
- 사진과 채팅은 서버의 `/assist`를 호출한다. 분리배출 결과는 사진에서 인식한 품목을 확인한 뒤 배출 방법을 보여 준다.
- 홈에는 기본 자취·생활 팁이 있고, 채팅에서는 Gemini가 질문별 생활 팁을 정리한다.
- 설정에서 시군구·동을 검색해 행정안전부 관리구역을 고르면 홈에 공식 배출 요일·시간과 자료 기준일을 표시한다. 검색은 서버 연결이 필요하다.
- `app.json`의 `usesCleartextTraffic: true`는 http 서버용 임시 설정 — 서버를 HTTPS로 올리면 제거.
- `eas.json`의 `CHANGE_ME`는 실제 서버 주소로 교체 (빌드는 사람이 실행).
copy .env.example .env
