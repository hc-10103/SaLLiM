# 살림 앱

Expo SDK 57 + TypeScript로 만든 iOS/Android 앱입니다. 스토어 등록 없이 휴대폰의 Expo Go에서 개발 중인 앱을 실행합니다.

## 실행

Node.js 22 이상과 아이폰/안드로이드에 최신 Expo Go를 설치합니다. 휴대폰과 개발 컴퓨터를 같은 Wi-Fi에 연결합니다.

```bash
cd app
npm install
npm start
```

터미널의 QR 코드를 아이폰은 기본 카메라, 안드로이드는 Expo Go 앱으로 스캔합니다. 연결되지 않으면 `npx expo start --tunnel`을 사용합니다. Expo Go가 로그인을 요구하면 컴퓨터의 Expo CLI와 휴대폰에서 같은 Expo 계정으로 로그인합니다.

## 현재 범위

- 사진 촬영, 앨범 선택, 선택한 사진 미리보기
- 상황 설명 입력
- LLM/VLM 답변과 지역별 배출 규칙은 아직 서버와 연결되지 않았습니다. 화면의 문구는 질문 예시이며 실제 분리수거 지침이 아닙니다.

## 검사

```bash
npx tsc --noEmit
npx expo-doctor
```

API 키는 앱에 넣지 않습니다. 추후 `server/`가 모델을 호출하고, 앱은 서버 API만 사용합니다.
