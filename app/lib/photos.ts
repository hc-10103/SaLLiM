import type { ImageSourcePropType } from "react-native";
import type { GuideCategory } from "./guides";

// 대표 사진 14장. 파일은 app/assets/photos/<이름>.jpg — 같은 이름으로 덮어쓰면 앱 전체에 바로 반영된다.
// (지금 들어 있는 건 임시 이미지. 진짜 사진 교체 방법: docs/design/v2/photos.md)
export const PHOTOS = {
  plastic: require("../assets/photos/plastic.jpg"),
  paper: require("../assets/photos/paper.jpg"),
  can: require("../assets/photos/can.jpg"),
  glass: require("../assets/photos/glass.jpg"),
  vinyl: require("../assets/photos/vinyl.jpg"),
  styrofoam: require("../assets/photos/styrofoam.jpg"),
  general: require("../assets/photos/general.jpg"),
  food: require("../assets/photos/food.jpg"),
  special: require("../assets/photos/special.jpg"),
  bulky: require("../assets/photos/bulky.jpg"),
  "guide-food": require("../assets/photos/guide-food.jpg"),
  "guide-clean": require("../assets/photos/guide-clean.jpg"),
  "guide-home": require("../assets/photos/guide-home.jpg"),
  "guide-recycle": require("../assets/photos/guide-recycle.jpg"),
} satisfies Record<string, ImageSourcePropType>;

export type PhotoName = keyof typeof PHOTOS;

// 분리배출 카테고리(서버 값) → 대표 사진
const BY_CATEGORY: Record<string, PhotoName> = {
  "투명페트": "plastic", "플라스틱": "plastic",
  "종이": "paper", "종이팩": "paper",
  "캔·고철": "can", "유리병": "glass", "비닐": "vinyl", "스티로폼": "styrofoam",
  "일반쓰레기": "general", "음식물": "food", "음식물쓰레기": "food",
  "전용수거": "special", "대형폐기물": "bulky", "재활용품": "guide-recycle",
};
export const photoForCategory = (category: string | null | undefined): PhotoName | null =>
  (category && BY_CATEGORY[category]) || null;

// 생활 가이드 → 사진. 분리배출 가이드는 다루는 물건의 분류 사진, 나머지는 가이드 카테고리 사진.
const GUIDE_BY_ID: Record<string, PhotoName> = {
  plastic: "plastic", pet: "plastic", "paper-carton": "paper", "parcel-box": "paper",
  medicine: "special", "food-waste": "food", "ice-pack": "general", "bulb-battery": "special",
};
const GUIDE_BY_CATEGORY: Record<GuideCategory, PhotoName> = {
  "음식": "guide-food", "청소·세탁": "guide-clean", "집·안전": "guide-home", "분리배출": "guide-recycle",
};
export const photoForGuide = (id: string, category: GuideCategory): PhotoName =>
  GUIDE_BY_ID[id] ?? GUIDE_BY_CATEGORY[category];
