import { Pressable, Text, View } from "react-native";
import type { Guide } from "../lib/guides";
import { colors, radius, shadow, space, typography } from "../theme";

export default function GuideCard({ guide, onPress, onAsk }: { guide: Guide; onPress: () => void; onAsk?: () => void }) {
  return <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, ...shadow.card }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${guide.title}, 가이드 열기`} onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md }}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.tint,
        alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 28 }}>{guide.icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ ...typography.eyebrow, color: colors.primary }}>{guide.category} · {guide.minutes}분 읽기</Text>
        <Text style={{ ...typography.bodyStrong, color: colors.text }}>{guide.title}</Text>
        <Text numberOfLines={2} style={{ ...typography.label, color: colors.subtext }}>{guide.summary}</Text>
      </View>
      <Text style={{ fontSize: 24, color: colors.primary }}>›</Text>
    </Pressable>
    {onAsk && <Pressable accessibilityRole="button" accessibilityLabel={`${guide.title}, AI에게 질문하기`} onPress={onAsk}
      style={{ borderTopWidth: 1, borderColor: colors.divider, marginHorizontal: space.md,
        paddingVertical: space.smPlus, alignItems: "center" }}>
      <Text style={{ ...typography.label, color: colors.primary }}>✦ 내 상황 AI에게 질문하기  ›</Text>
    </Pressable>}
  </View>;
}
