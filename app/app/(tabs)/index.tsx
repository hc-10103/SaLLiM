import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import GuideCard from "../../components/GuideCard";
import { ErrorBox, Loading } from "../../components/Status";
import WasteAreaCard from "../../components/WasteAreaCard";
import { getSchedule, getWasteArea, isMock } from "../../lib/api";
import type { ScheduleResponse, WasteAreaDetail } from "../../lib/api-types";
import { GUIDES } from "../../lib/guides";
import { useRegionSelection } from "../../lib/useRegion";
import { formatWasteDays, isOldWasteData } from "../../lib/wasteArea";
import { colors, radius, shadow, space, typography } from "../../theme";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const JS_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const QUICK_QUESTIONS = [
  { label: "🍗 치킨뼈·계란껍데기", q: "치킨뼈는 어떻게 버려요?" },
  { label: "🧊 아이스팩", q: "젤 아이스팩은 어떻게 버려요?" },
  { label: "📦 택배상자", q: "택배 상자 어떻게 버려요?" },
  { label: "🥤 배달용기", q: "배달 용기 어떻게 버려요?" },
  { label: "🔋 건전지", q: "다 쓴 건전지 어떻게 버려요?" },
  { label: "💊 남은 약", q: "먹다 남은 약은 어떻게 버려요?" },
];

function getTodayAreaSummary(area: WasteAreaDetail, today: string): string {
  const active: string[] = [];
  if (area.general_days.split("+").map((s) => s.trim()).includes(today)) active.push("일반쓰레기");
  if (area.food_days.split("+").map((s) => s.trim()).includes(today)) active.push("음식물");
  if (area.recycling_days.split("+").map((s) => s.trim()).includes(today)) active.push("재활용품");
  return active.length
    ? `오늘(${today}) 배출 가능: ${active.join(" · ")}`
    : `오늘(${today})은 정기 배출 품목이 없는 날이에요`;
}

