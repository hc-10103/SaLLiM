import { useState } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { followUp, isMock } from "../lib/api";
import type { AskResponse, ItemState } from "../lib/api-types";
import CategoryIcon from "./CategoryIcon";
import { Btn } from "./Status";
import { colors, radius, sizes, space, typography } from "../theme";

// 받침 있으면 "으로", 없거나 ㄹ받침이면 "로"
function josa(w: string) {
  const lastHangul = w.match(/[가-힣]/g)?.at(-1) ?? "";
  if (!lastHangul) return "로";
  const c = lastHangul.charCodeAt(0) - 0xac00;
  return c < 0 || c > 11171 || c % 28 === 0 || c % 28 === 8 ? "로" : "으로";
}

const STATE_LABELS: Record<keyof ItemState, string> = {
  has_label: "라벨·스티커 부착",
  has_contents: "내용물 남음",
  is_dirty: "이물질·기름 오염",
  is_coated: "비닐·은박 코팅",
};

type Props = { result: AskResponse; regionId: string; areaId?: string; onChange: (r: AskResponse) => void };

export default function ResultCard({ result: r, regionId, areaId, onChange }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const state = r.answered_state ?? {};

  async function answer(yes: boolean) {
    if (!r.item_key || !r.follow_up || busy) return;
    setErr(null);
    setBusy(true);
    const next = { ...state, [r.follow_up.key]: yes };
    try {
      onChange(await followUp({ region_id: regionId, area_id: areaId, item_key: r.item_key, state: next }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 났어요");
    } finally {
      setBusy(false);
    }
  }

  const answeredKeys = (Object.keys(state) as (keyof ItemState)[]).filter((k) => typeof state[k] === "boolean");
  const displaySteps = r.steps.length > 1
    ? r.steps.filter((s) => !r.answer.includes(s))
    : r.steps;

  return (
    <View style={{ gap: space.sm, padding: space.md, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.md, backgroundColor: colors.surface }}>
      {isMock && <Text style={{ color: colors.error }}>예시 데이터예요 — 실제 배출 안내가 아니에요</Text>}
      {!r.item_key && <Text style={{ ...typography.section, color: colors.text }}>이 물건은 아직 찾지 못했어요.</Text>}
      {!r.confident && (
        <View style={{ gap: space.sm, padding: space.md, borderRadius: radius.sm, backgroundColor: colors.warnBg }}>
          <Text style={{ color: colors.warn, fontWeight: "700" }}>확신이 낮은 결과예요</Text>
          {pathname !== "/capture" && <Btn label="다시 찍기" onPress={() => router.push("/capture")} />}
          {pathname !== "/ask" && <Btn label="이름으로 물어보기" onPress={() => router.push("/ask")} />}
        </View>
      )}
      {r.item_name && <Text style={{ fontSize: typography.resultTitle.fontSize, fontWeight: typography.resultTitle.fontWeight, color: colors.text }}>{r.confident ? r.item_name : `${r.item_name}${josa(r.item_name)} 보여요`}</Text>}
      {r.category && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <CategoryIcon category={r.category} />
          <Text style={{ color: colors.primary }}>{r.category}</Text>
        </View>
      )}
      <Text style={{ color: colors.text }}>{r.answer}</Text>
      {displaySteps.map((s, i) => (
        <Text key={i} style={{ color: colors.text }}>{i + 1}. {s}</Text>
      ))}
      {r.item_key && (
        <Text style={{ color: colors.subtext }}>
          {r.next_days.length ? `배출 요일: ${r.next_days.join(", ")}` : "배출 요일 확인 필요"}
          {" · "}
          {r.time ? r.time : "배출 시간 확인 필요"}
        </Text>
      )}
      {r.note && <Text style={{ color: colors.subtext, ...typography.caption }}>{r.note}</Text>}
      {!!r.drop_off_points?.length && (
        <View style={{ padding: space.md, gap: space.xs, borderRadius: radius.sm, backgroundColor: colors.tint }}>
          <Text style={{ ...typography.label, color: colors.primary }}>📍 우리 동네 전용수거함 안내</Text>
          {r.drop_off_points.map((point, index) => (
            <View key={`${point.type}-${index}`} style={{ gap: space.xs }}>
              <Text style={{ ...typography.body, color: colors.text }}>{point.where}</Text>
              {point.url && <Text accessibilityRole="link" onPress={() => Linking.openURL(point.url!)}
                style={{ ...typography.caption, color: colors.primary }}>공식 안내 확인 ↗</Text>}
            </View>
          ))}
        </View>
      )}
      {answeredKeys.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
          {answeredKeys.map((k) => (
            <View key={k} style={{ paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: colors.tint }}>
              <Text style={{ ...typography.caption, color: colors.primary }}>
                ✓ {STATE_LABELS[k]}: {state[k] ? "예" : "아니오"}
              </Text>
            </View>
          ))}
        </View>
      )}
      {r.follow_up && (
        <View style={{ gap: space.sm }}>
          <Text style={{ color: colors.text }}>{r.follow_up.question}</Text>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            {[true, false].map((yes) => (
              <TouchableOpacity key={String(yes)} onPress={() => answer(yes)} disabled={busy} accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                style={{ minHeight: sizes.touchMin, justifyContent: "center", padding: space.md, borderWidth: 1,
                  borderColor: colors.border, borderRadius: radius.button,
                  backgroundColor: busy ? colors.disabledBg : colors.surface }}>
                <Text style={{ color: busy ? colors.disabledText : colors.text }}>{yes ? "예" : "아니오"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      {err && <Text style={{ color: colors.error }}>{err}</Text>}
      {r.sources.map((s) => (
        <Text key={s.url} accessibilityRole="link" style={{ color: colors.primary, ...typography.caption }} onPress={() => Linking.openURL(s.url)}>
          출처: {s.title} · 자료 기준 {s.updated} ↗
        </Text>
      ))}
    </View>
  );
}
