import { useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AssistCard from "../../components/AssistCard";
import GuideCard from "../../components/GuideCard";
import GuideIcon from "../../components/GuideIcon";
import Icon from "../../components/Icon";
import { ErrorBox, Loading } from "../../components/Status";
import { Button, Card, SectionHeader } from "../../components/ui";
import { assist } from "../../lib/api";
import type { AssistResponse } from "../../lib/api-types";
import { findGuide, GUIDES, type Guide } from "../../lib/guides";
import { useRegionSelection } from "../../lib/useRegion";
import { toggleFavorite, useIsFavorite } from "../../lib/favorites";
import { colors, radius, space, typography } from "../../theme";

function questionWithContext(guide: Guide, question: string) {
  const context = guide.steps.slice(0, 2).join(" ").slice(0, 160);
  const prefix = `생활 가이드 주제: ${guide.title}\n기본 안내(${guide.source.name}): ${context}\n내 상황과 질문:`;
  return `${prefix.slice(0, 499 - question.length)}\n${question}`;
}

export default function GuideDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, ask: askIntent } = useLocalSearchParams<{ id: string; ask?: string }>();
  const guide = findGuide(id);
  const selected = useRegionSelection();
  // 동네를 안 골랐어도 질문 가능 (전국 공통 기준)
  const region = selected === null ? { id: "nationwide", name: "전국 공통 안내", areaId: undefined } : selected;
  const scroll = useRef<ScrollViewInstance>(null);
  const didScroll = useRef(false);
  const shouldScrollToReply = useRef(false);
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [result, setResult] = useState<{ regionId: string; areaId?: string; value: AssistResponse } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/ask");
  }

  async function submit(customText?: string) {
    const value = (customText ?? question).trim();
    if (!guide || !region?.id || !value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const answer = await assist({ region_id: region.id, area_id: region.areaId, question: questionWithContext(guide, value) });
      shouldScrollToReply.current = true;
      setResult({ regionId: region.id, areaId: region.areaId, value: answer });
      setLastQuestion(value);
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "답변을 가져오지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  const related = guide ? GUIDES.filter((g) => g.category === guide.category && g.id !== guide.id).slice(0, 2) : [];
  const canAsk = !busy && !!region && !!question.trim();
  const saved = useIsFavorite("guide", guide?.id);

  return <ScrollView ref={scroll} onContentSizeChange={() => {
    if (askIntent === "1" && !didScroll.current) {
      didScroll.current = true;
      scroll.current?.scrollToEnd({ animated: false });
    } else if (shouldScrollToReply.current) {
      shouldScrollToReply.current = false;
      scroll.current?.scrollToEnd({ animated: true });
    }
  }} keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.bg }}
    contentContainerStyle={{ padding: space.page, paddingTop: insets.top + space.sm, paddingBottom: space.section, gap: space.lg }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Pressable accessibilityRole="button" accessibilityLabel="이전 화면으로" onPress={goBack} hitSlop={8}
        style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44 }}>
        <Icon name="chevronLeft" size={22} color={colors.primary} />
        <Text style={{ ...typography.label, color: colors.primary }}>이전</Text>
      </Pressable>
      {guide && <Pressable accessibilityRole="button" accessibilityState={{ selected: saved }}
        accessibilityLabel={saved ? "즐겨찾기에서 빼기" : "즐겨찾기에 추가"} hitSlop={8}
        onPress={() => toggleFavorite({ kind: "guide", key: guide.id, name: guide.title, category: guide.category })}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Icon name="bookmark" size={24} color={saved ? colors.primary : colors.subtext} filled={saved} />
      </Pressable>}
    </View>
    {!guide ? <Text style={{ ...typography.body, color: colors.text }}>가이드를 찾지 못했어요.</Text> : <>
      <View style={{ gap: space.sm }}>
        <GuideIcon id={guide.id} category={guide.category} size={64} />
        <Text style={{ ...typography.eyebrow, color: colors.primary }}>{guide.category} · {guide.minutes}분 읽기</Text>
        <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.text }}>{guide.title}</Text>
        <Text style={{ ...typography.body, color: colors.subtext }}>{guide.summary}</Text>
      </View>

      <View style={{ gap: space.smPlus }}>
        <SectionHeader title="이렇게 해 보세요" />
        <Card style={{ gap: space.md }}>
          {guide.steps.map((step, index) => <View key={step} style={{ flexDirection: "row", gap: space.smPlus, alignItems: "flex-start" }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary,
              alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              <Text style={{ ...typography.caption, fontWeight: "800", color: colors.onPrimary }}>{index + 1}</Text>
            </View>
            <Text style={{ flex: 1, ...typography.body, color: colors.text }}>{step}</Text>
          </View>)}
        </Card>
      </View>

      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(guide.source.url)}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.smPlus, padding: space.md,
          borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: pressed ? colors.tintStrong : colors.tint })}>
        <Icon name="shield" size={24} color={colors.primary} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...typography.caption, color: colors.subtext }}>출처 · 기관 원문에서 최신 내용을 확인할 수 있어요</Text>
          <Text style={{ ...typography.label, color: colors.primary }}>{guide.source.name}</Text>
        </View>
        <Icon name="link" size={18} color={colors.primary} />
      </Pressable>

      <Card style={{ gap: space.smPlus }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
          <Icon name="sparkle" size={20} color={colors.primary} />
          <Text style={{ ...typography.section, color: colors.text }}>내 상황은 조금 다른가요?</Text>
        </View>
        {guide.examples && guide.examples.length > 0 && guide.examples.map((ex) => (
          <Pressable key={ex} accessibilityRole="button" disabled={busy || !region} onPress={() => submit(ex)}
            style={({ pressed }) => ({ flexDirection: "row", gap: space.sm, alignItems: "flex-start", padding: space.smPlus,
              borderRadius: radius.button, borderCurve: "continuous", backgroundColor: pressed ? colors.tintStrong : colors.primarySoft })}>
            <Icon name="chat" size={16} color={colors.primary} />
            <Text style={{ flex: 1, ...typography.label, color: colors.primary }}>{ex}</Text>
          </Pressable>
        ))}
        <TextInput accessibilityLabel="이 가이드에 대해 AI에게 질문" value={question} onChangeText={setQuestion}
          placeholder="내 상황을 직접 적어 주세요" placeholderTextColor={colors.disabledText} multiline maxLength={260}
          autoFocus={askIntent === "1"} editable={!busy && !!region}
          style={{ minHeight: 88, padding: space.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
            borderRadius: radius.button, borderCurve: "continuous", color: colors.text, textAlignVertical: "top", ...typography.body }} />
        <Button label="AI에게 질문하기" icon="send" disabled={!canAsk} loading={busy} onPress={() => submit()} />
        <Text style={{ ...typography.caption, color: colors.subtext }}>
          AI 답변은 위 기관 자료를 실시간으로 조회하지 않아요. 중요한 판단은 원문을 다시 확인해 주세요.
        </Text>
      </Card>

      {busy && <Loading label="답을 정리하고 있어요" />}
      {error && <ErrorBox message={error} onRetry={() => submit(lastQuestion || question)} />}
      {result && region?.id === result.regionId && <View style={{ gap: space.sm }}>
        <View style={{ alignSelf: "flex-end", maxWidth: "85%", paddingHorizontal: space.md, paddingVertical: space.smPlus,
          borderRadius: radius.lg, borderCurve: "continuous", borderBottomRightRadius: 6, backgroundColor: colors.primary }}>
          <Text style={{ ...typography.body, color: colors.onPrimary }}>{lastQuestion}</Text>
        </View>
        <AssistCard result={result.value} regionId={result.regionId} areaId={result.areaId}
          onChange={(value) => setResult((current) => current ? { ...current, value } : null)} />
      </View>}

      {related.length > 0 && (
        <View style={{ gap: space.smPlus }}>
          <SectionHeader title={`함께 보면 좋은 ${guide.category} 가이드`} />
          {related.map((item) => <GuideCard key={item.id} guide={item}
            onPress={() => router.replace({ pathname: "/guide/[id]", params: { id: item.id } })} />)}
        </View>
      )}
    </>}
  </ScrollView>;
}
