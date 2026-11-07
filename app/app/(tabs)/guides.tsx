import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import GuideCard from "../../components/GuideCard";
import { GUIDE_CATEGORIES, GUIDES, type Guide, type GuideCategory } from "../../lib/guides";
import { colors, radius, space, typography } from "../../theme";

const CATEGORY_META: Record<GuideCategory, { icon: string; description: string }> = {
  "음식": { icon: "🍱", description: "보관 · 요리 · 위생" },
  "청소·세탁": { icon: "🧺", description: "세제 · 빨래 · 청소" },
  "분리배출": { icon: "♻️", description: "배달 · 포장 · 폐기" },
  "집·안전": { icon: "🏠", description: "계약 · 전기 · 에너지" },
};
const COMMON_IDS = ["expiry", "parcel-box", "laundry", "move", "leftovers", "gas"];

export default function Guides() {
  const router = useRouter();
  const [category, setCategory] = useState<GuideCategory | null>(null);
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const items = useMemo(() => GUIDES.filter((guide) =>
    (search ? `${guide.title} ${guide.summary} ${guide.steps.join(" ")} ${guide.category}`.toLowerCase().includes(search)
      : category === null || guide.category === category)), [category, search]);

  function openGuide(guide: Guide, ask = false) {
    router.push({ pathname: "/guide/[id]", params: { id: guide.id, ...(ask ? { ask: "1" } : {}) } });
  }

  return <ScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.bg }}
    contentContainerStyle={{ padding: space.page, paddingBottom: space.section, gap: space.md }}>
    <View style={{ gap: 5, paddingTop: space.sm }}>
      <Text style={{ ...typography.eyebrow, color: colors.primary }}>SALIM GUIDE</Text>
      <Text style={{ ...typography.heading, color: colors.text }}>생활 질문 찾기</Text>
      <Text style={{ ...typography.body, color: colors.subtext }}>
        자취하면서 자주 헷갈리는 내용을 {GUIDES.length}개의 짧은 질문으로 모았어요.
      </Text>
    </View>

    <View style={{ position: "relative", justifyContent: "center" }}>
      <TextInput accessibilityLabel="생활 가이드 검색" placeholder="예: 우유팩, 냉동, 세탁세제, 전구" value={query}
        onChangeText={setQuery} clearButtonMode="while-editing"
        style={{ backgroundColor: colors.surface, borderRadius: radius.button, borderWidth: 1,
          borderColor: colors.divider, paddingHorizontal: space.md, paddingRight: query ? 44 : space.md,
          minHeight: 52, color: colors.text, ...typography.body }} />
      {Boolean(query) && (
        <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => setQuery("")}
          style={{ position: "absolute", right: space.sm, padding: space.sm }}>
          <Text style={{ color: colors.subtext, fontSize: 16 }}>✕</Text>
        </Pressable>
      )}
    </View>

    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
      <Pressable accessibilityRole="button" onPress={() => setCategory(null)}
        style={{ paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill,
          backgroundColor: category === null && !search ? colors.primary : colors.surface,
          borderWidth: 1, borderColor: category === null && !search ? colors.primary : colors.divider }}>
        <Text style={{ ...typography.label, color: category === null && !search ? colors.onPrimary : colors.text }}>
          전체 {GUIDES.length}
        </Text>
      </Pressable>
      {GUIDE_CATEGORIES.map((item) => {
        const active = category === item && !search;
        const count = GUIDES.filter((g) => g.category === item).length;
        return (
          <Pressable key={item} accessibilityRole="button"
            onPress={() => { setQuery(""); setCategory(active ? null : item); }}
            style={{ paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill,
              backgroundColor: active ? colors.primary : colors.surface,
              borderWidth: 1, borderColor: active ? colors.primary : colors.divider }}>
            <Text style={{ ...typography.label, color: active ? colors.onPrimary : colors.text }}>
              {CATEGORY_META[item].icon} {item} {count}
            </Text>
          </Pressable>
        );
      })}
    </View>

    {!search && category === null && (
      <View style={{ gap: space.sm }}>
        <Text style={{ ...typography.section, color: colors.text }}>자주 궁금한 질문 TOP 6</Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.divider }}>
          {COMMON_IDS.map((id, index) => {
            const guide = GUIDES.find((item) => item.id === id);
            if (!guide) return null;
            return <Pressable key={id} accessibilityRole="button" onPress={() => openGuide(guide)}
              style={{ flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md,
                borderTopWidth: index ? 1 : 0, borderColor: colors.divider }}>
              <Text style={{ fontSize: 22 }}>{guide.icon}</Text>
              <Text style={{ flex: 1, ...typography.bodyStrong, color: colors.text }}>{guide.title}</Text>
              <Text style={{ fontSize: 22, color: colors.primary }}>›</Text>
            </Pressable>;
          })}
        </View>
      </View>
    )}

    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ ...typography.section, color: colors.text }}>
          {search ? `검색 결과 ${items.length}개` : category ? `${CATEGORY_META[category].icon} ${category} 가이드 · ${items.length}개` : `전체 가이드 · ${items.length}개`}
        </Text>
        {(Boolean(search) || category !== null) && (
          <Pressable accessibilityRole="button" onPress={() => { setQuery(""); setCategory(null); }}>
            <Text style={{ ...typography.label, color: colors.primary }}>전체 보기</Text>
          </Pressable>
        )}
      </View>
      {items.map((guide) => <GuideCard key={guide.id} guide={guide}
        onPress={() => openGuide(guide)} onAsk={() => openGuide(guide, true)} />)}
      {items.length === 0 && <View style={{ padding: space.xl, borderRadius: radius.md, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.subtext }}>찾는 내용이 없어요. 다른 단어로 검색하거나 물어보기 탭에서 직접 질문해 보세요.</Text>
      </View>}
    </View>
  </ScrollView>;
}
