import { Linking, Pressable, Text, View } from "react-native";
import type { WasteAreaDetail } from "../lib/api-types";
import { formatWasteDays, isOldWasteData } from "../lib/wasteArea";
import { colors, radius, space, typography } from "../theme";

const TYPES = [
  { title: "일반쓰레기", days: "general_days", start: "general_start", end: "general_end", method: "general_method" },
  { title: "음식물쓰레기", days: "food_days", start: "food_start", end: "food_end", method: "food_method" },
  { title: "재활용품", days: "recycling_days", start: "recycling_start", end: "recycling_end", method: "recycling_method" },
] as const;

export default function WasteAreaCard({ area }: { area: WasteAreaDetail }) {
  return <View style={{ gap: space.md }}>
    <View style={{ gap: space.xs, padding: space.md, borderRadius: radius.md, backgroundColor: colors.tint }}>
      <Text style={{ ...typography.section, color: colors.text }}>공식 지역 배출 요일</Text>
      {area.zone !== "없음" && <Text style={{ color: colors.subtext }}>관리구역: {area.zone}</Text>}
      {area.target !== "없음" && <Text style={{ color: colors.subtext }}>대상 지역: {area.target}</Text>}
      <Text style={{ ...typography.caption, color: colors.subtext }}>행정안전부 등록 자료 · 기준일 {area.data_date || "미표기"}</Text>
    </View>
    {isOldWasteData(area.data_date) && <Text style={{ color: colors.warn,
      backgroundColor: colors.warnBg, padding: space.md, borderRadius: radius.button }}>
      이 지역 자료는 기준일이 1년 넘게 지났어요. 배출 전 지자체의 최신 안내를 꼭 확인해 주세요.
    </Text>}
    {TYPES.map((type) => {
      const days = area[type.days];
      const start = area[type.start];
      const end = area[type.end];
      const methodText = area[type.method]?.replace("투병한 비닐", "투명한 비닐");
      return <View key={type.title} style={{ gap: space.xs, padding: space.md, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface }}>
        <Text style={{ ...typography.section, color: colors.text }}>{type.title}</Text>
        <Text style={{ ...typography.bodyStrong, color: colors.primary }}>배출 요일: {formatWasteDays(days)}</Text>
        {(start || end) && <Text style={{ color: colors.text }}>배출 시간: {start || "?"} ~ {end || "?"}</Text>}
        {!!methodText && <Text style={{ color: colors.subtext }}>{methodText}</Text>}
      </View>;
    })}
    {area.place && <Text style={{ color: colors.subtext }}>배출장소: {area.place}</Text>}
    {area.no_collection_days && <Text style={{ color: colors.warn }}>미수거일: {area.no_collection_days}</Text>}
    <Text style={{ ...typography.caption, color: colors.subtext }}>
      공동주택·공휴일에는 다를 수 있어요. 자료가 오래되었거나 안내가 다르면 담당 부서에 확인해 주세요.
      {area.department ? ` ${area.department}` : ""}{area.phone ? ` ${area.phone}` : ""}
    </Text>
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(area.source_url)}>
      <Text style={{ ...typography.caption, color: colors.primary }}>출처: 행정안전부 생활쓰레기배출정보 ↗</Text>
    </Pressable>
  </View>;
}
