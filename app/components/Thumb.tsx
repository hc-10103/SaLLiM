import { Image } from "react-native";
import { PHOTOS, type PhotoName } from "../lib/photos";
import { colors } from "../theme";

// 대표 사진 썸네일. 장식용이라 스크린리더에서는 숨긴다 (옆에 항상 글자가 있음).
export default function Thumb({ photo, size = 76, round = false }: { photo: PhotoName; size?: number; round?: boolean }) {
  return (
    <Image source={PHOTOS[photo]} resizeMode="cover" accessibilityElementsHidden importantForAccessibility="no"
      style={{ width: size, height: size, borderRadius: round ? size / 2 : Math.round(size * 0.24), borderCurve: "continuous",
        backgroundColor: colors.tint }} />
  );
}
