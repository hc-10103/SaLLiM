import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import AssistCard from "../components/AssistCard";
import { Btn, ErrorBox, Loading } from "../components/Status";
import { assist } from "../lib/api";
import type { AssistResponse } from "../lib/api-types";
import { pickImageBase64 } from "../lib/image";
import { useRegionSelection } from "../lib/useRegion";
import { colors, radius, space, typography } from "../theme";

export default function Capture() {
  const router = useRouter();
  const region = useRegionSelection();
  const regionId = region?.id;
  const areaId = region?.areaId;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<AssistResponse | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [b64, setB64] = useState<string | null>(null); // 마지막 사진 — 다시 시도용
  const [n, setN] = useState(0); // 새 사진마다 답변 컴포넌트 초기화

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
    try {
      setResult(await assist({ region_id: regionId, area_id: areaId, image_base64: img }));
      setN((x) => x + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 났어요");
    } finally {
      setBusy(false);
    }
  }

  async function go(source: "camera" | "library") {
    setErr(null);
    setBusy(true);
    try {
      const img = await pickImageBase64(source);
      if (img) { setB64(img); await send(img); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 났어요");
    } finally {
      setBusy(false);
    }
  }

  const noRegion = !regionId;
  const candidate = result?.kind === "recycling" ? result.recycling : null;
  const needsConfirmation = !!(candidate?.confident && candidate.item_key && candidate.item_name);
  return (
    <ScrollView contentContainerStyle={{ padding: space.page, paddingBottom: space.section, gap: space.md }} style={{ backgroundColor: colors.bg }}>
      <Pressable accessibilityRole="button" onPress={goBack} style={{ paddingVertical: space.sm }}>
        <Text style={{ ...typography.bodyStrong, color: colors.primary }}>‹  이전 화면으로</Text>
      </Pressable>
      <Text style={{ ...typography.eyebrow, color: colors.primary }}>SALIM CAMERA</Text>
      <Text style={{ ...typography.heading, color: colors.text }}>찍어서 물어보세요</Text>
      <Text style={{ ...typography.body, color: colors.subtext }}>버릴 물건이나 청소·생활 문제를 찍어 올려 주세요.</Text>
      <View style={{ minHeight: 180, borderRadius: radius.lg, backgroundColor: colors.cameraBg,
        alignItems: "center", justifyContent: "center", gap: space.sm, padding: b64 ? space.sm : space.md, overflow: "hidden" }}>
        {b64 ? (
          <Image source={{ uri: `data:image/jpeg;base64,${b64}` }}
            style={{ width: "100%", height: 220, borderRadius: radius.md }} resizeMode="contain" />
        ) : (
          <>
            <Text style={{ fontSize: 48 }}>📷</Text>
            <Text style={{ ...typography.bodyStrong, color: colors.onCamera }}>사진 한 장으로 해결 방법 찾기</Text>
            <Text style={{ ...typography.label, color: colors.onCamera }}>물건이 잘 보이게 가까이서 찍어 주세요</Text>
          </>
        )}
      </View>
      {region && <Text style={{ color: colors.subtext }}>선택한 지역: {region.name}</Text>}
      {regionId === "nationwide" && !areaId && <Text style={{ color: colors.warn }}>
        품목별 답변은 전국 공통 방법이에요. 지역 배출 요일은 설정에서 공식 관리구역을 선택해 주세요.
      </Text>}
      {region === null && <Text style={{ color: colors.warn }}>설정에서 동네를 먼저 골라 주세요.</Text>}
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || noRegion }}
          disabled={busy || noRegion} onPress={() => go("camera")}
          style={{ flex: 1, minHeight: 54, justifyContent: "center", alignItems: "center", borderRadius: radius.button,
            backgroundColor: busy || noRegion ? colors.disabledBg : colors.primary }}>
          <Text style={{ ...typography.button, color: busy || noRegion ? colors.disabledText : colors.onPrimary }}>사진 찍기</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || noRegion }}
          disabled={busy || noRegion} onPress={() => go("library")}
          style={{ flex: 1, minHeight: 54, justifyContent: "center", alignItems: "center", borderRadius: radius.button,
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider }}>
          <Text style={{ ...typography.button, color: colors.primary }}>앨범에서 고르기</Text>
        </Pressable>
      </View>
      {busy && <Loading />}
      {err && <ErrorBox message={err} onRetry={b64 ? () => send(b64) : undefined} />}
      {result && needsConfirmation && !confirmed && (
        <View style={{ gap: space.sm, padding: space.md, borderWidth: 1, borderColor: colors.divider,
          borderRadius: radius.md, backgroundColor: colors.surface }}>
          <Text style={{ ...typography.section, color: colors.text }}>사진 속 물건이 {candidate?.item_name} 맞나요?</Text>
          <Text style={{ color: colors.subtext }}>인식 결과를 확인한 뒤 배출 방법을 확인해 주세요.</Text>
          <Btn label="맞아요 · 배출 방법 보기" onPress={() => setConfirmed(true)} />
          <Btn label="아니에요 · 이름으로 물어보기" onPress={() => { setResult(null); router.push("/ask"); }} />
          <Btn label="다시 찍기" onPress={() => go("camera")} />
        </View>
      )}
      {result && regionId && (!needsConfirmation || confirmed) &&
        <AssistCard key={n} result={result} regionId={regionId} areaId={areaId} onChange={setResult} />}
    </ScrollView>
  );
}
