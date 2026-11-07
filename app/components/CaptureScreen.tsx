import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AssistCard from "./AssistCard";
import Icon from "./Icon";
import { ErrorBox } from "./Status";
import { Button, Card, Notice } from "./ui";
import { assist } from "../lib/api";
import type { AssistResponse } from "../lib/api-types";
import { pickImageBase64 } from "../lib/image";
import { useRegionSelection } from "../lib/useRegion";
import { colors, radius, space, typography } from "../theme";

export default function CaptureScreen({ asTab = false }: { asTab?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const region = useRegionSelection();
  const regionId = region === null ? "nationwide" : region?.id;
  const areaId = region?.areaId;
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<AssistResponse | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [b64, setB64] = useState<string | null>(null); // 마지막 사진 — 다시 시도용
  const [n, setN] = useState(0); // 새 사진마다 답변 컴포넌트 초기화
  const [step, setStep] = useState(0);
  const [purpose, setPurpose] = useState<"general" | "recycling">("general");
  const req = useRef(0); // 취소하면 늦게 온 응답을 버린다
  const scanSteps = purpose === "recycling"
    ? ["사진 확인", "품목 분류", "우리 동네 규칙 확인"]
    : ["사진 확인", "상황 파악", "답변 정리"];

  // 분석 중 단계 표시 (실제 처리 시간을 뜻하지 않음 — 마지막 단계에서 멈춘다)
  useEffect(() => {
    if (!busy || !b64) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, scanSteps.length - 1)), 1200);
    return () => { clearInterval(t); setStep(0); };
  }, [busy, b64, scanSteps.length]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  async function send(img: string) {
    if (!regionId) return;
    setErr(null);
    setResult(null);
    setConfirmed(false);
    setBusy(true);
    const token = ++req.current;
    try {
      const res = await assist({ region_id: regionId, area_id: areaId, image_base64: img,
        purpose: purpose === "recycling" ? "recycling" : undefined });
      if (token !== req.current) return;
      setResult(res);
      setN((x) => x + 1);
    } catch (e) {
      if (token === req.current) setErr(e instanceof Error ? e.message : "오류가 났어요");
    } finally {
      if (token === req.current) setBusy(false);
    }
  }

  function cancel() {
    req.current++;
    setBusy(false);
  }

  async function go(source: "camera" | "library") {
    setErr(null);
    setBusy(true);
    setPreparing(true);
    try {
      const img = await pickImageBase64(source);
      setPreparing(false);
      if (img) { setB64(img); await send(img); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 났어요");
    } finally {
      setPreparing(false);
      setBusy(false);
    }
  }

  const noRegion = !regionId;
  const candidate = result?.kind === "recycling" ? result.recycling : null;
  const needsConfirmation = !!(candidate?.confident && candidate.item_key && candidate.item_name);
  const scanning = busy && !!b64 && !preparing;

  // 시안 ⑤ 인식 중 화면 — 기다리는 동안 무엇을 하는지 보여준다
  if (scanning) {
    return (
      <View accessibilityLiveRegion="polite" style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top + space.lg,
        paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.page, justifyContent: "center", gap: space.xl }}>
        <View style={{ alignSelf: "center", width: 200, height: 200, borderRadius: 100, borderWidth: 6, borderColor: colors.tintStrong,
          alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {b64 && <Image source={{ uri: `data:image/jpeg;base64,${b64}` }} accessibilityLabel="분석 중인 사진"
            style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.35 }} resizeMode="cover" />}
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <View style={{ alignItems: "center", gap: space.xs }}>
          <Text style={{ ...typography.heading, fontSize: 24, color: colors.text }}>물건을 분석하고 있어요</Text>
          <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext }}>보통 5~10초 걸려요</Text>
        </View>
        <View style={{ alignSelf: "center", gap: space.smPlus, minWidth: 220 }}>
          {scanSteps.map((label, i) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              {i < step ? <Icon name="checkCircle" size={22} color={colors.primary} />
                : i === step ? <ActivityIndicator size="small" color={colors.primary} />
                : <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border }} />}
              <Text style={{ ...typography.body, color: i <= step ? colors.text : colors.subtext }}>{label}</Text>
            </View>
          ))}
        </View>
        <Button label="취소" variant="secondary" style={{ alignSelf: "center", minWidth: 140 }} onPress={cancel} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.page, paddingTop: insets.top + space.sm, paddingBottom: space.section, gap: space.md }}>
      {!asTab && (
        <Pressable accessibilityRole="button" accessibilityLabel="이전 화면으로" onPress={goBack} hitSlop={8}
          style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44, alignSelf: "flex-start" }}>
          <Icon name="chevronLeft" size={22} color={colors.primary} />
          <Text style={{ ...typography.label, color: colors.primary }}>이전</Text>
        </Pressable>
      )}
      <View style={{ gap: space.xs }}>
        <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.text }}>찍어서 물어보기</Text>
        <Text style={{ ...typography.body, color: colors.subtext }}>버릴 물건이나 생활 문제를 찍어 올려 주세요.</Text>
      </View>

      <View style={{ flexDirection: "row", gap: space.xs }}>
        {([['general', '생활 문제'], ['recycling', '분리배출']] as const).map(([value, label]) => {
          const selected = purpose === value;
          return <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected }}
            onPress={() => { setPurpose(value); setResult(null); setConfirmed(false); setB64(null); }}
            style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center",
              borderRadius: radius.button, borderWidth: 1, borderColor: selected ? colors.primary : colors.divider,
              backgroundColor: selected ? colors.primarySoft : colors.surface }}>
            <Text style={{ ...typography.label, color: selected ? colors.primary : colors.text }}>{label}</Text>
          </Pressable>;
        })}
      </View>

      {/* 뷰파인더 */}
      <Pressable accessibilityRole="button" accessibilityLabel="사진 찍기" disabled={busy || noRegion}
        onPress={() => go("camera")}
        style={{ height: 300, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: colors.cameraBg, overflow: "hidden",
        alignItems: "center", justifyContent: "center" }}>
        {b64 && <Image source={{ uri: `data:image/jpeg;base64,${b64}` }} accessibilityLabel="선택한 사진"
          style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />}
        <Corners />
        {!b64 && (
          <View style={{ alignItems: "center", gap: space.sm, paddingHorizontal: space.lg }}>
            <Icon name="camera" size={40} color={colors.onCamera} strokeWidth={1.5} />
            <Text style={{ ...typography.bodyStrong, color: colors.onCamera }}>눌러서 사진 찍기</Text>
            <Text style={{ ...typography.caption, color: "#CBD5E1", textAlign: "center" }}>밝은 곳에서 가까이 찍으면 더 정확해요</Text>
          </View>
        )}
      </Pressable>

      {region === null && <Notice tone="info" title="지금은 전국 공통 기준으로 답해요">설정에서 동네를 고르면 배출 요일까지 알려드려요.</Notice>}
      {region && regionId === "nationwide" && !areaId && <Notice tone="info">
        품목별 답변은 전국 공통 방법이에요. 배출 요일은 설정에서 관리구역을 선택하면 보여요.
      </Notice>}

      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Button label="사진 찍기" icon="camera" style={{ flex: 1 }} disabled={busy || noRegion} onPress={() => go("camera")} />
        <Button label="앨범에서" icon="image" variant="secondary" style={{ flex: 1 }} disabled={busy || noRegion} onPress={() => go("library")} />
      </View>
      {preparing && <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ ...typography.label, color: colors.subtext }}>사진을 JPEG로 준비하고 있어요</Text>
      </View>}
      <Button label="이름으로 물어보기" icon="search" variant="text" onPress={() => router.push("/ask")} />
      {region && <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs, justifyContent: "center" }}>
        <Icon name="pin" size={16} color={colors.subtext} />
        <Text style={{ ...typography.caption, color: colors.subtext }}>{region.name} 기준으로 안내해요</Text>
      </View>}

      {err && <ErrorBox message={err} onRetry={b64 ? () => send(b64) : undefined} />}
      {result && needsConfirmation && !confirmed && (
        <Card style={{ gap: space.smPlus }}>
          <Text style={{ ...typography.caption, color: colors.subtext }}>사진 속 물건이</Text>
          <Text style={{ ...typography.resultTitle, color: colors.text }}>{candidate?.item_name} 맞나요?</Text>
          <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext }}>확인하면 배출 방법과 다음 배출일을 보여드려요.</Text>
          <Button label="맞아요, 배출 방법 보기" icon="check" onPress={() => setConfirmed(true)} />
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button label="다시 찍기" variant="secondary" style={{ flex: 1 }} onPress={() => go("camera")} />
            <Button label="이름으로 묻기" variant="secondary" style={{ flex: 1 }} onPress={() => { setResult(null); router.push("/ask"); }} />
          </View>
        </Card>
      )}
      {result && regionId && (!needsConfirmation || confirmed) &&
        <AssistCard key={n} result={result} regionId={regionId} areaId={areaId} onChange={setResult} />}
    </ScrollView>
  );
}

// 뷰파인더 모서리 가이드
function Corners() {
  const c = { position: "absolute" as const, width: 34, height: 34, borderColor: "#FFFFFFCC" };
  return <>
    <View style={{ ...c, top: 28, left: 28, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 }} />
    <View style={{ ...c, top: 28, right: 28, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 }} />
    <View style={{ ...c, bottom: 28, left: 28, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 }} />
    <View style={{ ...c, bottom: 28, right: 28, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 }} />
  </>;
}
