import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon, { type IconName } from "../../components/Icon";
import { ErrorBox, Loading } from "../../components/Status";
import { Button, Card, Chip, Notice, ScreenTitle, SectionHeader } from "../../components/ui";
import { searchWasteAreas } from "../../lib/api";
import type { WasteAreaSearch, WasteAreaSummary } from "../../lib/api-types";
import { setRegionSelection, type RegionSelection } from "../../lib/region";
import { useRegionSelection } from "../../lib/useRegion";
import { isOldWasteData } from "../../lib/wasteArea";
import { colors, radius, sizes, space, typography } from "../../theme";

const knownTarget = (value: string) => value && value !== "없음";
const QUICK_REGIONS = ["서울 관악구", "서울 마포구", "서울 강남구", "서울 서초구", "서울 성동구", "포항시"];
const APP_VERSION = "1.0.0";

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const saved = useRegionSelection();
  const [selected, setSelected] = useState<RegionSelection | null>(null);
  const [input, setInput] = useState("");
  const [results, setResults] = useState<WasteAreaSearch | null>(null);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openInfo, setOpenInfo] = useState<string | null>(null);
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
      router.replace("/");
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

  const INFO: { key: string; icon: IconName; title: string; body: string }[] = [
    { key: "source", icon: "book", title: "데이터 출처 안내",
      body: "배출 요일은 행정안전부 생활쓰레기배출정보, 품목별 방법은 기후에너지환경부·한국환경공단 분리배출 지침과 지자체 공지를 바탕으로 해요. 결과마다 출처와 기준일을 함께 보여드려요." },
    { key: "disclaimer", icon: "info", title: "면책 및 유의사항",
      body: "공동주택·공휴일·지자체 사정에 따라 실제 일정이 다를 수 있어요. 최종 기준은 거주지 지자체와 단지 안내문이에요. AI 생활 팁은 참고용이에요." },
    { key: "privacy", icon: "shield", title: "개인정보 안내",
      body: "선택한 동네와 최근 질문 10개는 이 기기에만 저장돼요. 질문과 사진은 답을 만들기 위해 서버와 AI 분석 서비스로 보내질 수 있어요." },
  ];

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: space.page, paddingTop: insets.top + space.sm, paddingBottom: space.section, gap: space.lg }}>
      <ScreenTitle title="설정" />

      {/* 내 동네 */}
      <View style={{ gap: space.smPlus }}>
        <SectionHeader title="우리 동네" />
        {current ? <Card style={{ gap: space.smPlus }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.smPlus }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="pin" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.caption, color: colors.subtext }}>현재 선택한 지역</Text>
              <Text style={{ ...typography.bodyStrong, color: colors.text }}>{current.name}</Text>
            </View>
          </View>
          <Notice tone={current.areaId ? "success" : "info"}>
            {current.areaId ? "공식 배출 요일이 연결됐어요" : "전국 공통 안내를 쓰고 있어요 (배출 요일 없음)"}
          </Notice>
          <Button label="홈에서 일정 보기" variant="soft" icon="calendar" onPress={() => router.replace("/")} />
        </Card> : <Notice tone="warn" title="동네를 골라 주세요">아래에서 시·군·구를 검색하면 배출 요일까지 알려드려요.</Notice>}
      </View>

      {/* 검색 */}
      <View style={{ gap: space.smPlus }}>
        <SectionHeader title={current ? "동네 바꾸기" : "동네 찾기"} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md,
          minHeight: sizes.inputMinHeight, borderRadius: radius.button, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
          <Icon name="search" size={20} color={colors.subtext} />
          <TextInput value={input} onChangeText={(value) => { setInput(value); setResults(null); }}
            placeholder="예: 서울 마포구, 서초구 방배2동" placeholderTextColor={colors.disabledText} accessibilityLabel="내 지역 검색"
            maxLength={80} autoCorrect={false} onSubmitEditing={() => search()} returnKeyType="search"
            style={{ flex: 1, minHeight: 44, color: colors.text, ...typography.body }} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {QUICK_REGIONS.map((item) => <Chip key={item} label={item} onPress={() => search(item)} />)}
        </View>
        <Button label="공식 배출 요일 찾기" icon="search" onPress={() => search()} disabled={searching || query.length < 2} loading={searching} />
        {searching && <Loading label="지역을 찾고 있어요" />}
        {searchErr && <ErrorBox message={searchErr} onRetry={() => search()} />}
        {results && <View style={{ gap: space.sm }}>
          <Text style={{ ...typography.label, color: colors.text }}>
            검색 결과 {results.total}개{results.total > results.items.length ? ` · ${results.items.length}개 표시` : ""}
          </Text>
          {results.total > results.items.length && <Notice tone="warn">결과가 많아요. 읍·면·동 이름까지 입력해 주세요.</Notice>}
          {results.total === 0 && <Notice tone="info">등록된 배출정보가 없어요. 철자를 확인하거나 전국 공통 안내를 선택해 주세요.</Notice>}
          {results.items.map((area) => {
            const on = current?.areaId === area.id;
            return <Pressable key={area.id} accessibilityRole="radio" accessibilityState={{ selected: on, disabled: saving }}
              disabled={saving} onPress={() => chooseArea(area)}
              style={({ pressed }) => ({ flexDirection: "row", gap: space.smPlus, padding: space.md, borderRadius: radius.lg, borderCurve: "continuous",
                borderWidth: on ? 1.5 : 1, borderColor: on ? colors.primary : colors.divider,
                backgroundColor: pressed ? colors.tint : colors.surface })}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 0 : 1.5, borderColor: colors.border, marginTop: 1,
                backgroundColor: on ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                {on && <Icon name="check" size={14} color={colors.onPrimary} strokeWidth={2.5} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ ...typography.bodyStrong, color: colors.text }}>{area.city} {area.district}</Text>
                {knownTarget(area.zone) && <Text style={{ ...typography.caption, color: colors.subtext }}>관리구역 · {area.zone}</Text>}
                {knownTarget(area.target) && <Text style={{ ...typography.caption, color: colors.subtext }} numberOfLines={3}>대상 · {area.target}</Text>}
                <Text style={{ ...typography.caption, color: isOldWasteData(area.data_date) ? colors.warn : colors.subtext }}>
                  자료 기준일 {area.data_date || "미표기"}{isOldWasteData(area.data_date) ? " · 1년 넘게 지난 자료" : ""}
                </Text>
              </View>
            </Pressable>;
          })}
          <Text style={{ ...typography.caption, color: colors.subtext }}>
            행정안전부 생활쓰레기배출정보 · 내려받은 날 {results.downloaded_on}
          </Text>
        </View>}
        {saveErr && <ErrorBox message={saveErr} />}
        <Button label="요일 없이 전국 공통 안내 쓰기" variant="text" disabled={saving}
          onPress={() => choose({ id: "nationwide", name: "전국 공통 안내" })} />
      </View>

      {/* 앱 정보 */}
      <View style={{ gap: space.smPlus }}>
        <SectionHeader title="앱 정보" />
        <Card padded={false}>
          {INFO.map((row, index) => {
            const open = openInfo === row.key;
            return <View key={row.key} style={{ borderTopWidth: index ? 1 : 0, borderColor: colors.divider }}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
                onPress={() => setOpenInfo(open ? null : row.key)}
                style={{ flexDirection: "row", alignItems: "center", gap: space.smPlus, minHeight: 56, paddingHorizontal: space.md }}>
                <Icon name={row.icon} size={20} color={colors.subtext} />
                <Text style={{ flex: 1, ...typography.label, color: colors.text }}>{row.title}</Text>
                <Icon name={open ? "chevronUp" : "chevronDown"} size={18} color={colors.subtext} />
              </Pressable>
              {open && <Text style={{ ...typography.caption, color: colors.subtext, paddingHorizontal: space.md, paddingBottom: space.md }}>{row.body}</Text>}
            </View>;
          })}
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.smPlus, minHeight: 56, paddingHorizontal: space.md,
            borderTopWidth: 1, borderColor: colors.divider }}>
            <Icon name="info" size={20} color={colors.subtext} />
            <Text style={{ flex: 1, ...typography.label, color: colors.text }}>앱 버전</Text>
            <Text style={{ ...typography.label, color: colors.subtext }}>v{APP_VERSION}</Text>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
