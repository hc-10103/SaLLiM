import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { followUp, isMock } from "../lib/api";
import type { AskResponse, ItemState } from "../lib/api-types";
import { CategoryBadge } from "./CategoryIcon";
import FollowUpSheet from "./FollowUpSheet";
import Thumb from "./Thumb";
import { photoForCategory } from "../lib/photos";
import { toggleFavorite, useIsFavorite } from "../lib/favorites";
import Icon from "./Icon";
import { Button, Notice } from "./ui";
import { colors, radius, shadow, space, typography } from "../theme";

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

type Props = { result: AskResponse; regionId: string; areaId?: string; onChange: (r: AskResponse) => void;
  autoOpenFollowUp?: boolean; showBookmark?: boolean };

export default function ResultCard({ result: r, regionId, areaId, onChange, autoOpenFollowUp = false,
  showBookmark = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean | null>(null); // 누른 답(true/false), 없으면 null
  const [showNote, setShowNote] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(autoOpenFollowUp && !!r.follow_up);
  const state = r.answered_state ?? {};
  const saved = useIsFavorite("item", r.item_key);

  async function answer(yes: boolean) {
    if (!r.item_key || !r.follow_up || busy !== null) return;
    setErr(null);
    setBusy(yes);
    const next = { ...state, [r.follow_up.key]: yes };
    try {
      const updated = await followUp({ region_id: regionId, area_id: areaId, item_key: r.item_key, state: next });
      onChange(updated);
      setSheetOpen(false); // 바뀐 답변을 먼저 읽고 다음 질문은 직접 열 수 있다.
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 났어요");
    } finally {
      setBusy(null);
    }
  }

  const answeredKeys = (Object.keys(state) as (keyof ItemState)[]).filter((k) => typeof state[k] === "boolean");
  const displaySteps = r.steps.length > 1 ? r.steps.filter((s) => !r.answer.includes(s)) : r.steps;
  const firstSource = r.sources[0];

  return (
    <View style={{ gap: space.md, padding: space.md, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.divider, boxShadow: shadow.card }}>
      {/* 경고는 항상 맨 위 */}
      {isMock && <Notice tone="warn" title="예시 데이터예요">실제 배출 안내가 아니에요.</Notice>}
      {!r.confident && r.item_key && (
        <Notice tone="warn" title="정확하지 않을 수 있어요">
          <Text style={{ ...typography.caption, color: colors.warn }}>사진만으로는 확신하기 어려워요. 아래 내용을 확인해 주세요.</Text>
          <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm }}>
            {pathname !== "/capture" && pathname !== "/camera" && <Button label="다시 찍기" icon="camera" variant="secondary"
              style={{ flex: 1, minHeight: 44 }} onPress={() => router.push("/camera")} />}
            {pathname !== "/ask" && <Button label="이름으로 묻기" icon="search" variant="secondary"
              style={{ flex: 1, minHeight: 44 }} onPress={() => router.push("/ask")} />}
          </View>
        </Notice>
      )}

      {!r.item_key ? (
        <View style={{ gap: space.sm, alignItems: "flex-start" }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" }}>
            <Icon name="search" size={24} color={colors.primary} />
          </View>
          <Text style={{ ...typography.section, color: colors.text }}>이 물건은 아직 찾지 못했어요</Text>
          <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext }}>{r.answer}</Text>
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: space.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                {r.category ? <CategoryBadge category={r.category} /> : <View />}
                {showBookmark && <Pressable accessibilityRole="button" accessibilityState={{ selected: saved }}
                  accessibilityLabel={saved ? "즐겨찾기에서 빼기" : "즐겨찾기에 추가"} hitSlop={8}
                  onPress={() => r.item_key && r.item_name && toggleFavorite({ kind: "item", key: r.item_key,
                    name: r.item_name, category: r.category, result: r, regionId, areaId })}
                  style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginVertical: -10 }}>
                  <Icon name="bookmark" size={22} color={saved ? colors.primary : colors.subtext} filled={saved} />
                </Pressable>}
              </View>
              {r.item_name && <Text accessibilityRole="header" style={{ ...typography.resultTitle, color: colors.text }}>
                {r.confident ? r.item_name : `${r.item_name}${josa(r.item_name)} 보여요`}
              </Text>}
            </View>
            {photoForCategory(r.category) && <Thumb photo={photoForCategory(r.category)!} size={84} />}
          </View>
          <Text style={{ ...typography.body, color: colors.subtext }}>{r.answer}</Text>
        </View>
      )}

      {r.item_key && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.smPlus, padding: space.smPlus,
          borderRadius: radius.button, borderCurve: "continuous", backgroundColor: colors.tint }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
            <Icon name="calendar" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.caption, color: colors.subtext }}>다음 배출</Text>
            <Text style={{ ...typography.bodyStrong, color: colors.text }}>
              {r.next_days.length ? `${r.next_days.join(" · ")}요일` : "배출 요일 확인 필요"}
              {"  "}<Text style={{ color: colors.primary }}>{r.time ?? "시간 확인 필요"}</Text>
            </Text>
          </View>
        </View>
      )}

      {displaySteps.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Text style={{ ...typography.label, color: colors.text }}>배출 순서 <Text style={{ color: colors.subtext }}>({displaySteps.length}단계)</Text></Text>
          {displaySteps.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", gap: space.smPlus, alignItems: "flex-start", paddingVertical: space.xs }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                <Text style={{ ...typography.caption, fontWeight: "800", color: colors.onPrimary }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, ...typography.body, color: colors.text }}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {answeredKeys.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
          {answeredKeys.map((k) => (
            <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.sm, paddingVertical: 4,
              borderRadius: radius.pill, backgroundColor: colors.successBg }}>
              <Icon name="check" size={14} color={colors.success} strokeWidth={2.2} />
              <Text style={{ ...typography.caption, color: colors.success }}>{STATE_LABELS[k]}: {state[k] ? "예" : "아니오"}</Text>
            </View>
          ))}
        </View>
      )}

      {r.follow_up && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.smPlus, padding: space.smPlus,
          borderRadius: radius.button, borderCurve: "continuous", backgroundColor: colors.primarySoft }}>
          <Icon name="info" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.caption, color: colors.primary }}>확인이 필요해요</Text>
            <Text style={{ ...typography.label, color: colors.text }}>{r.follow_up.question}</Text>
          </View>
          <Button label="답하기" variant="primary" style={{ minHeight: 44, paddingHorizontal: space.smPlus }}
            onPress={() => setSheetOpen(true)} />
          <FollowUpSheet open={sheetOpen} question={r.follow_up.question} itemName={r.item_name} busy={busy}
            onAnswer={answer} onClose={() => setSheetOpen(false)} />
        </View>
      )}
      {err && <Notice tone="error" title="답을 반영하지 못했어요">{err}</Notice>}

      {r.note && (
        <Disclosure icon="info" title="동네 예외 안내" open={showNote} onToggle={() => setShowNote((v) => !v)}>
          <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext }}>{r.note}</Text>
        </Disclosure>
      )}

      {!!r.drop_off_points?.length && (
        <View style={{ padding: space.smPlus, gap: space.sm, borderRadius: radius.button, borderCurve: "continuous", backgroundColor: colors.tint }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
            <Icon name="pin" size={18} color={colors.primary} />
            <Text style={{ ...typography.label, color: colors.primary }}>우리 동네 배출 안내</Text>
          </View>
          {r.drop_off_points.map((point, index) => (
            <View key={`${point.type}-${index}`} style={{ gap: 2 }}>
              <Text style={{ ...typography.label, fontWeight: "500", color: colors.text }}>{point.where}</Text>
              {point.url && <Text accessibilityRole="link" onPress={() => Linking.openURL(point.url!)}
                style={{ ...typography.caption, color: colors.primary }}>공식 안내 확인 ↗</Text>}
            </View>
          ))}
        </View>
      )}

      {r.sources.length > 0 && (
        <Disclosure icon="book" title={`출처 및 기준일 (${r.sources.length})`} open={showSources}
          onToggle={() => setShowSources((v) => !v)}
          summary={firstSource ? `${firstSource.title} · ${firstSource.updated}` : undefined}>
          {r.sources.map((s) => (
            <Text key={s.url} accessibilityRole="link" onPress={() => Linking.openURL(s.url)}
              style={{ ...typography.caption, color: colors.primary }}>
              {s.title} · 자료 기준 {s.updated} ↗
            </Text>
          ))}
        </Disclosure>
      )}
    </View>
  );
}

function Disclosure({ icon, title, summary, open, onToggle, children }: {
  icon: "info" | "book"; title: string; summary?: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <View style={{ borderRadius: radius.button, borderCurve: "continuous", borderWidth: 1, borderColor: colors.divider }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle}
        style={{ flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 48, paddingHorizontal: space.smPlus }}>
        <Icon name={icon} size={18} color={colors.subtext} />
        <View style={{ flex: 1, paddingVertical: space.sm }}>
          <Text style={{ ...typography.label, color: colors.text }}>{title}</Text>
          {!open && summary && <Text numberOfLines={1} style={{ ...typography.caption, color: colors.subtext }}>{summary}</Text>}
        </View>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={18} color={colors.subtext} />
      </Pressable>
      {open && <View style={{ gap: space.sm, paddingHorizontal: space.smPlus, paddingBottom: space.smPlus }}>{children}</View>}
    </View>
  );
}