export default function Home() {
  const router = useRouter();
  const region = useRegionSelection();
  const regionId = region?.id;
  const areaId = region?.areaId;
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [official, setOfficial] = useState<WasteAreaDetail | null>(null);
  const [showWeek, setShowWeek] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const todayKor = weekly?.today || JS_WEEKDAYS[new Date().getDay()];

  return <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.page,
    paddingBottom: space.section, gap: space.lg }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: space.sm }}>
      <Text style={{ ...typography.section, fontWeight: "800", color: colors.primary }}>살림.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push("/settings")}
        style={{ maxWidth: "65%", paddingHorizontal: space.md, paddingVertical: space.sm,
          borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider }}>
        <Text numberOfLines={1} style={{ ...typography.label, color: colors.text }}>⌖  {region?.name || "내 지역 설정"}  ›</Text>
      </Pressable>
    </View>

    <View style={{ padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.primary, gap: space.xs }}>
      <Text style={{ ...typography.eyebrow, color: colors.accent }}>혼자 사는 생활, 조금 더 쉽게</Text>
      <Text style={{ ...typography.resultTitle, color: colors.onPrimary }}>오늘도 살림은 잘 굴러가요</Text>
      <Text style={{ ...typography.label, color: colors.onPrimary }}>버리는 법부터 먹고 사는 팁까지, 필요한 순간 바로 찾아보세요.</Text>
    </View>

    <View style={{ gap: space.sm }}>
      <Text style={{ ...typography.section, color: colors.text }}>무엇이 궁금하세요?</Text>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Action icon="📷" title="사진 찍고" subtitle="바로 알아보기" onPress={() => router.push("/capture")} featured />
        <Action icon="💬" title="글로 묻고" subtitle="해결 방법 보기" onPress={() => router.push("/ask")} />
      </View>
      <View style={{ gap: space.xs, marginTop: space.xs }}>
        <Text style={{ ...typography.caption, color: colors.subtext }}>자주 헷갈리는 품목 바로 물어보기</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
          {QUICK_QUESTIONS.map((item) => (
            <Pressable key={item.label} accessibilityRole="button"
              onPress={() => router.push({ pathname: "/ask", params: { q: item.q } })}
              style={{ paddingHorizontal: space.smPlus, paddingVertical: space.sm, borderRadius: radius.pill,
                backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider }}>
              <Text style={{ ...typography.caption, fontWeight: "600", color: colors.text }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>

    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ ...typography.section, color: colors.text }}>우리 동네 배출 일정</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/settings")}>
          <Text style={{ ...typography.label, color: colors.primary }}>지역 변경 ›</Text>
        </Pressable>
      </View>
      {region === null && <EmptySchedule message="내 지역을 골라 배출 요일을 확인해 보세요." onPress={() => router.push("/settings")} />}
      {region && regionId !== "nationwide" && !area && !weekly && !error && <Loading />}
      {error && <ErrorBox message={error} onRetry={() => { setError(null); load(); }} />}
      {area && <View style={{ gap: space.sm }}>
        <Pressable accessibilityRole="button" onPress={() => setShowWeek((value) => !value)}
          style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: space.xs, ...shadow.card }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ ...typography.label, color: colors.primary }}>
              {area.zone && area.zone !== "없음" ? `${area.city} ${area.district} · ${area.zone}` : `${area.city} ${area.district}`}
            </Text>
            <Text style={{ ...typography.caption, color: colors.subtext }}>행정안전부 등록 자료</Text>
          </View>
          <View style={{ padding: space.smPlus, borderRadius: radius.sm, backgroundColor: colors.tint, marginTop: 2 }}>
            <Text style={{ ...typography.bodyStrong, color: colors.text }}>
              {hasWeek && weekly
                ? (weekly.today_categories.length
                  ? `오늘(${weekly.today}) ${weekly.today_categories.join(" · ")} 배출`
                  : `오늘(${weekly.today}) 예정된 배출 품목이 없어요`)
                : getTodayAreaSummary(area, todayKor)}
            </Text>
            {(weekly?.time || area.general_start || area.general_end) && (
              <Text style={{ ...typography.caption, color: colors.subtext, marginTop: 2 }}>
                배출 시간: {weekly?.time || `${area.general_start || "?"} ~ ${area.general_end || "?"}`}
              </Text>
            )}
          </View>
          <Text style={{ ...typography.label, color: colors.subtext, marginTop: 2 }}>일반  {formatWasteDays(area.general_days)}</Text>
          <Text style={{ ...typography.label, color: colors.subtext }}>음식물  {formatWasteDays(area.food_days)}</Text>
          <Text style={{ ...typography.label, color: colors.subtext }}>
            재활용  {formatWasteDays(area.recycling_days)}{regionId === "seoul-gwanak" ? " (투명페트·비닐은 목요일)" : ""}
          </Text>
          <Text style={{ ...typography.caption, color: colors.primary, marginTop: 4 }}>
            {isOldWasteData(area.data_date) ? "자료가 오래되었어요 · 최신 안내 확인" : `자료 기준일 ${area.data_date || "미표기"}`} · {showWeek ? "상세 일정 접기 ⌃" : "요일별·상세 일정 보기 ⌄"}
          </Text>
        </Pressable>
        {showWeek && hasWeek && weekly && (
          <View style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: space.xs, borderWidth: 1, borderColor: colors.divider }}>
            <Text style={{ ...typography.label, color: colors.primary }}>요일별 세부 배출 품목</Text>
            {DAYS.map((day) => <View key={day} style={{ flexDirection: "row", gap: space.md }}>
              <Text style={{ fontWeight: day === weekly.today ? "700" : "400", color: colors.text }}>{day}</Text>
              <Text style={{ flex: 1, color: colors.subtext }}>{weekly.week[day]?.join(" · ") || "—"}</Text>
            </View>)}
            {weekly.note && <Text style={{ ...typography.caption, color: colors.subtext, marginTop: 4 }}>{weekly.note}</Text>}
          </View>
        )}
        {showWeek && <WasteAreaCard area={area} />}
      </View>}
      {!area && weekly && <View style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: space.sm }}>
        {isMock && <Text style={{ ...typography.label, color: colors.warn }}>예시 데이터 · 실제 배출 요일이 아니에요</Text>}
        <Text style={{ ...typography.bodyStrong, color: colors.text }}>
          {hasWeek ? weekly.today_categories.length
            ? `오늘(${weekly.today}) ${weekly.today_categories.join(" · ")} 배출` : `오늘(${weekly.today}) 예정된 배출 품목이 없어요`
            : "이 지역 배출 요일은 아직 준비 중이에요"}
        </Text>
        {weekly.time && <Text style={{ color: colors.subtext }}>배출 시간 {weekly.time}</Text>}
        {hasWeek && <Pressable accessibilityRole="button" onPress={() => setShowWeek((value) => !value)}>
          <Text style={{ ...typography.label, color: colors.primary }}>{showWeek ? "주간 일정 접기 ⌃" : "주간 일정 보기 ⌄"}</Text>
        </Pressable>}
        {showWeek && hasWeek && DAYS.map((day) => <View key={day} style={{ flexDirection: "row", gap: space.md }}>
          <Text style={{ fontWeight: day === weekly.today ? "700" : "400", color: colors.text }}>{day}</Text>
          <Text style={{ flex: 1, color: colors.subtext }}>{weekly.week[day]?.join(" · ") || "—"}</Text>
        </View>)}
        {showWeek && weekly.note && <Text style={{ ...typography.caption, color: colors.subtext }}>{weekly.note}</Text>}
      </View>}
      {region?.id === "nationwide" && !areaId && <EmptySchedule
        message="동네를 검색하면 공식 배출 요일을 볼 수 있어요." onPress={() => router.push("/settings")} />}
    </View>

    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ ...typography.section, color: colors.text }}>자취 첫걸음 가이드</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/guides")}>
          <Text style={{ ...typography.label, color: colors.primary }}>전체 보기 ›</Text>
        </Pressable>
      </View>
      {[GUIDES[0], GUIDES[3], GUIDES[10]].map((guide) => <GuideCard key={guide.id} guide={guide}
        onPress={() => router.push({ pathname: "/guide/[id]", params: { id: guide.id } })}
        onAsk={() => router.push({ pathname: "/guide/[id]", params: { id: guide.id, ask: "1" } })} />)}
    </View>
  </ScrollView>;
}

function Action({ icon, title, subtitle, onPress, featured = false }: {
  icon: string; title: string; subtitle: string; onPress: () => void; featured?: boolean;
}) {
  return <Pressable accessibilityRole="button" onPress={onPress}
    style={{ flex: 1, minHeight: 112, padding: space.md, borderRadius: radius.md,
      backgroundColor: featured ? colors.accent : colors.surface, justifyContent: "space-between", ...shadow.card }}>
    <Text style={{ fontSize: 28 }}>{icon}</Text>
    <View>
      <Text style={{ ...typography.bodyStrong, color: colors.text }}>{title}</Text>
      <Text style={{ ...typography.label, color: colors.subtext }}>{subtitle} ›</Text>
    </View>
  </Pressable>;
}

function EmptySchedule({ message, onPress }: { message: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress}
    style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: space.xs }}>
    <Text style={{ ...typography.bodyStrong, color: colors.text }}>{message}</Text>
    <Text style={{ ...typography.label, color: colors.primary }}>내 지역 찾기 ›</Text>
  </Pressable>;
}
