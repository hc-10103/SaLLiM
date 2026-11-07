import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AssistCard from "./AssistCard";
import CameraViewfinder, { type Purpose } from "./CameraViewfinder";
import { LowConfidenceView, ScanningView } from "./CaptureStatus";
import Icon from "./Icon";
import { ErrorBox } from "./Status";
import { Button, Card, Notice } from "./ui";
import { assist, isMock } from "../lib/api";
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
  const [purpose, setPurpose] = useState<Purpose>("recycling");
  const [checking, setChecking] = useState(false); // ⑨ 되묻기로 확인 중
  const [autoFollowUp, setAutoFollowUp] = useState(false);
  const req = useRef(0); // 취소하면 늦게 온 응답을 버린다
  const scanSteps = purpose === "recycling"
    ? ["이미지 분석", "품목 분류", "우리 동네 규칙 확인"]
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
    setAutoFollowUp(false);
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

  // ⑨ → 품목 이름으로 다시 물어 확정 답 + 되묻기 질문을 받는다 (사진 분석은 다시 안 함)
  async function confirmByQuestion(name: string) {
    if (!regionId || checking) return;
    setChecking(true);
    setErr(null);
    const token = ++req.current;
    try {
      const res = await assist({ region_id: regionId, area_id: areaId, question: `${name} 분리배출 방법`, purpose: "recycling" });
      if (token !== req.current) return;
      setResult(res);
      setConfirmed(true);
      setAutoFollowUp(true);
      setN((x) => x + 1);
    } catch (e) {
      if (token === req.current) setErr(e instanceof Error ? e.message : "오류가 났어요");
    } finally {
      if (token === req.current) setChecking(false);
    }
  }

  function retake() {
    req.current++;
    setResult(null);
    setConfirmed(false);
    setAutoFollowUp(false);
    setErr(null);
    setB64(null);
    setChecking(false);
  }

  const candidate = result?.kind === "recycling" ? result.recycling : null;
  const needsConfirmation = !!(candidate?.confident && candidate.item_key && candidate.item_name);
  const lowConfidence = !!(candidate && !candidate.confident && candidate.item_key && candidate.item_name && !confirmed);
  const scanning = busy && !!b64 && !preparing;
  const regionLabel = region === null ? "전국 공통" : region?.name ?? null;

  // ⑤ 인식 중
  if (scanning) return <ScanningView photo={b64} steps={scanSteps} step={step} onCancel={cancel} />;

  // ⑨ 확신 낮음
  if (lowConfidence && candidate?.item_name) {
    return <View style={{ flex: 1 }}>
      <LowConfidenceView itemName={candidate.item_name} confidence={candidate.confidence} photo={b64} busy={checking}
        onConfirm={() => confirmByQuestion(candidate.item_name!)} onRetake={retake}
        onAskByName={() => { retake(); router.push("/ask"); }} />
      {err && <View style={{ position: "absolute", left: space.page, right: space.page, bottom: insets.bottom + space.lg }}>
        <ErrorBox message={err} onRetry={() => confirmByQuestion(candidate.item_name!)} />
      </View>}
    </View>;
  }

  // ④ 촬영 — 결과가 없으면 카메라 뷰파인더
  if (!result) {
    return <CameraViewfinder purpose={purpose} onPurpose={(p) => { setPurpose(p); setErr(null); }}
      onShot={(img) => { setB64(img); send(img); }} onPick={go} onAskByName={() => router.push("/ask")}
      onBack={asTab ? undefined : goBack} regionLabel={isMock ? "예시 모드(서버 미연결) ·" + (regionLabel ? ` ${regionLabel}` : "") : regionLabel} disabled={busy || !regionId} error={err} />;
  }

  // 결과
  return (
    <ScrollView style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.page, paddingTop: insets.top + space.sm, paddingBottom: space.section, gap: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="다시 찍기" onPress={retake} hitSlop={8}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44 }}>
          <Icon name="camera" size={20} color={colors.primary} />
          <Text style={{ ...typography.label, color: colors.primary }}>다시 찍기</Text>
        </Pressable>
        {b64 && <Image source={{ uri: `data:image/jpeg;base64,${b64}` }} accessibilityLabel="찍은 사진"
          style={{ width: 44, height: 44, borderRadius: radius.button, borderCurve: "continuous" }} />}
      </View>

      {isMock && <Notice tone="warn" title="예시 모드 — 서버에 연결되지 않았어요">
        지금 결과는 실제 인식이 아닌 고정된 예시예요. app/.env에 EXPO_PUBLIC_API_URL을 넣고 npx expo start -c로 다시 켜 주세요.
      </Notice>}
      {region === null && <Notice tone="info" title="지금은 전국 공통 기준으로 답해요">설정에서 동네를 고르면 배출 요일까지 알려드려요.</Notice>}

      {err && <ErrorBox message={err} onRetry={b64 ? () => send(b64) : undefined} />}
      {needsConfirmation && !confirmed && (
        <Card style={{ gap: space.smPlus }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ ...typography.caption, color: colors.subtext }}>사진 속 물건이</Text>
            {typeof candidate?.confidence === "number" && candidate.confidence > 0 && (
              <View style={{ paddingHorizontal: space.smPlus, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.primarySoft }}>
                <Text style={{ ...typography.caption, fontWeight: "700", color: colors.primary }}>확신 {Math.round(candidate.confidence * 100)}%</Text>
              </View>
            )}
          </View>
          <Text style={{ ...typography.resultTitle, color: colors.text }}>{candidate?.item_name} 맞나요?</Text>
          <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext }}>확인하면 배출 방법과 다음 배출일을 보여드려요.</Text>
          <Button label="맞아요, 배출 방법 보기" icon="check" onPress={() => setConfirmed(true)} />
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button label="다시 찍기" variant="secondary" style={{ flex: 1 }} onPress={retake} />
            <Button label="이름으로 묻기" variant="secondary" style={{ flex: 1 }} onPress={() => { retake(); router.push("/ask"); }} />
          </View>
        </Card>
      )}
      {regionId && (!needsConfirmation || confirmed) &&
        <AssistCard key={n} result={result} regionId={regionId} areaId={areaId} onChange={setResult} autoOpenFollowUp={autoFollowUp} />}
    </ScrollView>
  );
}
