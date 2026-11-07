import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import CategoryIcon from "../components/CategoryIcon";
import { ErrorBox, Loading } from "../components/Status";
import { getItems, isMock } from "../lib/api";
import type { Category, ItemSummary } from "../lib/api-types";
import { colors, radius, space, typography } from "../theme";

const CATEGORIES: Category[] = [
  "투명페트", "플라스틱", "종이", "종이팩", "캔·고철", "유리병",
  "비닐", "스티로폼", "일반쓰레기", "음식물", "전용수거", "대형폐기물",
];

export default function Items() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const selected = CATEGORIES.find((category) => category === params.category) ?? null;
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ItemSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const requestNumber = useRef(0);

  useEffect(() => { requestNumber.current = Date.now(); }, []);

  useEffect(() => {
    let active = true;
    getItems().then((result) => {
      if (active) { setItems(result); setError(null); }
    }).catch((e) => {
      if (active) setError(e instanceof Error ? e.message : "품목을 불러오지 못했어요.");
    });
    return () => { active = false; };
  }, [retry]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return (items ?? []).filter((item) => (!selected || item.category === selected) &&
      (!needle || [item.name, ...item.aliases].some((name) => name.toLocaleLowerCase().includes(needle))));
  }, [items, selected, query]);

  function ask(item: ItemSummary) {
    requestNumber.current += 1;
    router.push({ pathname: "/ask", params: {
      q: `${item.name} 어떻게 버려요?`, purpose: "recycling", requestId: String(requestNumber.current),
    } });
  }

  return <ScrollView style={{ backgroundColor: colors.bg }}
    contentContainerStyle={{ padding: space.page, paddingTop: insets.top + space.sm,
      paddingBottom: space.section, gap: space.md }}
    keyboardShouldPersistTaps="handled">
    <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
      style={{ paddingVertical: space.sm }}>
      <Text style={{ ...typography.bodyStrong, color: colors.primary }}>‹  이전 화면으로</Text>
    </Pressable>
    <Text style={{ ...typography.eyebrow, color: colors.primary }}>SaLLiM ITEMS</Text>
    <Text style={{ ...typography.heading, color: colors.text }}>버릴 물건 찾아보기</Text>
    <Text style={{ ...typography.body, color: colors.subtext }}>품목을 고르면 배출 방법과 주의할 점을 알려드려요.</Text>
    {isMock && <Text style={{ ...typography.caption, color: colors.warn }}>예시 품목만 표시 중이에요. 서버를 연결하면 전체 품목을 볼 수 있어요.</Text>}
    <TextInput value={query} onChangeText={setQuery} placeholder="물건 이름 검색 · 예: 배달 용기"
      accessibilityLabel="물건 이름 검색" autoCapitalize="none"
      style={{ minHeight: 50, paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.button, backgroundColor: colors.surface, color: colors.text }} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs }}>
      {[null, ...CATEGORIES].map((category) => {
        const active = selected === category;
        return <Pressable key={category ?? "all"} accessibilityRole="button"
          onPress={() => router.setParams({ category: category ?? "" })}
          style={{ paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill,
            borderWidth: 1, borderColor: active ? colors.primary : colors.divider,
            backgroundColor: active ? colors.primary : colors.surface }}>
          <Text style={{ ...typography.label, fontWeight: "700", color: active ? colors.onPrimary : colors.text }}>
            {category ?? "전체"}
          </Text>
        </Pressable>;
      })}
    </ScrollView>
    {error && <ErrorBox message={error} onRetry={() => { setError(null); setItems(null); setRetry((n) => n + 1); }} />}
    {!items && !error && <Loading />}
    {items && <Text style={{ ...typography.label, color: colors.subtext }}>{selected ?? "전체"} · {visible.length}개 품목</Text>}
    {items && visible.length === 0 && <View style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: space.sm }}>
      <Text style={{ ...typography.bodyStrong, color: colors.text }}>일치하는 품목이 없어요.</Text>
      <Text style={{ ...typography.label, color: colors.subtext }}>다른 이름으로 찾거나 직접 물어보세요.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push("/ask")}>
        <Text style={{ ...typography.button, color: colors.primary }}>직접 물어보기 →</Text>
      </Pressable>
    </View>}
    {visible.map((item) => <Pressable key={item.key} accessibilityRole="button" onPress={() => ask(item)}
      style={{ minHeight: 66, padding: space.md, flexDirection: "row", alignItems: "center", gap: space.md,
        borderRadius: radius.button, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface }}>
      <CategoryIcon category={item.category} size={28} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...typography.bodyStrong, color: colors.text }}>{item.name}</Text>
        <Text numberOfLines={1} style={{ ...typography.caption, color: colors.subtext }}>{item.category}{item.aliases.length ? ` · ${item.aliases.slice(0, 2).join(", ")}` : ""}</Text>
      </View>
      <Text style={{ fontSize: 22, color: colors.primary }}>›</Text>
    </Pressable>)}
  </ScrollView>;
}
