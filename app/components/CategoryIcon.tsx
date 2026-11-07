import { Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { categoryColor, radius, space, typography } from "../theme";

// 24×24, stroke 1.75. 장식용 — 항상 카테고리 글자와 함께 쓴다. 색은 theme.categoryColors.
const BODY: Record<string, string> = {
  "투명페트": "<path d=\"M9 2.5h6v3.5l3 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V10l3-4ZM9 6h6M6 13h12\"/>",
  "플라스틱": "<path d=\"M5 7h14l-1.8 13.2a1 1 0 0 1-1 .8H7.8a1 1 0 0 1-1-.8ZM4 4h16M9 11h6M9.5 15.5h5\"/>",
  "종이": "<path d=\"M6 2.5h8l4.5 4.5v14.5H6ZM14 2.5V7h4.5M9 12h6.5M9 16h6.5\"/>",
  "종이팩": "<path d=\"M6 8.5 9 3h6l3 5.5V21H6ZM6 8.5h12M13 8.5V21M8.5 13h2M8.5 16.5h2\"/>",
  "캔·고철": "<ellipse cx=\"12\" cy=\"5\" rx=\"5.5\" ry=\"2\"/><path d=\"M6.5 5v14c0 2.7 11 2.7 11 0V5M9.5 10.5h5M9.5 15h5\"/>",
  "유리병": "<path d=\"M10 2.5h4V9l2.8 3.5V20a1.5 1.5 0 0 1-1.5 1.5H8.7A1.5 1.5 0 0 1 7.2 20v-7.5L10 9ZM10 5.5h4M7.2 15h9.6\"/>",
  "비닐": "<path d=\"M8 3.5c0 2 1.2 3 2 3.5M16 3.5c0 2-1.2 3-2 3.5M6.5 7h11l1.5 12.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5ZM9 11.5c1 1.5 1 3 0 4.5M15 11.5c-1 1.5-1 3 0 4.5\"/>",
  "스티로폼": "<path d=\"M3.5 8 12 4l8.5 4v10L12 22l-8.5-4ZM3.5 8 12 12l8.5-4M12 12v10\"/>",
  "일반쓰레기": "<path d=\"M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13.5h9l1-13.5M10 11v6M14 11v6\"/>",
  "음식물": "<path d=\"M4 11h16c-.5 5.5-3.8 9.5-8 9.5S4.5 16.5 4 11ZM12 11V8M12 8c0-2.5 1.5-4 4-4 0 2.5-1.5 4-4 4ZM12 8c0-2-1.2-3.5-3.5-3.5\"/>",
  "전용수거": "<rect x=\"7\" y=\"5.5\" width=\"10\" height=\"15.5\" rx=\"2\"/><path d=\"M10 5.5V3h4v2.5M12 10v5M9.5 12.5h5\"/>",
  "대형폐기물": "<path d=\"M6.5 11V6.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2V11M4 11h16v6H4ZM5.5 17v2.5M18.5 17v2.5M4 11a1.5 1.5 0 0 1 3 0v3M20 11a1.5 1.5 0 0 0-3 0v3\"/>",
  "재활용품": "<path d=\"M7 19.5 3.5 13.5l3-5M3.5 13.5H10M17 4.5l3.5 6-3 5M20.5 10.5H14M8 6.5 11.5 3h5.5M11.5 3l1 4.5M16 20.5h-5l-2-3.5M11 20.5l-1.5-4\"/>",
  "음식물쓰레기": "<path d=\"M4 11h16c-.5 5.5-3.8 9.5-8 9.5S4.5 16.5 4 11ZM12 11V8M12 8c0-2.5 1.5-4 4-4 0 2.5-1.5 4-4 4ZM12 8c0-2-1.2-3.5-3.5-3.5\"/>",
};

export default function CategoryIcon({ category, size = 24, color }: {
  category: string | null; size?: number; color?: string;
}) {
  const body = category ? BODY[category] : undefined;
  if (!body) return null;
  const stroke = color ?? categoryColor(category).icon;
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

// 아이콘 + 이름 배지 (카테고리 색 배경). 알 수 없는 카테고리는 이름만.
export function CategoryBadge({ category, size = "md" }: { category: string; size?: "sm" | "md" }) {
  const c = categoryColor(category);
  const small = size === "sm";
  return (
    <View accessibilityLabel={`분류 ${category}`} style={{ flexDirection: "row", alignItems: "center", gap: space.xs,
      alignSelf: "flex-start", paddingHorizontal: small ? space.sm : space.smPlus, paddingVertical: small ? 3 : space.xs + 1,
      borderRadius: radius.pill, backgroundColor: c.bg }}>
      <CategoryIcon category={category} size={small ? 15 : 18} />
      <Text style={{ ...(small ? typography.caption : typography.label), fontWeight: "700", color: c.fg }}>{category}</Text>
    </View>
  );
}
