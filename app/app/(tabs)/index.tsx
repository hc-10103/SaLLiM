import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CategoryIcon from "../../components/CategoryIcon";
import Icon from "../../components/Icon";
import Thumb from "../../components/Thumb";
import MemoCard from "../../components/MemoCard";
import { photoForCategory } from "../../lib/photos";
import { useFavorites } from "../../lib/favorites";
import { ErrorBox, Loading } from "../../components/Status";
import { Button, Card, Notice, SectionHeader } from "../../components/ui";
import WasteAreaCard from "../../components/WasteAreaCard";
import { getSchedule, getWasteArea, isMock } from "../../lib/api";
import type { ScheduleResponse, WasteAreaDetail } from "../../lib/api-types";
import { useRegionSelection } from "../../lib/useRegion";
import { isOldWasteData } from "../../lib/wasteArea";
import { scheduleTime, useMySchedule } from "../../lib/mySchedule";
import { categoryColor, colors, radius, shadow, space, typography } from "../../theme";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const JS_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const splitDays = (raw: string) => raw.split("+").map((s) => s.trim());

// 요일별 내놓는 품목: 동네 상세 일정(weekly)이 있으면 그것, 없으면 행안부 관리구역의 3분류
function categoriesFor(day: string, weekly: ScheduleResponse | null, hasWeek: boolean, area: WasteAreaDetail | null) {
  if (weekly && hasWeek) return weekly.week[day] ?? [];
  if (!area) return [];
  const out: string[] = [];
  if (splitDays(area.general_days).includes(day)) out.push("일반쓰레기");
  if (splitDays(area.food_days).includes(day)) out.push("음식물쓰레기");
  if (splitDays(area.recycling_days).includes(day)) out.push("재활용품");
  return out;
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const region = useRegionSelection();
  const regionId = region?.id;
  const areaId = region?.areaId;
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [official, setOfficial] = useState<WasteAreaDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [weekOpen, setWeekOpen] = useState(false); // 히어로를 누르면 이번 주 배출 요일을 펼친다
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const favItems = useFavorites().filter((f) => f.kind === "item");
  const { schedule: mine } = useMySchedule();

  const load = useCallback(() => {
    if (!regionId || (regionId === "nationwide" && !areaId)) return;
    if (areaId) {
      getWasteArea(areaId).then((value) => { setOfficial(value); setError(null); })
        .catch((e) => setError(e.message ?? "정보를 가져오지 못했어요"));
    }
    if (regionId !== "nationwide") {
      getSchedule(regionId).then((value) => { setSchedule(value); setError(null); })
        .catch((e) => { if (!areaId) setError(e.message ?? "정보를 가져오지 못했어요"); });
    }
  }, [regionId, areaId]);
  useEffect(load, [load]);

  const area = official?.id === areaId ? official : null;
  const weekly = regionId !== "nationwide" && schedule?.region_id === regionId ? schedule : null;
  const hasWeek = weekly ? Object.values(weekly.week).some((items) => items.length > 0) : false;
  const today = weekly?.today || JS_WEEKDAYS[new Date().getDay()];
  // 직접 설정한 우리 집 일정이 있으면 공식 일정보다 우선
  const officialCats = (day: string) => categoriesFor(day, weekly, hasWeek, area);
  const catsFor = (day: string) => (mine ? mine.week[day] ?? [] : officialCats(day));
  const hasOfficial = !!area || (!!weekly && hasWeek);
  const hasSchedule = !!mine || hasOfficial;
  const todayCats = catsFor(today);
  const officialTime = weekly?.time || (area && (area.general_start || area.general_end)
    ? `${area.general_start || "?"} ~ ${area.general_end || "?"}` : null);
  const time = mine ? scheduleTime(mine) : officialTime;
  const selectedDay = picked ?? today;
  const selectedCats = catsFor(selectedDay);
  const loading = !mine && region && regionId !== "nationwide" && !area && !weekly && !error;
  function editSchedule() {
    const base = hasOfficial ? JSON.stringify(Object.fromEntries(DAYS.map((d) => [d, officialCats(d)]))) : undefined;
    router.push({ pathname: "/schedule", params: { ...(base ? { base } : {}), ...(officialTime ? { baseTime: officialTime } : {}) } });
  }

  return <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.page,
    paddingTop: insets.top + space.sm, paddingBottom: space.section, gap: space.lg }}>
    {/* 헤더 */}
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`지역 변경, 현재 ${region?.name ?? "미선택"}`}
        onPress={() => router.push("/settings")} hitSlop={6}
        style={{ flexDirection: "row", alignItems: "center", gap: space.xs, maxWidth: "72%", minHeight: 44 }}>
        <Icon name="pin" size={20} color={colors.primary} />
        <Text numberOfLines={1} style={{ ...typography.bodyStrong, color: colors.text, flexShrink: 1 }}>{region?.name || "내 지역 설정"}</Text>
        <Icon name="chevronDown" size={18} color={colors.subtext} />
      </Pressable>
      <Text style={{ ...typography.section, fontWeight: "800", color: colors.primary, letterSpacing: -0.4 }}>SaLLiM</Text>
    </View>

    {/* 오늘 배출 히어로 */}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: weekOpen }}
      accessibilityLabel={weekOpen ? "이번 주 배출 요일 접기" : "이번 주 배출 요일 보기"}
      onPress={() => setWeekOpen((v) => !v)}
      style={({ pressed }) => ({ borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: colors.primary, padding: space.lg, gap: space.md,
      overflow: "hidden", boxShadow: shadow.raised, opacity: pressed ? 0.94 : 1 })}>
      <View style={{ position: "absolute", right: -40, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: "#3B82F6" }} />
      <View style={{ position: "absolute", right: 30, top: 70, width: 90, height: 90, borderRadius: 45, backgroundColor: "#60A5FA55" }} />
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.sm }}>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Text style={{ ...typography.label, color: "#DBEAFE" }}>오늘의 배출</Text>
          <Text style={{ ...typography.display, color: colors.onPrimary }}>오늘은 {today}요일</Text>
        </View>
        {/* 자취 생활 가이드 — 작은 노란 버튼 */}
        <Pressable accessibilityRole="button" accessibilityLabel="자취 생활 가이드 보기" onPress={() => router.push("/guides")}
          hitSlop={6} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.smPlus,
            minHeight: 36, borderRadius: radius.pill, backgroundColor: pressed ? "#FCD34D" : "#FDE68A", marginBottom: 4 })}>
          <Icon name="book" size={16} color="#78350F" />
          <Text style={{ ...typography.caption, fontWeight: "800", color: "#78350F" }}>자취 가이드</Text>
        </Pressable>
      </View>
      {loading ? <Text style={{ ...typography.label, color: "#DBEAFE" }}>일정을 불러오고 있어요…</Text>
        : hasSchedule ? (
          <View style={{ gap: space.sm }}>
            <Text style={{ ...typography.bodyStrong, color: colors.onPrimary }}>
              {todayCats.length ? "오늘 내놓을 수 있어요" : "오늘은 정기 배출이 없는 날이에요"}
            </Text>
            {todayCats.length > 0 && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
              {todayCats.map((c) => <View key={c} style={{ flexDirection: "row", alignItems: "center", gap: 4,
                paddingHorizontal: space.sm + 2, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surface }}>
                <CategoryIcon category={c} size={15} />
                <Text style={{ ...typography.caption, fontWeight: "700", color: categoryColor(c).fg }}>{c}</Text>
              </View>)}
            </View>}
            {time && <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: 2 }}>
              <Icon name="clock" size={16} color="#DBEAFE" />
              <Text style={{ ...typography.label, color: colors.onPrimary }}>배출 시간 {time}</Text>
            </View>}
          </View>
        ) : (
          <Text style={{ ...typography.label, fontWeight: "500", color: "#DBEAFE" }}>
            {region?.id === "nationwide" && !areaId ? "동네를 검색하면 공식 배출 요일을 볼 수 있어요." : "내 지역을 고르면 배출 요일을 알려드려요."}
          </Text>
        )}
      {isMock && <Text style={{ ...typography.caption, color: "#FDE68A" }}>예시 데이터 · 실제 배출 요일이 아니에요</Text>}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-end" }}>
        <Text style={{ ...typography.caption, fontWeight: "700", color: "#DBEAFE" }}>
          {mine ? "우리 집 기준 · " : ""}{weekOpen ? "접기" : "이번 주 보기"}
        </Text>
        <Icon name={weekOpen ? "chevronUp" : "chevronDown"} size={16} color="#DBEAFE" />
      </View>
    </Pressable>

    {/* 이번 주 배출 요일 */}
    {weekOpen && <View style={{ gap: space.smPlus, marginTop: -space.sm }}>
      {!hasSchedule && !loading && !error && <Card style={{ gap: space.smPlus }}>
        <Text style={{ ...typography.bodyStrong, color: colors.text }}>아직 배출 요일 정보가 없어요</Text>
        <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext }}>동네를 고르면 공식 일정을, 아파트처럼 따로 정해져 있으면 직접 설정할 수 있어요.</Text>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Button label="동네 고르기" icon="pin" variant="secondary" style={{ flex: 1 }} onPress={() => router.push("/settings")} />
          <Button label="직접 설정" icon="calendar" variant="secondary" style={{ flex: 1 }} onPress={editSchedule} />
        </View>
      </Card>}
      {loading && <Loading label="일정을 불러오는 중이에요" />}
      {error && <ErrorBox message={error} onRetry={() => { setError(null); load(); }} />}
      {hasSchedule && <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {DAYS.map((day) => {
            const isToday = day === today;
            const isSel = day === selectedDay;
            const has = catsFor(day).length > 0;
            return <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: isSel }}
              accessibilityLabel={`${day}요일${isToday ? ", 오늘" : ""}${has ? "" : ", 배출 없음"}`}
              onPress={() => setPicked(day)} style={{ alignItems: "center", gap: 4, minWidth: 40, minHeight: 56 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center",
                backgroundColor: isSel ? colors.primary : isToday ? colors.primarySoft : "transparent",
                borderWidth: isSel || isToday ? 0 : 1, borderColor: colors.divider }}>
                <Text style={{ ...typography.label, fontWeight: "700", color: isSel ? colors.onPrimary : isToday ? colors.primary : colors.text }}>{day}</Text>
              </View>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: has ? (isSel ? colors.primary : "#93C5FD") : "transparent" }} />
            </Pressable>;
          })}
        </View>
        <View style={{ gap: space.sm }}>
          <Text style={{ ...typography.label, color: colors.subtext }}>{selectedDay}요일{selectedDay === today ? " (오늘)" : ""}</Text>
          {selectedCats.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
            {selectedCats.map((c) => <View key={c} style={{ flexDirection: "row", alignItems: "center", gap: 4,
              paddingHorizontal: space.sm + 2, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: categoryColor(c).bg }}>
              <CategoryIcon category={c} size={15} />
              <Text style={{ ...typography.caption, fontWeight: "700", color: categoryColor(c).fg }}>{c}</Text>
            </View>)}
          </View> : <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext }}>정기 배출 품목이 없어요</Text>}
        </View>
        {mine ? <Text style={{ ...typography.caption, color: colors.subtext }}>
          직접 설정한 우리 집 일정이에요{time ? ` · 배출 시간 ${time}` : ""}
        </Text> : <>
        {regionId === "seoul-gwanak" && <Notice tone="info">투명페트·비닐은 목요일에만 내놓아요.</Notice>}
        {weekly?.note && <Text style={{ ...typography.caption, color: colors.subtext }}>{weekly.note}</Text>}
        {area && <Text style={{ ...typography.caption, color: isOldWasteData(area.data_date) ? colors.warn : colors.subtext }}>
          {isOldWasteData(area.data_date) ? "자료가 오래되었어요 · 최신 안내를 확인해 주세요" : `행정안전부 자료 · 기준일 ${area.data_date || "미표기"}`}
        </Text>}
        </>}
        <Pressable accessibilityRole="button" onPress={editSchedule}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs, minHeight: 44,
            borderRadius: radius.button, borderCurve: "continuous", backgroundColor: pressed ? colors.tintStrong : colors.tint })}>
          <Icon name="calendar" size={18} color={colors.primary} />
          <Text style={{ ...typography.label, color: colors.primary }}>{mine ? "우리 집 요일 수정" : "우리 집 요일 직접 설정"}</Text>
        </Pressable>
      </Card>}
      {!mine && area && <Pressable accessibilityRole="button" onPress={() => setShowDetail((v) => !v)} hitSlop={6}
        style={{ alignSelf: "flex-end", minHeight: 36, justifyContent: "center" }}>
        <Text style={{ ...typography.label, color: colors.primary }}>{showDetail ? "상세 접기" : "배출 장소·방법 상세"}</Text>
      </Pressable>}
      {!mine && showDetail && area && <WasteAreaCard area={area} />}
    </View>}

    {/* 주 동작 */}
    <View style={{ gap: space.sm }}>
      <Button label="찍어서 물어보기" icon="camera" onPress={() => router.push("/camera")} />
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Button label="검색하기" icon="search" variant="secondary" style={{ flex: 1 }} onPress={() => router.push("/ask")} />
        <Button label="품목 사전" icon="book" variant="secondary" style={{ flex: 1 }} onPress={() => router.push("/items")} />
      </View>
    </View>

    {/* 자취 메모 — 첫 화면에서 바로 보이게 */}
    <View style={{ gap: space.smPlus }}>
      <SectionHeader title="자취 메모" />
      <MemoCard />
    </View>

    {/* 즐겨찾는 품목 */}
    <View style={{ gap: space.smPlus }}>
      <SectionHeader title="즐겨찾는 품목" action={favItems.length ? "전체 보기" : undefined}
        onAction={favItems.length ? () => router.push("/favorites") : undefined} />
      {favItems.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.page }}
          contentContainerStyle={{ paddingHorizontal: space.page, gap: space.smPlus }}>
          {favItems.slice(0, 10).map((f) => {
            const photo = photoForCategory(f.category);
            return <Pressable key={f.key} accessibilityRole="button" accessibilityLabel={`${f.name} 버리는 법 보기`}
              onPress={() => router.push({ pathname: "/favorite/[key]", params: { key: f.key } })}
              style={({ pressed }) => ({ width: 88, gap: space.xs, opacity: pressed ? 0.6 : 1 })}>
              {photo ? <Thumb photo={photo} size={88} /> : <View style={{ width: 88, height: 88, borderRadius: 22, backgroundColor: colors.tint }} />}
              <Text numberOfLines={2} style={{ ...typography.caption, fontWeight: "600", color: colors.text }}>{f.name}</Text>
            </Pressable>;
          })}
        </ScrollView>
      ) : <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Icon name="bookmark" size={14} color={colors.subtext} />
        <Text style={{ ...typography.caption, color: colors.subtext }}>결과 카드의 북마크를 누르면 내 품목으로 바뀌어요</Text>
      </View>}
    </View>
  </ScrollView>;
}
