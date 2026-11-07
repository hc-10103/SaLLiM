import { View } from "react-native";
import type { GuideCategory } from "../lib/guides";
import Icon, { type IconName } from "./Icon";
import Thumb from "./Thumb";
import { photoForGuide } from "../lib/photos";

// 가이드 카테고리 색 (theme.categoryColors와 같은 톤)
export const GUIDE_TONE: Record<GuideCategory, { bg: string; fg: string; icon: IconName }> = {
  "음식": { bg: "#FCF2E7", fg: "#B56B22", icon: "bowl" },
  "청소·세탁": { bg: "#E7F6FA", fg: "#147A9E", icon: "spray" },
  "분리배출": { bg: "#EAF1FF", fg: "#2563EB", icon: "recycle" },
  "집·안전": { bg: "#F3EDFB", fg: "#7953B7", icon: "home" },
};

// 가이드별 아이콘 (이모지 대신 선 아이콘). 없으면 카테고리 아이콘.
const BY_ID: Record<string, IconName> = {
  leftovers: "bowl", thaw: "snowflake", fridge: "leaf", bleach: "spray", laundry: "shirt",
  plastic: "cup", pet: "drop", power: "plug", gas: "flame", alarm: "bell", move: "home",
  heating: "thermometer", expiry: "tag", "cutting-board": "knife", "freeze-portion": "box",
  "opened-can": "can", detergent: "detergent", "paper-carton": "carton", "parcel-box": "box",
  medicine: "pill", "food-waste": "egg", "move-photos": "camera", aircon: "snowflake",
  "ice-pack": "snowflake", "sink-drain": "drop", "bulb-battery": "bulb",
};

export default function GuideIcon({ id, category, size = 52, iconOnly = false }: {
  id: string; category: GuideCategory; size?: number; iconOnly?: boolean;
}) {
  const tone = GUIDE_TONE[category];
  if (!iconOnly) return <Thumb photo={photoForGuide(id, category)} size={size} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: tone.bg,
      alignItems: "center", justifyContent: "center" }}>
      <Icon name={BY_ID[id] ?? tone.icon} size={Math.round(size * 0.5)} color={tone.fg} />
    </View>
  );
}
