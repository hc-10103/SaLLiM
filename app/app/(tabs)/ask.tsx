import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { ScrollViewInstance } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AssistCard from "../../components/AssistCard";
import { Btn, ErrorBox, Loading } from "../../components/Status";
import { assist } from "../../lib/api";
import { loadRecentMessages, saveRecentMessages } from "../../lib/storage";
import type { RecentMessage } from "../../lib/storage";
import { useRegionSelection } from "../../lib/useRegion";
import { colors, radius, sizes, space, typography } from "../../theme";

const EXAMPLES = [
  "페트병 어떻게 버려요?",
  "배달 용기에 고추기름이 묻었는데 어떻게 버려요?",
  "욕실 곰팡이 어떻게 청소해요?",
  "자취할 때 식재료 보관 팁 알려줘",
];

export default function Ask() {
  const router = useRouter();
  const { q: presetQ } = useLocalSearchParams<{ q?: string }>();
  const region = useRegionSelection();
  const regionId = region?.id;
  const areaId = region?.areaId;
  const scroll = useRef<ScrollViewInstance>(null);
  const shouldScroll = useRef(false);
  const lastPresetRef = useRef<string | null>(null);
  const nextId = useRef(0);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [messages, setMessages] = useState<RecentMessage[]>([]);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let active = true;
    loadRecentMessages().then((saved) => {
      if (!active) return;
      nextId.current = Math.max(0, ...saved.map((message) => message.id));
      setMessages(saved);
      setRestored(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (restored) void saveRecentMessages(messages).catch(() => {
      setErr("대화 기록을 기기에 저장하지 못했어요.");
    });
  }, [messages, restored]);

  const submit = useCallback(async (text = q) => {
    const question = text.trim();
    if (!restored || !regionId || !question || busy) return;
    setErr(null);
    setBusy(true);
    try {
      const result = await assist({ region_id: regionId, area_id: areaId, question });
      const id = ++nextId.current;
      shouldScroll.current = true;
      setMessages((current) => [...current, { id, regionId, question, result }].slice(-10));
      setQ("");
    } catch (e) {
      setQ(question);
      setErr(e instanceof Error ? e.message : "오류가 났어요");
    } finally {
      setBusy(false);
    }
  }, [q, regionId, areaId, busy, restored]);

  useEffect(() => {
    if (restored && presetQ && regionId && lastPresetRef.current !== presetQ) {
      lastPresetRef.current = presetQ;
      submit(presetQ);
    }
  }, [presetQ, regionId, restored, submit]);

  const noRegion = !regionId;
  const visibleMessages = messages.filter((message) => message.regionId === regionId);
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scroll} onContentSizeChange={() => {
        if (shouldScroll.current) {
          shouldScroll.current = false;
          scroll.current?.scrollToEnd({ animated: true });
        }
      }}
        contentContainerStyle={{ padding: space.page, paddingBottom: space.lg, gap: space.md }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ ...typography.eyebrow, color: colors.primary }}>SALIM ASK</Text>
            <Text style={{ ...typography.heading, color: colors.text }}>생활 고민, 물어보세요</Text>
          </View>
          {visibleMessages.length > 0 && (
            <Pressable accessibilityRole="button" onPress={() => { setMessages([]); setErr(null); }}
              style={{ paddingVertical: space.xs, paddingHorizontal: space.sm }}>
              <Text style={{ ...typography.label, color: colors.subtext }}>대화 비우기</Text>
            </Pressable>
          )}
        </View>
        <Text style={{ ...typography.body, color: colors.subtext }}>분리배출부터 청소·음식 보관까지 상황을 적어 주세요.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/capture")}
          style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.accent,
            flexDirection: "row", alignItems: "center", gap: space.md }}>
          <Text style={{ fontSize: 26 }}>📷</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.bodyStrong, color: colors.text }}>사진으로 물어보기</Text>
            <Text style={{ ...typography.label, color: colors.subtext }}>물건이나 상황을 찍어 올리세요</Text>
          </View>
          <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
        </Pressable>
        {region && (
          <Pressable accessibilityRole="button" onPress={() => router.push("/settings")}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.button,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider }}>
            <Text style={{ ...typography.label, color: colors.subtext }}>선택한 지역: {region.name}</Text>
            <Text style={{ ...typography.caption, color: colors.primary }}>변경 ›</Text>
          </Pressable>
        )}
        {regionId === "nationwide" && !areaId && <Text style={{ color: colors.warn }}>
          품목별 답변은 전국 공통 방법이에요. 지역 배출 요일은 설정에서 공식 관리구역을 선택해 주세요.
        </Text>}
        {region === null && <Text style={{ color: colors.warn }}>설정에서 동네를 먼저 골라 주세요.</Text>}
        {visibleMessages.length === 0 && (
          <View style={{ gap: space.sm }}>
            <Text style={{ ...typography.label, color: colors.subtext }}>이렇게 물어볼 수 있어요</Text>
            {EXAMPLES.map((example) => (
              <Btn key={example} label={example} onPress={() => submit(example)} disabled={busy || noRegion} />
            ))}
          </View>
        )}
        {visibleMessages.map((message) => (
          <View key={message.id} style={{ gap: space.sm }}>
            <View style={{ alignSelf: "flex-end", maxWidth: "85%", padding: space.md,
              borderRadius: radius.md, backgroundColor: colors.tint }}>
              <Text style={{ color: colors.text }}>{message.question}</Text>
            </View>
            <AssistCard result={message.result} regionId={regionId || ""} areaId={areaId}
              onChange={(result) => setMessages((current) => current.map((m) =>
                m.id === message.id ? { ...m, result } : m))} />
          </View>
        ))}
        {busy && <Loading />}
        {err && <ErrorBox message={err} onRetry={() => submit()} />}
      </ScrollView>

      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.page,
        paddingVertical: space.smPlus, borderTopWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface }}>
        <TextInput value={q} onChangeText={setQ} placeholder="궁금한 물건이나 생활 고민 입력" onSubmitEditing={() => submit()}
          editable={!noRegion && !busy} returnKeyType="send" maxLength={500}
          style={{ flex: 1, minHeight: sizes.touchMin, paddingHorizontal: space.md, paddingVertical: space.sm,
            borderWidth: 1, borderColor: colors.border, borderRadius: radius.button,
            backgroundColor: noRegion ? colors.disabledBg : colors.bg, color: colors.text }} />
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || noRegion || !q.trim() }}
          disabled={busy || noRegion || !q.trim()} onPress={() => submit()}
          style={{ minHeight: sizes.touchMin, paddingHorizontal: space.md, justifyContent: "center",
            alignItems: "center", borderRadius: radius.button,
            backgroundColor: busy || noRegion || !q.trim() ? colors.disabledBg : colors.primary }}>
          <Text style={{ ...typography.button, color: busy || noRegion || !q.trim() ? colors.disabledText : colors.onPrimary }}>
            보내기
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
