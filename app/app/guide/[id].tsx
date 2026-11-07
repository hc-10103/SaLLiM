import { useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { ScrollViewInstance } from "react-native";
import AssistCard from "../../components/AssistCard";
import { ErrorBox, Loading } from "../../components/Status";
import { assist } from "../../lib/api";
import type { AssistResponse } from "../../lib/api-types";
import { findGuide, GUIDES, type Guide } from "../../lib/guides";
import { useRegionSelection } from "../../lib/useRegion";
import { colors, radius, space, typography } from "../../theme";

function questionWithContext(guide: Guide, question: string) {
  const context = guide.steps.slice(0, 2).join(" ").slice(0, 160);
  const prefix = `생활 가이드 주제: ${guide.title}\n기본 안내(${guide.source.name}): ${context}\n내 상황과 질문:`;
  return `${prefix.slice(0, 499 - question.length)}\n${question}`;
}

export default function GuideDetail() {
  const router = useRouter();
  const { id, ask: askIntent } = useLocalSearchParams<{ id: string; ask?: string }>();
  const guide = findGuide(id);
  const region = useRegionSelection();
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
    else router.replace("/guides");
  }

  async function submit(customText?: string) {
    const value = (customText ?? question).trim();
    if (!guide || !region?.id || !value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const answer = await assist({
        region_id: region.id,
        area_id: region.areaId,
        question: questionWithContext(guide, value),
      });
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

  const related = guide
    ? GUIDES.filter((g) => g.category === guide.category && g.id !== guide.id).slice(0, 2)
    : [];

  return <ScrollView ref={scroll} onContentSizeChange={() => {
    if (askIntent === "1" && !didScroll.current) {
      didScroll.current = true;
      scroll.current?.scrollToEnd({ animated: false });
    } else if (shouldScrollToReply.current) {
      shouldScrollToReply.current = false;
      scroll.current?.scrollToEnd({ animated: true });
    }
  }} keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.page,
    paddingBottom: space.section, gap: space.lg }}>
    <Pressable accessibilityRole="button" onPress={goBack} style={{ paddingVertical: space.sm }}>
      <Text style={{ ...typography.bodyStrong, color: colors.primary }}>‹  이전 화면으로</Text>
    </Pressable>
    {!guide ? <Text style={{ ...typography.body, color: colors.text }}>가이드를 찾지 못했어요.</Text> : <>
      <View style={{ gap: space.sm }}>
        <Text style={{ fontSize: 46 }}>{guide.icon}</Text>
        <Text style={{ ...typography.eyebrow, color: colors.primary }}>{guide.category} · {guide.minutes}분 읽기</Text>
        <Text style={{ ...typography.heading, color: colors.text }}>{guide.title}</Text>
        <Text style={{ ...typography.body, color: colors.subtext }}>{guide.summary}</Text>
      </View>
      <View style={{ gap: space.md }}>
        <Text style={{ ...typography.section, color: colors.text }}>이렇게 해보세요</Text>
        {guide.steps.map((step, index) => <View key={step} style={{ flexDirection: "row", gap: space.md,
          padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary,
            alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>{index + 1}</Text>
          </View>
          <Text style={{ flex: 1, ...typography.body, color: colors.text }}>{step}</Text>
        </View>)}
      </View>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(guide.source.url)}
        style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.tint, gap: space.xs }}>
        <Text style={{ ...typography.label, color: colors.subtext }}>내용 확인</Text>
        <Text style={{ ...typography.bodyStrong, color: colors.primary }}>{guide.source.name} ↗</Text>
        <Text style={{ ...typography.caption, color: colors.subtext }}>기관 원문에서 자세한 내용과 최신 정보를 확인할 수 있어요.</Text>
      </Pressable>
      <View style={{ gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface }}>
        <Text style={{ ...typography.section, color: colors.text }}>내 상황은 조금 다른가요?</Text>
        {guide.examples && guide.examples.length > 0 && (
          <View style={{ gap: space.xs }}>
            <Text style={{ ...typography.caption, color: colors.subtext }}>자주 묻는 연관 질문 (누르면 바로 질문해요)</Text>
            {guide.examples.map((ex) => (
              <Pressable key={ex} accessibilityRole="button" disabled={busy || !region}
                onPress={() => submit(ex)}
                style={{ padding: space.smPlus, borderRadius: radius.sm, backgroundColor: colors.tint }}>
                <Text style={{ ...typography.label, color: colors.primary }}>💬 {ex}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <TextInput accessibilityLabel="이 가이드에 대해 AI에게 질문" value={question} onChangeText={setQuestion}
          placeholder="내 상황을 직접 적어 주세요" multiline maxLength={260} autoFocus={askIntent === "1"} editable={!busy && !!region}
          style={{ minHeight: 88, padding: space.md, borderWidth: 1, borderColor: colors.divider,
            borderRadius: radius.button, color: colors.text, textAlignVertical: "top", ...typography.body }} />
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !region || !question.trim() }}
          disabled={busy || !region || !question.trim()} onPress={() => submit()}
          style={{ minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radius.button,
            backgroundColor: busy || !region || !question.trim() ? colors.disabledBg : colors.primary }}>
          <Text style={{ ...typography.button, color: busy || !region || !question.trim() ? colors.disabledText : colors.onPrimary }}>
            내 상황 AI에게 질문하기
          </Text>
        </Pressable>
        {!region && <Text style={{ ...typography.caption, color: colors.warn }}>먼저 내 지역을 선택해 주세요.</Text>}
        <Text style={{ ...typography.caption, color: colors.subtext }}>
          AI 답변은 위 기관 자료를 실시간 조회하지 않아요. 중요한 판단은 원문을 다시 확인해 주세요.
        </Text>
      </View>
      {busy && <Loading />}
      {error && <ErrorBox message={error} onRetry={() => submit(lastQuestion || question)} />}
      {result && region?.id === result.regionId && <View style={{ gap: space.sm }}>
        <Text style={{ ...typography.label, color: colors.subtext }}>내 질문: {lastQuestion}</Text>
        <AssistCard result={result.value} regionId={result.regionId} areaId={result.areaId}
          onChange={(value) => setResult((current) => current ? { ...current, value } : null)} />
      </View>}
      {related.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Text style={{ ...typography.section, color: colors.text }}>함께 보면 좋은 {guide.category} 가이드</Text>
          {related.map((item) => (
            <Pressable key={item.id} accessibilityRole="button"
              onPress={() => router.replace({ pathname: "/guide/[id]", params: { id: item.id } })}
              style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md,
                borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider }}>
              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.bodyStrong, color: colors.text }}>{item.title}</Text>
                <Text style={{ ...typography.caption, color: colors.subtext }}>{item.summary}</Text>
              </View>
              <Text style={{ fontSize: 20, color: colors.primary }}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
    </>}
  </ScrollView>;
}
