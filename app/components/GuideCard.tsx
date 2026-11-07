import { Pressable, Text, View } from "react-native";
import type { Guide } from "../lib/guides";
import { colors, radius, space, typography } from "../theme";
import GuideIcon, { GUIDE_TONE } from "./GuideIcon";
import Icon from "./Icon";

// 카드 테두리·그림자 없이 여백으로 구분하는 목록 행 (큰 썸네일 + 굵은 제목 + 회색 설명 + 작은 태그)
export default function GuideCard({ guide, onPress, onAsk }: { guide: Guide; onPress: () => void; onAsk?: () => void }) {
  const tone = GUIDE_TONE[guide.category];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${guide.title}, 가이드 열기`} onPress={onPress}
        style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: space.md,
          paddingVertical: space.smPlus, opacity: pressed ? 0.6 : 1 })}>
        <GuideIcon id={guide.id} category={guide.category} size={76} />
        <View style={{ flex: 1, gap: 5 }}>
          <Text numberOfLines={2} style={{ fontSize: 16, lineHeight: 22, fontWeight: "700", letterSpacing: -0.3, color: colors.text }}>
            {guide.title}
          </Text>
          <Text numberOfLines={1} style={{ ...typography.caption, color: colors.subtext }}>{guide.summary}</Text>
          <View style={{ flexDirection: "row", gap: space.xs }}>
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.xs, borderCurve: "continuous", backgroundColor: tone.bg }}>
              <Text style={{ fontSize: 11, lineHeight: 16, fontWeight: "700", color: tone.fg }}>{guide.category}</Text>
            </View>
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.xs, borderCurve: "continuous", backgroundColor: "#EEF1F5" }}>
              <Text style={{ fontSize: 11, lineHeight: 16, fontWeight: "600", color: colors.subtext }}>{guide.minutes}분 읽기</Text>
            </View>
          </View>
        </View>
      </Pressable>
      {onAsk && (
        <Pressable accessibilityRole="button" accessibilityLabel={`${guide.title}, AI에게 내 상황 질문하기`} onPress={onAsk}
          hitSlop={6} style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center",
            borderRadius: 22, backgroundColor: pressed ? colors.tint : "transparent" })}>
          <Icon name="sparkle" size={22} color={colors.subtext} strokeWidth={1.6} />
        </Pressable>
      )}
    </View>
  );
}
