import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ResultCard from "../../components/ResultCard";
import Icon from "../../components/Icon";
import { ErrorBox, Loading } from "../../components/Status";
import { Button, Notice } from "../../components/ui";
import { followUp } from "../../lib/api";
import type { AskResponse, ItemState } from "../../lib/api-types";
import { getItemFavorite, removeFavorite, saveItemFavoriteResult, type Favorite } from "../../lib/favorites";
import { useRegionSelection } from "../../lib/useRegion";
import { colors, space, typography } from "../../theme";

type ItemFavorite = Extract<Favorite, { kind: "item" }>;

function answeredState(result?: AskResponse): ItemState {
  const state = result?.answered_state;
  if (!state) return {};
  return Object.fromEntries(Object.entries(state).filter(([, value]) => typeof value === "boolean")) as ItemState;
}

export default function FavoriteItem() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const region = useRegionSelection();
  const regionId = region === null ? "nationwide" : region?.id;
  const areaId = region?.areaId;
  const [favorite, setFavorite] = useState<ItemFavorite | null | undefined>(undefined);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key || !regionId) return;
    let active = true;
    getItemFavorite(key).then(async (saved) => {
      if (!active) return;
      setBusy(true);
      setError(null);
      setFavorite(saved ?? null);
      if (!saved) return;
      const currentArea = !!saved.result && saved.regionId === regionId && saved.areaId === areaId;
      setResult(currentArea ? saved.result ?? null : null);
      if (currentArea) return;
      try {
        const updated = await followUp({ region_id: regionId, area_id: areaId,
          item_key: key, state: answeredState(saved.result) });
        if (!active) return;
        setResult(updated);
        await saveItemFavoriteResult(key, updated, regionId, areaId);
      } catch (e) {
        if (active) {
          setResult(saved.result ?? null);
          setError(saved.result
            ? "현재 지역의 안내를 확인하지 못했어요. 아래 내용은 저장 당시 지역 기준이에요."
            : e instanceof Error ? e.message : "저장한 품목을 불러오지 못했어요.");
        }
      }
    }).catch((e) => {
      if (active) setError(e instanceof Error ? e.message : "즐겨찾기를 불러오지 못했어요.");
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [key, regionId, areaId]);

  function updateResult(updated: AskResponse) {
    setResult(updated);
    if (key && regionId) void saveItemFavoriteResult(key, updated, regionId, areaId).catch(() => {
      setError("새 답변을 즐겨찾기에 저장하지 못했어요.");
    });
  }

  async function remove() {
    if (!key) return;
    try {
      await removeFavorite({ kind: "item", key });
      router.replace("/favorites");
    } catch {
      setError("즐겨찾기에서 빼지 못했어요. 다시 시도해 주세요.");
    }
  }

  return <ScrollView style={{ backgroundColor: colors.bg }}
    contentContainerStyle={{ padding: space.page, paddingTop: insets.top + space.sm,
      paddingBottom: space.section, gap: space.md }}>
    <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/favorites")} hitSlop={8}
      style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", minHeight: 44 }}>
      <Icon name="chevronLeft" size={22} color={colors.primary} />
      <Text style={{ ...typography.label, color: colors.primary }}>이전</Text>
    </Pressable>
    <View style={{ gap: space.xs }}>
      <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.text }}>{favorite?.name ?? "저장한 물건"}</Text>
    </View>
    {favorite === undefined && !error && <Loading label="저장한 안내를 불러오는 중이에요" />}
    {favorite === null && <Notice tone="info">즐겨찾기에서 이 품목을 찾지 못했어요.</Notice>}
    {result && regionId && <ResultCard result={result} regionId={regionId} areaId={areaId}
      onChange={updateResult} showBookmark={false} />}
    {busy && favorite && <Loading label="현재 지역 기준으로 확인하고 있어요" />}
    {error && <ErrorBox message={error} />}
    {favorite && <Button label="즐겨찾기에서 빼기" icon="bookmark" variant="secondary" onPress={() => { void remove(); }} />}
  </ScrollView>;
}
