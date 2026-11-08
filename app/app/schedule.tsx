import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CategoryIcon from "../components/CategoryIcon";
import Icon from "../components/Icon";
import { Button, Card, Notice } from "../components/ui";
import { clearMySchedule, loadMySchedule, saveMySchedule, SCHEDULE_CATEGORIES, WEEK } from "../lib/mySchedule";
import { categoryColor, colors, radius, space, typography } from "../theme";

const emptyWeek = () => Object.fromEntries(WEEK.map((d) => [d, [] as string[]]));
const TIME_RE = /^([01]?\d|2[0-4]):[0-5]\d$/;

// 우리 집 배출 요일 직접 설정. 홈에서 공식 일정(base)을 넘겨받아 시작값으로 쓸 수 있다.
export default function ScheduleEdit() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { base, baseTime } = useLocalSearchParams<{ base?: string; baseTime?: string }>();
  const [week, setWeek] = useState<Record<string, string[]>>(emptyWeek);
  const [day, setDay] = useState<string>(WEEK[0]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadMySchedule().then((saved) => {
      if (saved) {
        setWeek({ ...emptyWeek(), ...saved.week });
        setStart(saved.start);
        setEnd(saved.end);
        setHasSaved(true);
      } else if (base) {
        try { setWeek({ ...emptyWeek(), ...JSON.parse(base) }); } catch { /* 시작값 없이 */ }
        const [s, e] = (baseTime ?? "").split("~").map((t) => t.trim());
        if (s && TIME_RE.test(s)) setStart(s);
        if (e && TIME_RE.test(e)) setEnd(e);
      }
      setLoaded(true);
    });
  }, [base, baseTime]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  function toggle(cat: string) {
    setWeek((w) => {
      const cur = w[day] ?? [];
      return { ...w, [day]: cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat] };
    });
  }

  function copyToWeekdays() {
    setWeek((w) => ({ ...w, ...Object.fromEntries(["월", "화", "수", "목", "금"].map((d) => [d, [...(w[day] ?? [])]])) }));
  }

  const timeError = (start && !TIME_RE.test(start)) || (end && !TIME_RE.test(end));
  const total = WEEK.reduce((n, d) => n + (week[d]?.length ?? 0), 0);

  async function save() {
    await saveMySchedule({ week, start: start.trim(), end: end.trim() });
    goBack();
  }

  async function reset() {
    await clearMySchedule();
    goBack();
  }

  const timeInput = (value: string, set: (v: string) => void, label: string) => (
    <TextInput accessibilityLabel={label} value={value} onChangeText={(v) => set(v.replace(/[^\d:]/g, "").slice(0, 5))}
      placeholder="18:00" placeholderTextColor={colors.disabledText} keyboardType="numbers-and-punctuation" maxLength={5}
      style={{ flex: 1, minWidth: 0, width: "100%", minHeight: 48, paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.border, textAlign: "center",
        backgroundColor: colors.surface, borderRadius: radius.button, borderCurve: "continuous", color: colors.text, ...typography.body }} />
  );

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.page, paddingTop: insets.top + space.sm, paddingBottom: space.section + insets.bottom, gap: space.lg }}>
      <Pressable accessibilityRole="button" accessibilityLabel="이전 화면으로" onPress={goBack} hitSlop={8}
        style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44, alignSelf: "flex-start" }}>
        <Icon name="chevronLeft" size={22} color={colors.primary} />
        <Text style={{ ...typography.label, color: colors.primary }}>이전</Text>
      </Pressable>
      <View style={{ gap: space.xs }}>
        <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.text }}>우리 집 배출 요일</Text>
        <Text style={{ ...typography.body, color: colors.subtext }}>
          아파트 단지 안내문처럼 우리 집 기준이 따로 있으면 직접 정해 두세요. 홈과 품목별 배출 안내가 이 기준으로 바뀌어요.
        </Text>
      </View>

      {/* 요일 고르기 */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {WEEK.map((d) => {
          const sel = d === day;
          const n = week[d]?.length ?? 0;
          return <Pressable key={d} accessibilityRole="tab" accessibilityState={{ selected: sel }}
            accessibilityLabel={`${d}요일, ${n}개 선택됨`} onPress={() => setDay(d)}
            style={{ alignItems: "center", gap: 4, minWidth: 40, minHeight: 56 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
              backgroundColor: sel ? colors.primary : colors.surface, borderWidth: sel ? 0 : 1, borderColor: colors.divider }}>
              <Text style={{ ...typography.label, fontWeight: "700", color: sel ? colors.onPrimary : colors.text }}>{d}</Text>
            </View>
            <Text style={{ ...typography.caption, color: n ? colors.primary : colors.disabledText }}>{n ? `${n}개` : "없음"}</Text>
          </Pressable>;
        })}
      </View>

      <Card style={{ gap: space.smPlus }}>
        <Text style={{ ...typography.section, color: colors.text }}>{day}요일에 내놓는 것</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
          {SCHEDULE_CATEGORIES.map((c) => {
            const on = (week[day] ?? []).includes(c);
            return <Pressable key={c} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={c}
              onPress={() => toggle(c)}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.smPlus, minHeight: 40,
                borderRadius: radius.pill, borderWidth: 1.5, borderColor: on ? colors.primary : colors.divider,
                backgroundColor: on ? categoryColor(c).bg : pressed ? colors.tint : colors.surface })}>
              {on ? <Icon name="check" size={14} color={colors.primary} strokeWidth={2.6} /> : <CategoryIcon category={c} size={15} />}
              <Text style={{ ...typography.label, color: on ? colors.primary : colors.text }}>{c}</Text>
            </Pressable>;
          })}
        </View>
        <Pressable accessibilityRole="button" onPress={copyToWeekdays} hitSlop={6} style={{ alignSelf: "flex-start", minHeight: 36, justifyContent: "center" }}>
          <Text style={{ ...typography.label, color: colors.primary }}>{day}요일 설정을 월~금에 똑같이 적용</Text>
        </Pressable>
      </Card>

      <Card style={{ gap: space.smPlus }}>
        <Text style={{ ...typography.section, color: colors.text }}>배출 시간 (선택)</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <View style={{ flex: 1 }}>{timeInput(start, setStart, "배출 시작 시간")}</View>
          <Text style={{ ...typography.body, color: colors.subtext }}>~</Text>
          <View style={{ flex: 1 }}>{timeInput(end, setEnd, "배출 끝 시간")}</View>
        </View>
        {timeError && <Text style={{ ...typography.caption, color: colors.error }}>18:00처럼 시:분으로 적어 주세요.</Text>}
      </Card>

      {loaded && total === 0 && <Notice tone="info">요일을 누르고 그날 내놓는 것을 골라 주세요.</Notice>}
      <View style={{ gap: space.sm }}>
        <Button label="저장하기" icon="check" disabled={!loaded || total === 0 || !!timeError} onPress={save} />
        {hasSaved && <Button label="공식 일정으로 되돌리기" icon="refresh" variant="secondary" onPress={reset} />}
      </View>
    </ScrollView>
  );
}
