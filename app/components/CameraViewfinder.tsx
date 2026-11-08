import { useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, Text, useWindowDimensions, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { Button } from "./ui";
import { uriToJpegBase64 } from "../lib/image";
import { colors, radius, space, typography } from "../theme";

export type Purpose = "general" | "recycling";

type Props = {
  purpose: Purpose;
  onPurpose: (p: Purpose) => void;
  onShot: (b64: string) => void;       // 셔터로 찍은 사진
  onPick: (source: "camera" | "library") => void; // 앨범(또는 카메라 없을 때 시스템 카메라)
  onAskByName: () => void;
  onBack?: () => void;                 // 탭이 아닐 때만
  regionLabel?: string | null;
  disabled?: boolean;
  error?: string | null;
};

// 시안 ④ 촬영 — 실제 카메라 뷰파인더
export default function CameraViewfinder({ purpose, onPurpose, onShot, onPick, onAskByName, onBack,
  regionLabel, disabled, error }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const focused = useIsFocused(); // 다른 탭으로 가면 카메라를 끈다
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [shotError, setShotError] = useState<string | null>(null);

  const frame = Math.min(width - space.page * 2 - 24, 320);
  const granted = !!perm?.granted;
  const cameraUsable = granted && !mountError;

  async function shoot() {
    if (!cam.current || !ready || shooting || disabled) return;
    setShotError(null);
    setShooting(true);
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.9 });
      if (!pic?.uri) throw new Error("사진을 찍지 못했어요.");
      const b64 = await uriToJpegBase64(pic.uri, pic.width, pic.height);
      setTorch(false);
      onShot(b64);
    } catch (e) {
      setShotError(e instanceof Error ? e.message : "사진을 찍지 못했어요. 다시 시도해 주세요.");
    } finally {
      setShooting(false);
    }
  }

  const roundBtn = { width: 44, height: 44, borderRadius: 22, alignItems: "center" as const, justifyContent: "center" as const,
    backgroundColor: "rgba(255,255,255,0.14)" };

  return (
    <View style={{ flex: 1, backgroundColor: colors.cameraBg }}>
      {cameraUsable && focused && (
        <CameraView ref={cam} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} facing="back"
          enableTorch={torch} onCameraReady={() => setReady(true)}
          onMountError={(e) => setMountError(e.message || "카메라를 열지 못했어요.")} />
      )}
      {/* 화면 위아래를 살짝 어둡게 — 흰 글씨가 잘 보이게 */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 64,
        backgroundColor: "rgba(11,18,32,0.35)" }} />
      <View pointerEvents="none" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200,
        backgroundColor: "rgba(11,18,32,0.35)" }} />

      {/* 상단: 뒤로 · 목적 선택 · 플래시 */}
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.page, flexDirection: "row",
        alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="이전 화면으로" onPress={onBack} hitSlop={6} style={roundBtn}>
            <Icon name="close" size={22} color={colors.onCamera} />
          </Pressable>
        ) : <View style={{ width: 44 }} />}
        <View style={{ flexDirection: "row", padding: 3, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.14)" }}>
          {([["recycling", "분리배출"], ["general", "생활 문제"]] as const).map(([value, label]) => {
            const selected = purpose === value;
            return (
              <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onPurpose(value)}
                style={{ paddingHorizontal: space.md, minHeight: 36, justifyContent: "center", borderRadius: radius.pill,
                  backgroundColor: selected ? colors.surface : "transparent" }}>
                <Text style={{ ...typography.label, color: selected ? colors.primary : colors.onCamera }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {cameraUsable && Platform.OS !== "web" ? (
          <Pressable accessibilityRole="button" accessibilityLabel={torch ? "플래시 끄기" : "플래시 켜기"}
            accessibilityState={{ selected: torch }} onPress={() => setTorch((t) => !t)} hitSlop={6}
            style={{ ...roundBtn, backgroundColor: torch ? "#FDE68A" : roundBtn.backgroundColor }}>
            <Icon name="flash" size={22} color={torch ? "#92400E" : colors.onCamera} filled={torch} />
          </Pressable>
        ) : <View style={{ width: 44 }} />}
      </View>

      {/* 가운데: 가이드 프레임 */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.md }}>
        <Text style={{ ...typography.bodyStrong, color: colors.onCamera, textAlign: "center" }}>
          {cameraUsable ? (purpose === "recycling" ? "버릴 물건을 네모 안에 맞춰 주세요" : "도움이 필요한 상황을 네모 안에 담아 주세요") : " "}
        </Text>
        <View style={{ width: frame, height: frame, alignItems: "center", justifyContent: "center" }}>
          <Corners />
          {!perm && <ActivityIndicator color={colors.onCamera} />}
          {perm && !cameraUsable && (
            <View style={{ alignItems: "center", gap: space.sm, paddingHorizontal: space.lg }}>
              <Icon name="camera" size={40} color={colors.onCamera} strokeWidth={1.5} />
              <Text style={{ ...typography.bodyStrong, color: colors.onCamera, textAlign: "center" }}>
                {mountError ? "이 기기에서 카메라를 열 수 없어요" : "카메라 권한이 필요해요"}
              </Text>
              <Text style={{ ...typography.caption, color: "#CBD5E1", textAlign: "center" }}>
                {mountError ? "아래 버튼으로 사진을 골라 주세요." : purpose === "recycling"
                  ? "물건을 찍어서 배출 방법을 알려드려요." : "사진과 설명으로 생활 문제를 함께 살펴봐요."}
              </Text>
              {!mountError && (perm.canAskAgain
                ? <Button label="카메라 허용하기" icon="camera" onPress={() => requestPerm()} style={{ marginTop: space.xs }} />
                : <Button label="설정에서 허용하기" icon="settings" onPress={() => Linking.openSettings()} style={{ marginTop: space.xs }} />)}
              {mountError && <Button label="사진 찍기" icon="camera" onPress={() => onPick("camera")} style={{ marginTop: space.xs }} />}
            </View>
          )}
          {cameraUsable && !ready && focused && <ActivityIndicator color={colors.onCamera} />}
        </View>
        {(error || shotError) && (
          <View accessibilityLiveRegion="polite" style={{ marginHorizontal: space.page, paddingHorizontal: space.md, paddingVertical: space.sm,
            borderRadius: radius.button, backgroundColor: "rgba(185,28,28,0.9)" }}>
            <Text style={{ ...typography.caption, color: colors.onCamera, textAlign: "center" }}>{shotError || error}</Text>
          </View>
        )}
      </View>

      {/* 하단: 앨범 · 셔터 · (균형용 빈칸) */}
      <View style={{ paddingBottom: space.lg, paddingHorizontal: space.page, gap: space.md }}>
        {regionLabel && purpose === "recycling" && (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Icon name="pin" size={14} color="#CBD5E1" />
            <Text style={{ ...typography.caption, color: "#CBD5E1" }}>{regionLabel} 기준으로 안내해요</Text>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.md }}>
          <Pressable accessibilityRole="button" accessibilityLabel="앨범에서 사진 고르기" disabled={disabled}
            onPress={() => onPick("library")} hitSlop={6}
            style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 14, borderCurve: "continuous", alignItems: "center",
              justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)",
              backgroundColor: pressed ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)" })}>
            <Icon name="image" size={24} color={colors.onCamera} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="사진 찍기"
            disabled={disabled || shooting || (cameraUsable && !ready)}
            onPress={cameraUsable ? shoot : () => onPick("camera")}
            style={({ pressed }) => ({ width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: colors.onCamera,
              alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : 1 })}>
            {({ pressed }) => (
              <View style={{ width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center",
                backgroundColor: pressed ? "#DBE4F5" : colors.onCamera, transform: [{ scale: pressed ? 0.94 : 1 }] }}>
                {shooting && <ActivityIndicator color={colors.primary} />}
              </View>
            )}
          </Pressable>
          <View style={{ width: 52 }} />
        </View>
        <Pressable accessibilityRole="button" onPress={onAskByName}
          style={({ pressed }) => ({ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: space.xs,
            paddingHorizontal: space.md, minHeight: 40, borderRadius: radius.pill,
            backgroundColor: pressed ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)" })}>
          <Icon name="search" size={16} color={colors.onCamera} />
          <Text style={{ ...typography.label, color: colors.onCamera }}>{purpose === "recycling" ? "이름으로 물어보기" : "글로 물어보기"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// 뷰파인더 모서리 가이드
function Corners() {
  const c = { position: "absolute" as const, width: 40, height: 40, borderColor: "#FFFFFF" };
  return <>
    <View style={{ ...c, top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 }} />
    <View style={{ ...c, top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 }} />
    <View style={{ ...c, bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 }} />
    <View style={{ ...c, bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 }} />
  </>;
}
