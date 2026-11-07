import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GuideCard from "../components/GuideCard";
import Icon from "../components/Icon";
import { Chip, ScreenTitle } from "../components/ui";
import { GUIDES, GUIDE_CATEGORIES, type GuideCategory } from "../lib/guides";
import { colors, radius, space, typography } from "../theme";

export default function Guides() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<GuideCategory | null>(null);
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const term = query.trim().toLowerCase();
    return GUIDES.filter((guide) => (!category || guide.category === category) &&
      (!term || `${guide.title} ${guide.summary} ${guide.category} ${guide.steps.join(" ")}`.toLowerCase().includes(term)));
  }, [category, query]);

  return <ScrollView style={{ backgroundColor: colors.bg }} keyboardShouldPersistTaps="handled"
    contentContainerStyle={{ padding: space.page, paddingTop: insets.top + space.sm, paddingBottom: space.section, gap: space.lg }}>
    <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} hitSlop={8}
      style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", minHeight: 44 }}>
      <Icon name="chevronLeft" size={22} color={colors.primary} />
      <Text style={{ ...typography.label, color: colors.primary }}>돌아가기</Text>
    </Pressable>
    <ScreenTitle title="생활 가이드" subtitle="자취하면서 자주 만나는 문제를 주제별로 찾아보세요." />
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md,
      minHeight: 52, borderRadius: radius.button, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
      <Icon name="search" size={20} color={colors.subtext} />
      <TextInput value={query} onChangeText={setQuery} placeholder="궁금한 상황 검색" accessibilityLabel="생활 가이드 검색"
        placeholderTextColor={colors.disabledText} style={{ flex: 1, minHeight: 44, ...typography.body, color: colors.text }} />
    </View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
      <Chip label="전체" selected={!category} onPress={() => setCategory(null)} />
      {GUIDE_CATEGORIES.map((item) => <Chip key={item} label={item} selected={category === item}
        onPress={() => setCategory(item)} />)}
    </View>
    <View style={{ gap: space.xs }}>
      <Text style={{ ...typography.caption, color: colors.subtext }}>가이드 {items.length}개</Text>
      {items.map((guide) => <GuideCard key={guide.id} guide={guide}
        onPress={() => router.push({ pathname: "/guide/[id]", params: { id: guide.id } })}
        onAsk={() => router.push({ pathname: "/guide/[id]", params: { id: guide.id, ask: "1" } })} />)}
      {!items.length && <Text style={{ ...typography.body, color: colors.subtext, paddingVertical: space.lg }}>
        맞는 가이드가 없어요. 물어보기에서 상황을 직접 질문해 주세요.
      </Text>}
    </View>
  </ScrollView>;
}
