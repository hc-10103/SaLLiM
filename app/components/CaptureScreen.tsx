import { useEffect, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AssistCard from "./AssistCard";
import CameraViewfinder, { type Purpose } from "./CameraViewfinder";
import { ScanningView } from "./CaptureStatus";
import Icon from "./Icon";
import { ErrorBox } from "./Status";
import { Button, Card, Notice } from "./ui";
import { assist, followUp, isMock } from "../lib/api";
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
  const [rejected, setRejected] = useState(false);
  const [b64, setB64] = useState<string | null>(null); // 마지막 사진 — 다시 시도용
  const [n, setN] = useState(0); // 새 사진마다 답변 컴포넌트 초기화
  const [step, setStep] = useState(0);
  const [purpose, setPurpose] = useState<Purpose>("recycling");
  const [checking, setChecking] = useState(false); // 추정한 품목을 사용자가 확인한 뒤 안내 불러오는 중
  const [autoFollowUp, setAutoFollowUp] = useState(false);
  const [draft, setDraft] = useState(false); // 찍은 뒤 상황 설명을 받는 단계
  const [note, setNote] = useState("");
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

  // 찍은 사진을 받아 두고 상황 설명 단계로
  function stage(img: string) {
    setB64(img);
    setNote("");
    setErr(null);
    setResult(null);
    setRejected(false);
    setDraft(true);
  }

  async function send(img: string, extra = note) {
    if (!regionId) return;
    setDraft(false);
    setErr(null);
    setResult(null);
    setConfirmed(false);
    setRejected(false);
    setAutoFollowUp(false);
    setBusy(true);
    const token = ++req.current;
    try {
      const question = extra.trim() || undefined; // 사용자가 덧붙인 상황 설명
      const res = await assist({ region_id: regionId, area_id: areaId, image_base64: img, question,
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
      if (img) stage(img);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 났어요");
    } finally {
      setPreparing(false);
      setBusy(false);
    }
  }

  // 품목을 직접 확인한 뒤에만 저장된 배출 안내를 불러온다.
  async function confirmItem(itemKey: string) {
    if (!regionId || checking || !candidate) return;
    if (candidate.confident) {
      setConfirmed(true);
      return;
    }
    setChecking(true);
    setErr(null);
    const token = ++req.current;
    try {
      const res = await followUp({ region_id: regionId, area_id: areaId,
        item_key: itemKey, state: candidate.answered_state ?? {} });
      if (token !== req.current) return;
      setResult((current) => current ? { ...current, kind: "recycling", recycling: res } : current);
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
    setRejected(false);
    setAutoFollowUp(false);
    setErr(null);
    setB64(null);
    setChecking(false);
    setDraft(false);
    setNote("");
  }

  const candidate = result?.kind === "recycling" ? result.recycling : null;
  // 상황 설명을 적었더라도 사진 속 품목까지 확인한 것은 아니다.
  const needsConfirmation = !!(candidate?.item_key && candidate.item_name && !confirmed);
  const notFound = !!result && (result.kind === "unknown" || (result.kind === "recycling" && !candidate?.item_key && !result.recycling_list?.length));
  const scanning = busy && !!b64 && !preparing;
  const regionLabel = region === null ? "전국 공통" : region?.name ?? null;

  // ⑤ 인식 중
  if (scanning) return <ScanningView photo={b64} steps={scanSteps} step={step}
    title={purpose === "recycling" ? "물건을 분석하고 있어요" : "사진 속 상황을 살펴보고 있어요"} onCancel={cancel} />;

  // 찍은 뒤: 사진 확인 + 상황 설명(선택)
  if (draft && b64 && !result) {
    const examples = purpose === "recycling"
      ? ["기름·양념이 묻어 있어요", "라벨을 못 뗐어요", "안에 내용물이 남아 있어요", "여러 재질이 붙어 있어요"]
      : ["어떻게 해결해야 할지 모르겠어요", "냄새가 나요", "얼룩이 안 지워져요"];
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: space.page, paddingTop: insets.top + space.sm, paddingBottom: space.section, gap: space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable accessibilityRole="button" accessibilityLabel="다시 찍기" onPress={retake} hitSlop={8}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44 }}>
              <Icon name="chevronLeft" size={22} color={colors.primary} />
              <Text style={{ ...typography.label, color: colors.primary }}>다시 찍기</Text>
            </Pressable>
            <Text style={{ ...typography.caption, fontWeight: "700", color: colors.subtext }}>
              {purpose === "recycling" ? "분리배출" : "생활 문제"}
            </Text>
          </View>
          <Image source={{ uri: `data:image/jpeg;base64,${b64}` }} accessibilityLabel="찍은 사진" resizeMode="cover"
            style={{ width: "100%", aspectRatio: 4 / 3, maxHeight: 320, borderRadius: radius.sheet, borderCurve: "continuous",
              backgroundColor: colors.cameraBg }} />
          <View style={{ gap: space.xs }}>
            <Text accessibilityRole="header" style={{ ...typography.section, color: colors.text }}>상황을 덧붙여 주세요</Text>
            <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext }}>
              {purpose === "recycling" ? "사진만으로 안 보이는 건 글로 알려주면 더 정확해요. 비워 둬도 괜찮아요."
                : "어떤 점이 궁금한지 덧붙이면 상황을 더 잘 이해할 수 있어요. 비워 둬도 괜찮아요."}
            </Text>
          </View>
          <TextInput accessibilityLabel="사진 상황 설명" value={note} onChangeText={setNote} multiline maxLength={200}
            placeholder={purpose === "recycling" ? "예: 기름이 묻은 배달 용기예요, 뚜껑은 다른 재질이에요" : "예: 욕실 실리콘에 검은 얼룩이 생겼어요"}
            placeholderTextColor={colors.disabledText}
            style={{ minHeight: 96, padding: space.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
              borderRadius: radius.button, borderCurve: "continuous", color: colors.text, textAlignVertical: "top", ...typography.body }} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
            {examples.map((e) => (
              <Pressable key={e} accessibilityRole="button" accessibilityLabel={`${e} 추가`}
                onPress={() => setNote((v) => (v.includes(e) ? v : (v.trim() ? `${v.trim()} ${e}` : e)).slice(0, 200))}
                style={({ pressed }) => ({ paddingHorizontal: space.smPlus, minHeight: 34, justifyContent: "center", borderRadius: radius.pill,
                  borderWidth: 1, borderColor: colors.divider, backgroundColor: pressed ? colors.tint : colors.surface })}>
                <Text style={{ ...typography.caption, fontWeight: "600", color: colors.text }}>+ {e}</Text>
              </Pressable>
            ))}
          </View>
          {isMock && <Notice tone="warn" title="예시 모드 — 서버에 연결되지 않았어요">지금은 실제 인식 대신 고정된 예시 결과가 나와요.</Notice>}
          <Button label={note.trim() ? "설명과 함께 분석하기" : "사진만으로 분석하기"} icon="sparkle" onPress={() => send(b64)} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ④ 촬영 — 결과가 없으면 카메라 뷰파인더
  if (!result) {
    return <CameraViewfinder purpose={purpose} onPurpose={(p) => { setPurpose(p); setErr(null); }}
      onShot={stage} onPick={go} onAskByName={() => router.push("/ask")}
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
      {region === null && purpose === "recycling" && <Notice tone="info" title="지금은 전국 공통 기준으로 답해요">설정에서 동네를 고르면 배출 요일까지 알려드려요.</Notice>}

      {err && !needsConfirmation && <ErrorBox message={err} onRetry={b64 ? () => send(b64) : undefined} />}
      {needsConfirmation && (
        <Card style={{ gap: space.smPlus }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ ...typography.caption, color: colors.subtext }}>AI가 추정한 물건</Text>
            {typeof candidate?.confidence === "number" && candidate.confidence > 0 && (
              <View style={{ paddingHorizontal: space.smPlus, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.primarySoft }}>
                <Text style={{ ...typography.caption, fontWeight: "700", color: colors.primary }}>확신도 {Math.round(candidate.confidence * 100)}% · 참고용</Text>
              </View>
            )}
          </View>
          <Text style={{ ...typography.resultTitle, color: colors.text }}>
            {rejected ? "다른 물건이군요" : `${candidate?.item_name} 맞나요?`}
          </Text>
          <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext }}>
            {rejected ? "이름을 직접 입력하거나 다시 촬영해 주세요." : "사진 속 물건을 확인하면 배출 방법을 보여드려요."}
          </Text>
          {rejected ? <>
            <Button label="이름 직접 입력하기" icon="search" onPress={() => { retake(); router.push("/ask"); }} />
            <Button label="다시 촬영하기" icon="camera" variant="secondary" onPress={retake} />
            <Button label="추정 결과 다시 보기" variant="text" onPress={() => setRejected(false)} />
          </> : <>
            <Button label="맞아요, 배출 방법 보기" icon="check" loading={checking} disabled={checking}
              onPress={() => confirmItem(candidate!.item_key!)} />
            <Button label="아니요, 다른 물건이에요" variant="secondary" disabled={checking}
              onPress={() => setRejected(true)} />
          </>}
          {err && <ErrorBox message={err} onRetry={() => confirmItem(candidate!.item_key!)} />}
        </Card>
      )}
      {regionId && (!needsConfirmation || confirmed) &&
        <AssistCard key={n} result={result} regionId={regionId} areaId={areaId} onChange={setResult} autoOpenFollowUp={autoFollowUp} />}
      {/* 못 알아봤을 때: 같은 사진에 설명을 더해 다시 분석 */}
      {notFound && b64 && (
        <Card style={{ gap: space.smPlus }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
            <Icon name="chat" size={20} color={colors.primary} />
            <Text style={{ ...typography.section, color: colors.text }}>추가로 설명해 주세요</Text>
          </View>
          <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext }}>
            {purpose === "recycling" ? "물건 이름, 재질, 어떤 상태인지 적어 주면 같은 사진으로 다시 분석해요."
              : "어떤 문제가 생겼고 무엇이 궁금한지 적어 주면 같은 사진으로 다시 분석해요."}
          </Text>
          <TextInput accessibilityLabel="추가 설명" value={note} onChangeText={setNote} multiline maxLength={200}
            placeholder={purpose === "recycling" ? "예: 일반쓰레기를 모은 종량제 봉투예요 / 코팅된 종이컵이에요"
              : "예: 욕실 실리콘에 검은 얼룩이 생겼는데 어떻게 지워요?"} placeholderTextColor={colors.disabledText}
            style={{ minHeight: 80, padding: space.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
              borderRadius: radius.button, borderCurve: "continuous", color: colors.text, textAlignVertical: "top", ...typography.body }} />
          <Button label="설명 더해서 다시 분석하기" icon="refresh" disabled={!note.trim() || busy} onPress={() => send(b64)} />
        </Card>
      )}
    </ScrollView>
  );
}
