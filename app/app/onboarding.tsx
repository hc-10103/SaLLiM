import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CategoryIcon from "../components/CategoryIcon";
import Icon from "../components/Icon";
import { Button } from "../components/ui";
import { setOnboardingDone } from "../lib/onboarding";
import { getRegionId } from "../lib/region";
import { categoryColor, colors, radius, space, typography } from "../theme";

// 시안 ① 온보딩 3장. 첫 실행 때 한 번만. 화면 전환 애니메이션 없음 (expo-animation 1단계: 드물게 보는 화면이지만 장식용 모션은 생략).
const PAGES = [
  { title: "찍으면\n버리는 법이 보여요", body: "물건을 사진으로 찍으면\n올바른 분리배출 방법을 바로 알려드려요.", art: "camera" },
  { title: "순서대로,\n간단하게", body: "헹구고, 떼고, 찌그러뜨리고.\n해야 할 일을 단계별로 정리해 드려요.", art: "steps" },
  { title: "우리 동네\n기준으로", body: "동네마다 다른 배출 요일과 시간,\n공식 출처와 함께 확인하세요.", art: "region" },
] as const;

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const page = PAGES[i];
  const last = i === PAGES.length - 1;

  async function finish() {
    await setOnboardingDone().catch(() => {});
    router.replace((await getRegionId()) ? "/" : "/settings");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top + space.sm,
      paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.page }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44 }}>
        {i > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="이전" onPress={() => setI(i - 1)} hitSlop={10}
            style={{ minHeight: 44, justifyContent: "center" }}>
            <Icon name="chevronLeft" size={24} color={colors.text} />
          </Pressable>
        ) : <Text style={{ ...typography.section, fontWeight: "800", color: colors.primary }}>SaLLiM</Text>}
        {!last && <Pressable accessibilityRole="button" onPress={finish} hitSlop={10} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ ...typography.label, color: colors.subtext }}>건너뛰기</Text>
        </Pressable>}
      </View>

      <View style={{ flex: 1, justifyContent: "center", gap: space.xl }}>
        <Art kind={page.art} />
        <View style={{ gap: space.smPlus, alignItems: "center" }}>
          <Text accessibilityRole="header" style={{ ...typography.display, color: colors.text, textAlign: "center" }}>{page.title}</Text>
          <Text style={{ ...typography.body, color: colors.subtext, textAlign: "center" }}>{page.body}</Text>
        </View>
      </View>

      <View style={{ gap: space.lg }}>
        <View accessibilityLabel={`${PAGES.length}장 중 ${i + 1}번째`} style={{ flexDirection: "row", justifyContent: "center", gap: space.xs }}>
          {PAGES.map((_, n) => <View key={n} style={{ height: 8, width: n === i ? 22 : 8, borderRadius: 4,
            backgroundColor: n === i ? colors.primary : colors.tintStrong }} />)}
        </View>
        <Button label={last ? "우리 동네 고르고 시작하기" : "다음"} icon={last ? "pin" : undefined}
          onPress={() => (last ? finish() : setI(i + 1))} />
      </View>
    </View>
  );
}

function Art({ kind }: { kind: (typeof PAGES)[number]["art"] }) {
  const frame = { alignSelf: "center" as const, width: 240, height: 240, borderRadius: 120, backgroundColor: colors.tint,
    alignItems: "center" as const, justifyContent: "center" as const };
  if (kind === "camera") {
    return <View style={frame}>
      <View style={{ width: 132, height: 188, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: colors.surface,
        borderWidth: 3, borderColor: colors.primary, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }],
        boxShadow: "0 10px 24px rgba(37, 99, 235, 0.18)" }}>
        <View style={{ position: "absolute", top: 22, left: 18, width: 22, height: 22, borderTopWidth: 3, borderLeftWidth: 3, borderColor: colors.primary, borderTopLeftRadius: 6 }} />
        <View style={{ position: "absolute", bottom: 22, right: 18, width: 22, height: 22, borderBottomWidth: 3, borderRightWidth: 3, borderColor: colors.primary, borderBottomRightRadius: 6 }} />
        <CategoryIcon category="투명페트" size={72} color={colors.primary} />
      </View>
    </View>;
  }
  if (kind === "steps") {
    return <View style={frame}>
      <View style={{ width: 200, gap: space.sm, padding: space.md, borderRadius: radius.lg, borderCurve: "continuous",
        backgroundColor: colors.surface, boxShadow: "0 10px 24px rgba(37, 99, 235, 0.14)" }}>
        {["헹구기", "라벨 떼기", "찌그러뜨리기"].map((t, n) => (
          <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: n < 2 ? colors.primary : colors.tintStrong,
              alignItems: "center", justifyContent: "center" }}>
              {n < 2 ? <Icon name="check" size={16} color={colors.onPrimary} strokeWidth={2.4} />
                : <Text style={{ ...typography.caption, fontWeight: "800", color: colors.primary }}>{n + 1}</Text>}
            </View>
            <Text style={{ ...typography.label, color: colors.text }}>{t}</Text>
          </View>
        ))}
      </View>
    </View>;
  }
  const days = ["월", "화", "수", "목", "금"];
  return <View style={frame}>
    <View style={{ width: 210, gap: space.smPlus, padding: space.md, borderRadius: radius.lg, borderCurve: "continuous",
      backgroundColor: colors.surface, boxShadow: "0 10px 24px rgba(37, 99, 235, 0.14)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
        <Icon name="pin" size={18} color={colors.primary} />
        <Text style={{ ...typography.label, color: colors.text }}>우리 동네</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {days.map((d) => <View key={d} style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center",
          backgroundColor: d === "목" ? colors.primary : colors.tint }}>
          <Text style={{ ...typography.caption, fontWeight: "700", color: d === "목" ? colors.onPrimary : colors.text }}>{d}</Text>
        </View>)}
      </View>
      <View style={{ flexDirection: "row", gap: space.xs }}>
        {(["투명페트", "비닐"] as const).map((c) => <View key={c} style={{ flexDirection: "row", alignItems: "center", gap: 3,
          paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: categoryColor(c).bg }}>
          <CategoryIcon category={c} size={14} />
          <Text style={{ ...typography.caption, fontWeight: "700", color: categoryColor(c).fg }}>{c}</Text>
        </View>)}
      </View>
    </View>
  </View>;
}
