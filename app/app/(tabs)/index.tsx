import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CategoryIcon from "../../components/CategoryIcon";
import Icon from "../../components/Icon";
import Thumb from "../../components/Thumb";
import MemoCard from "../../components/MemoCard";
import { photoForCategory, type PhotoName } from "../../lib/photos";
import { useFavorites } from "../../lib/favorites";
import { ErrorBox, Loading } from "../../components/Status";
import { Button, Card, Chip, Notice, SectionHeader } from "../../components/ui";
import WasteAreaCard from "../../components/WasteAreaCard";
import { getSchedule, getWasteArea, isMock } from "../../lib/api";
import type { ScheduleResponse, WasteAreaDetail } from "../../lib/api-types";
import { useRegionSelection } from "../../lib/useRegion";
import { isOldWasteData } from "../../lib/wasteArea";
import { categoryColor, colors, radius, shadow, space, typography } from "../../theme";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const JS_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const QUICK_QUESTIONS: { label: string; q: string; photo: PhotoName }[] = [
  { label: "치킨뼈", q: "치킨뼈는 어떻게 버려요?", photo: "general" },
  { label: "아이스팩", q: "젤 아이스팩은 어떻게 버려요?", photo: "general" },
  { label: "택배상자", q: "택배 상자 어떻게 버려요?", photo: "paper" },
  { label: "배달용기", q: "배달 용기 어떻게 버려요?", photo: "plastic" },
  { label: "건전지", q: "다 쓴 건전지 어떻게 버려요?", photo: "special" },
  { label: "남은 약", q: "먹다 남은 약은 어떻게 버려요?", photo: "special" },
];

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
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const favItems = useFavorites().filter((f) => f.kind === "item");

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
  const hasSchedule = !!area || (!!weekly && hasWeek);
  const todayCats = categoriesFor(today, weekly, hasWeek, area);
  const time = weekly?.time || (area && (area.general_start || area.general_end)
    ? `${area.general_start || "?"} ~ ${area.general_end || "?"}` : null);
  const selectedDay = picked ?? today;
  const selectedCats = categoriesFor(selectedDay, weekly, hasWeek, area);
  const loading = region && regionId !== "nationwide" && !area && !weekly && !error;

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
    <View style={{ borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: colors.primary, padding: space.lg, gap: space.md,
      overflow: "hidden", boxShadow: shadow.raised }}>
      <View style={{ position: "absolute", right: -40, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: "#3B82F6" }} />
      <View style={{ position: "absolute", right: 30, top: 70, width: 90, height: 90, borderRadius: 45, backgroundColor: "#60A5FA55" }} />
      <View style={{ gap: 2 }}>
        <Text style={{ ...typography.label, color: "#DBEAFE" }}>오늘의 배출</Text>
        <Text style={{ ...typography.display, color: colors.onPrimary }}>오늘은 {today}요일</Text>
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
    </View>

    {/* 주 동작 */}
    <View style={{ gap: space.sm }}>
      <Button label="찍어서 물어보기" icon="camera" onPress={() => router.push("/camera")} />
      <Button label="이름으로 물어보기" icon="search" variant="secondary" onPress={() => router.push("/ask")} />
      <Button label="품목 사전에서 찾아보기" icon="book" variant="secondary" onPress={() => router.push("/items")} />
    </View>

    {/* 이번 주 배출 요일 */}
    {(hasSchedule || loading || error) && <View style={{ gap: space.smPlus }}>
      <SectionHeader title="이번 주 배출 요일" action={showDetail ? "접기" : "상세"} onAction={area ? () => setShowDetail((v) => !v) : undefined} />
      {loading && <Loading label="일정을 불러오는 중이에요" />}
      {error && <ErrorBox message={error} onRetry={() => { setError(null); load(); }} />}
      {hasSchedule && <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {DAYS.map((day) => {
            const isToday = day === today;
            const isSel = day === selectedDay;
            const has = categoriesFor(day, weekly, hasWeek, area).length > 0;
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
        {regionId === "seoul-gwanak" && <Notice tone="info">투명페트·비닐은 목요일에만 내놓아요.</Notice>}
        {weekly?.note && <Text style={{ ...typography.caption, color: colors.subtext }}>{weekly.note}</Text>}
        {area && <Text style={{ ...typography.caption, color: isOldWasteData(area.data_date) ? colors.warn : colors.subtext }}>
          {isOldWasteData(area.data_date) ? "자료가 오래되었어요 · 최신 안내를 확인해 주세요" : `행정안전부 자료 · 기준일 ${area.data_date || "미표기"}`}
        </Text>}
      </Card>}
      {showDetail && area && <WasteAreaCard area={area} />}
    </View>}

    {/* 즐겨찾는 품목과 자주 찾는 질문 */}
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
      <Text style={{ ...typography.caption, fontWeight: "700", color: colors.subtext }}>자주 헷갈리는 물건</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {QUICK_QUESTIONS.map((item) => <Chip key={item.label} label={item.label}
          leading={<Thumb photo={item.photo} size={24} round />}
          onPress={() => router.push({ pathname: "/ask", params: { q: item.q } })} />)}
      </View>
    </View>

    <View style={{ gap: space.smPlus }}>
      <SectionHeader title="자취 생활 가이드" action="전체 보기" onAction={() => router.push("/guides")} />
      <Text style={{ ...typography.label, color: colors.subtext }}>음식 보관, 청소·세탁, 분리배출, 집 안전 정보를 주제별로 찾아보세요.</Text>
    </View>

    {/* 자취 메모 */}
    <View style={{ gap: space.smPlus }}>
      <SectionHeader title="자취 메모" />
      <MemoCard />
    </View>
  </ScrollView>;
}
