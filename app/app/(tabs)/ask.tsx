import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { ScrollViewInstance } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AssistCard from "../../components/AssistCard";
import Icon from "../../components/Icon";
import { ErrorBox, Loading } from "../../components/Status";
import { Notice } from "../../components/ui";
import { assist } from "../../lib/api";
import { loadRecentMessages, saveRecentMessages } from "../../lib/storage";
import type { RecentMessage } from "../../lib/storage";
import { useRegionSelection } from "../../lib/useRegion";
import { GUIDES } from "../../lib/guides";
import GuideIcon from "../../components/GuideIcon";
import { colors, radius, shadow, space, typography } from "../../theme";

const EXAMPLES = [
  "페트병 어떻게 버려요?",
  "배달 용기에 고추기름이 묻었는데 어떻게 버려요?",
  "욕실 곰팡이 어떻게 청소해요?",
  "자취할 때 식재료 보관 팁 알려줘",
];

export default function Ask() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { q: presetQ, purpose: presetPurpose, requestId } =
    useLocalSearchParams<{ q?: string; purpose?: string; requestId?: string }>();
  const region = useRegionSelection();
  // 동네를 아직 안 골랐어도 질문은 막지 않는다 — 전국 공통 기준으로 답한다
  const regionId = region === null ? "nationwide" : region?.id;
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

  const submit = useCallback(async (text = q, purpose?: "recycling") => {
    const question = text.trim();
    if (!restored || !regionId || !question || busy) return;
    setErr(null);
    setBusy(true);
    shouldScroll.current = true;
    try {
      const result = await assist({ region_id: regionId, area_id: areaId, question, purpose });
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
    const presetKey = `${presetQ ?? ""}:${requestId ?? ""}`;
    if (restored && presetQ && regionId && lastPresetRef.current !== presetKey) {
      lastPresetRef.current = presetKey;
      submit(presetQ, presetPurpose === "recycling" ? "recycling" : undefined);
    }
  }, [presetQ, presetPurpose, requestId, regionId, restored, submit]);

  // 입력하는 글자로 생활 가이드를 바로 찾아 보여준다 (가이드 탭 대신)
  const term = q.trim().toLowerCase();
  const guideMatches = term.length >= 1 && !busy
    ? GUIDES.filter((g) => `${g.title} ${g.summary} ${g.category} ${g.steps.join(" ")}`.toLowerCase().includes(term)).slice(0, 3)
    : [];
  const noRegion = !regionId;
  const canSend = !busy && !noRegion && !!q.trim();
  const visibleMessages = messages.filter((message) => message.regionId === regionId);
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* 헤더 */}
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.page, paddingBottom: space.smPlus,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm,
        backgroundColor: colors.bg, borderBottomWidth: visibleMessages.length ? 1 : 0, borderColor: colors.divider }}>
        <Pressable accessibilityRole="button" accessibilityLabel="홈으로" onPress={() => router.navigate("/")} hitSlop={8}
          style={{ width: 40, height: 44, marginLeft: -space.sm, alignItems: "center", justifyContent: "center" }}>
          <Icon name="chevronLeft" size={26} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.text }}>검색하기</Text>
          {region && <Pressable accessibilityRole="button" accessibilityLabel={`지역 변경, 현재 ${region.name}`}
            onPress={() => router.push("/settings")} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Icon name="pin" size={14} color={colors.subtext} />
            <Text numberOfLines={1} style={{ ...typography.caption, color: colors.subtext }}>{region.name} 기준</Text>
          </Pressable>}
        </View>
        {visibleMessages.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="이 지역 대화 비우기" onPress={() => { setMessages((current) => current.filter((m) => m.regionId !== regionId)); setErr(null); }}
            hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 40, paddingHorizontal: space.smPlus,
              borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider }}>
            <Icon name="trash" size={16} color={colors.subtext} />
            <Text style={{ ...typography.caption, color: colors.subtext }}>비우기</Text>
          </Pressable>
        )}
      </View>

      <ScrollView ref={scroll} onContentSizeChange={() => {
        if (shouldScroll.current) {
          shouldScroll.current = false;
          scroll.current?.scrollToEnd({ animated: true });
        }
      }}
        contentContainerStyle={{ padding: space.page, paddingBottom: space.lg, gap: space.md }}
        style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {region === null && <Notice tone="info" title="지금은 전국 공통 기준으로 답해요">
          <Text style={{ ...typography.caption, color: colors.text }}>설정에서 동네를 고르면 배출 요일까지 알려드려요.</Text>
        </Notice>}
        {region && regionId === "nationwide" && !areaId && <Notice tone="info">
          품목별 답변은 전국 공통 방법이에요. 배출 요일은 설정에서 관리구역을 선택하면 보여요.
        </Notice>}

        {visibleMessages.length === 0 && !busy && (
          <View style={{ gap: space.md }}>
            <View style={{ alignItems: "center", gap: space.sm, paddingVertical: space.lg }}>
              <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name="chat" size={30} color={colors.primary} />
              </View>
              <Text style={{ ...typography.section, color: colors.text }}>무엇이 궁금하세요?</Text>
              <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext, textAlign: "center" }}>
                분리배출부터 청소·음식 보관까지{"\n"}상황을 적어 주시면 카드로 정리해 드려요.{"\n"}글자를 치면 관련 생활 가이드도 바로 떠요.
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push("/camera")}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.smPlus, padding: space.md,
                borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: pressed ? colors.tintStrong : colors.primarySoft })}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                <Icon name="camera" size={22} color={colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.bodyStrong, color: colors.text }}>사진으로 물어보기</Text>
                <Text style={{ ...typography.caption, color: colors.subtext }}>이름을 모르면 찍어서 올려 주세요</Text>
              </View>
              <Icon name="chevronRight" size={20} color={colors.primary} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push("/items")}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.smPlus, padding: space.md,
                borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: pressed ? colors.tint : colors.surface,
                borderWidth: 1, borderColor: colors.divider })}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" }}>
                <Icon name="book" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.bodyStrong, color: colors.text }}>품목 사전에서 찾아보기</Text>
                <Text style={{ ...typography.caption, color: colors.subtext }}>저장된 물건의 배출 방법을 둘러보세요</Text>
              </View>
              <Icon name="chevronRight" size={20} color={colors.primary} />
            </Pressable>
            <Text style={{ ...typography.label, color: colors.subtext }}>이렇게 물어볼 수 있어요</Text>
            {EXAMPLES.map((example) => (
              <Pressable key={example} accessibilityRole="button" disabled={busy || noRegion} onPress={() => submit(example)}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 48,
                  paddingHorizontal: space.md, borderRadius: radius.button, borderCurve: "continuous", borderWidth: 1, borderColor: colors.divider,
                  backgroundColor: pressed ? colors.tint : colors.surface, opacity: noRegion ? 0.5 : 1 })}>
                <Icon name="search" size={16} color={colors.primary} />
                <Text style={{ flex: 1, ...typography.label, fontWeight: "500", color: colors.text }}>{example}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {visibleMessages.map((message) => (
          <View key={message.id} style={{ gap: space.sm }}>
            <View style={{ alignSelf: "flex-end", maxWidth: "85%", paddingHorizontal: space.md, paddingVertical: space.smPlus,
              borderRadius: radius.lg, borderCurve: "continuous", borderBottomRightRadius: 6, backgroundColor: colors.primary }}>
              <Text style={{ ...typography.body, color: colors.onPrimary }}>{message.question}</Text>
            </View>
            <AssistCard result={message.result} regionId={regionId || ""} areaId={areaId}
              onChange={(result) => setMessages((current) => current.map((m) =>
                m.id === message.id ? { ...m, result } : m))} />
          </View>
        ))}
        {busy && <Loading label="답을 정리하고 있어요" />}
        {err && <ErrorBox message={err} onRetry={() => submit()} />}
      </ScrollView>

      {/* 하단 입력 */}
      <View style={{ paddingHorizontal: space.page, paddingTop: space.sm, paddingBottom: space.sm,
        backgroundColor: colors.bg }}>
        {guideMatches.length > 0 && (
          <View style={{ marginBottom: space.sm, paddingHorizontal: space.smPlus, paddingVertical: space.xs, borderRadius: radius.lg,
            borderCurve: "continuous", backgroundColor: colors.surface, boxShadow: shadow.card }}>
            <Text style={{ ...typography.caption, fontWeight: "700", color: colors.subtext, paddingTop: space.xs }}>관련 생활 가이드</Text>
            {guideMatches.map((g) => (
              <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${g.title} 가이드 열기`}
                onPress={() => router.push({ pathname: "/guide/[id]", params: { id: g.id } })}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.smPlus, minHeight: 52, opacity: pressed ? 0.6 : 1 })}>
                <GuideIcon id={g.id} category={g.category} size={36} />
                <Text numberOfLines={1} style={{ flex: 1, ...typography.label, color: colors.text }}>{g.title}</Text>
                <Icon name="chevronRight" size={16} color={colors.subtext} />
              </Pressable>
            ))}
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs, paddingLeft: space.md, paddingRight: 6,
          minHeight: 56, borderRadius: radius.lg, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border,
          backgroundColor: noRegion ? colors.disabledBg : colors.surface, boxShadow: shadow.card }}>
          <TextInput value={q} onChangeText={setQ} placeholder="궁금한 물건이나 생활 고민" onSubmitEditing={() => submit()}
            accessibilityLabel="질문 입력" placeholderTextColor={colors.disabledText}
            editable={!noRegion && !busy} returnKeyType="send" maxLength={500}
            style={{ flex: 1, minHeight: 44, ...typography.body, color: colors.text }} />
          <Pressable accessibilityRole="button" accessibilityLabel="보내기" accessibilityState={{ disabled: !canSend }}
            disabled={!canSend} onPress={() => submit()}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center",
              backgroundColor: !canSend ? colors.disabledBg : pressed ? colors.primaryPressed : colors.primary })}>
            <Icon name="send" size={22} color={canSend ? colors.onPrimary : colors.disabledText} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
