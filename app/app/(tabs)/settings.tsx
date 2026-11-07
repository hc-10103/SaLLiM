import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Btn, ErrorBox, Loading } from "../../components/Status";
import { searchWasteAreas } from "../../lib/api";
import type { WasteAreaSearch, WasteAreaSummary } from "../../lib/api-types";
import { setRegionSelection, type RegionSelection } from "../../lib/region";
import { useRegionSelection } from "../../lib/useRegion";
import { isOldWasteData } from "../../lib/wasteArea";
import { colors, radius, sizes, space, typography } from "../../theme";

const knownTarget = (value: string) => value && value !== "없음";
const QUICK_REGIONS = ["서울 관악구", "서울 마포구", "서울 강남구", "서울 서초구", "서울 성동구", "포항시"];

export default function Settings() {
  const router = useRouter();
  const saved = useRegionSelection();
  const [selected, setSelected] = useState<RegionSelection | null>(null);
  const [input, setInput] = useState("");
  const [results, setResults] = useState<WasteAreaSearch | null>(null);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = selected ?? saved;
  const query = input.trim().replace(/\s+/g, " ");

  async function search(customQuery?: string) {
    const targetQuery = (customQuery ?? query).trim().replace(/\s+/g, " ");
    if (targetQuery.length < 2 || searching) return;
    if (customQuery !== undefined) setInput(customQuery);
    setSearching(true);
    setSearchErr(null);
    setResults(null);
    try {
      setResults(await searchWasteAreas(targetQuery));
    } catch (error) {
      setSearchErr(error instanceof Error ? error.message : "지역 정보를 가져오지 못했어요.");
    } finally {
      setSearching(false);
    }
  }

  async function choose(selection: RegionSelection) {
    if (saving) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await setRegionSelection(selection);
      setSelected(selection);
      setInput("");
      setResults(null);
    } catch {
      setSaveErr("지역을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  function chooseArea(area: WasteAreaSummary) {
    const id = area.city === "서울특별시" && area.district === "관악구" ? "seoul-gwanak" : "nationwide";
    const zoneSuffix = knownTarget(area.zone) && area.zone !== area.district ? ` (${area.zone})` : "";
    choose({ id, name: `${area.city} ${area.district}${zoneSuffix}`, areaId: area.id });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.page, paddingBottom: space.section, gap: space.md }} style={{ backgroundColor: colors.bg }}
      keyboardShouldPersistTaps="handled">
      <Text style={{ ...typography.eyebrow, color: colors.primary }}>MY NEIGHBORHOOD</Text>
      <Text style={{ ...typography.heading, color: colors.text }}>내 동네, 내 배출 요일</Text>
      {current && <View style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.tint, gap: space.xs }}>
        <Text style={{ color: colors.subtext }}>현재 선택한 지역</Text>
        <Text style={{ ...typography.section, color: colors.text }}>{current.name}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
          <Text style={{ color: colors.subtext }}>{current.areaId ? "✓ 공식 배출정보 연결됨" : "전국 공통 안내 적용 중"}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace("/")}
            style={{ paddingVertical: space.xs, paddingHorizontal: space.smPlus, borderRadius: radius.pill, backgroundColor: colors.primary }}>
            <Text style={{ ...typography.caption, fontWeight: "700", color: colors.onPrimary }}>홈에서 일정 보기 ›</Text>
          </Pressable>
        </View>
      </View>}
      <Text style={{ ...typography.body, color: colors.subtext }}>
        시·군·구를 검색하고, 결과가 여러 개면 거주하는 동이나 관리구역을 골라 주세요.
      </Text>
      <Text style={{ ...typography.label, color: colors.text }}>내 지역 검색</Text>
      <TextInput value={input} onChangeText={(value) => { setInput(value); setResults(null); }}
        placeholder="예: 서울 마포구, 서초구 방배2동" accessibilityLabel="내 지역 검색"
        maxLength={80} autoCorrect={false} onSubmitEditing={() => search()} returnKeyType="search"
        style={{ minHeight: sizes.inputMinHeight, padding: space.md, borderWidth: 1, borderColor: colors.border,
          borderRadius: radius.button, backgroundColor: colors.surface, color: colors.text }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
        {QUICK_REGIONS.map((item) => (
          <Pressable key={item} accessibilityRole="button" onPress={() => search(item)}
            style={{ paddingHorizontal: space.smPlus, paddingVertical: space.xs, borderRadius: radius.pill,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider }}>
            <Text style={{ ...typography.caption, color: colors.subtext }}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <Btn label="공식 배출 요일 찾기" onPress={() => search()} disabled={searching || query.length < 2} />
      {searching && <Loading />}
      {searchErr && <ErrorBox message={searchErr} onRetry={() => search()} />}
      {results && <>
        <Text style={{ ...typography.label, color: colors.text }}>
          검색 결과 {results.total}개{results.total > results.items.length ? ` · ${results.items.length}개 표시` : ""}
        </Text>
        {results.total > results.items.length && <Text style={{ color: colors.warn }}>
          결과가 많아요. 읍·면·동 이름까지 입력해 주세요.
        </Text>}
        {results.total === 0 && <Text style={{ color: colors.subtext }}>
          등록된 배출정보가 없어요. 지역명 철자를 확인하거나 전국 공통 안내를 선택해 주세요.
        </Text>}
        {results.items.map((area) => (
          <TouchableOpacity key={area.id} accessibilityRole="button" disabled={saving}
            onPress={() => chooseArea(area)}
            style={{ padding: space.md, gap: space.xs, borderWidth: 1, borderRadius: radius.button,
              borderColor: current?.areaId === area.id ? colors.primary : colors.border,
              backgroundColor: colors.surface }}>
            <Text style={{ ...typography.bodyStrong, color: colors.text }}>
              {area.city} {area.district}{current?.areaId === area.id ? " ✓" : ""}
            </Text>
            {knownTarget(area.zone) && <Text style={{ color: colors.subtext }}>관리구역: {area.zone}</Text>}
            {knownTarget(area.target) && <Text style={{ color: colors.subtext }} numberOfLines={3}>
              대상: {area.target}
            </Text>}
            <Text style={{ ...typography.caption, color: colors.subtext }}>자료 기준일 {area.data_date || "미표기"}</Text>
            {isOldWasteData(area.data_date) && <Text style={{ color: colors.warn }}>
              기준일이 1년 넘게 지났어요 · 최신 지자체 안내 확인 필요
            </Text>}
          </TouchableOpacity>
        ))}
        <Text style={{ ...typography.caption, color: colors.subtext }}>
          행정안전부 생활쓰레기배출정보 · 내려받은 날 {results.downloaded_on}
        </Text>
      </>}
      {saveErr && <ErrorBox message={saveErr} />}
      <Text style={{ ...typography.caption, color: colors.subtext }}>
        공동주택·공휴일은 실제 배출 일정이 다를 수 있어요. 최신 공지는 거주지 지자체나 단지 안내문을 확인해 주세요.
      </Text>
      <Btn label="지역별 요일 없이 전국 공통 안내 사용"
        onPress={() => choose({ id: "nationwide", name: "전국 공통 안내" })} disabled={saving} />
    </ScrollView>
  );
}
