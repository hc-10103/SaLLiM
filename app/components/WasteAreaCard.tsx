import { Linking, Pressable, Text, View } from "react-native";
import type { WasteAreaDetail } from "../lib/api-types";
import { formatWasteDays, isOldWasteData } from "../lib/wasteArea";
import { colors, radius, space, typography } from "../theme";
import CategoryIcon from "./CategoryIcon";
import { Notice } from "./ui";

const TYPES = [
  { title: "일반쓰레기", icon: "일반쓰레기", days: "general_days", start: "general_start", end: "general_end", method: "general_method" },
  { title: "음식물쓰레기", icon: "음식물", days: "food_days", start: "food_start", end: "food_end", method: "food_method" },
  { title: "재활용품", icon: "재활용품", days: "recycling_days", start: "recycling_start", end: "recycling_end", method: "recycling_method" },
] as const;

export default function WasteAreaCard({ area }: { area: WasteAreaDetail }) {
  return <View style={{ gap: space.smPlus }}>
    {isOldWasteData(area.data_date) && <Notice tone="warn" title="오래된 자료예요">
      기준일이 1년 넘게 지났어요. 배출 전 지자체의 최신 안내를 꼭 확인해 주세요.
    </Notice>}
    {(area.zone !== "없음" || area.target !== "없음") && <View style={{ gap: 2 }}>
      {area.zone !== "없음" && <Text style={{ ...typography.label, color: colors.text }}>관리구역 · {area.zone}</Text>}
      {area.target !== "없음" && <Text style={{ ...typography.caption, color: colors.subtext }}>대상 지역 · {area.target}</Text>}
    </View>}
    {TYPES.map((type) => {
      const days = area[type.days];
      const start = area[type.start];
      const end = area[type.end];
      const methodText = area[type.method]?.replace("투병한 비닐", "투명한 비닐");
      return <View key={type.title} style={{ gap: space.xs, padding: space.smPlus, borderRadius: radius.button, borderCurve: "continuous",
        borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <CategoryIcon category={type.icon} size={20} />
          <Text style={{ ...typography.bodyStrong, color: colors.text, flex: 1 }}>{type.title}</Text>
          {(start || end) && <Text style={{ ...typography.caption, color: colors.subtext }}>{start || "?"} ~ {end || "?"}</Text>}
        </View>
        <Text style={{ ...typography.label, color: colors.primary }}>{formatWasteDays(days)}</Text>
        {!!methodText && <Text style={{ ...typography.caption, color: colors.subtext }}>{methodText}</Text>}
      </View>;
    })}
    {area.place && <Text style={{ ...typography.caption, color: colors.subtext }}>배출장소 · {area.place}</Text>}
    {area.no_collection_days && <Text style={{ ...typography.caption, color: colors.warn }}>미수거일 · {area.no_collection_days}</Text>}
    <Text style={{ ...typography.caption, color: colors.subtext }}>
      공동주택·공휴일에는 다를 수 있어요. 안내가 다르면 담당 부서에 확인해 주세요.
      {area.department ? ` ${area.department}` : ""}{area.phone ? ` ${area.phone}` : ""}
    </Text>
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(area.source_url)} hitSlop={8}>
      <Text style={{ ...typography.caption, color: colors.primary }}>출처 · 행정안전부 생활쓰레기배출정보 (기준일 {area.data_date || "미표기"}) ↗</Text>
    </Pressable>
  </View>;
}
