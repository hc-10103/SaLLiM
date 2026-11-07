import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import Icon from "./Icon";
import { Button } from "./ui";
import { colors, radius, space, typography } from "../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// 시안 ⑤ 인식 중 — 사진을 원형 진행 링 안에 보여주고 단계별로 무엇을 하는지 알려준다.
// 단계는 체감용 안내(실제 처리 시간 아님) — 응답이 오기 전엔 마지막 단계에서 멈춘다.
export function ScanningView({ photo, steps, step, onCancel }: {
  photo: string | null; steps: string[]; step: number; onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const size = 208;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const [progress] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // 단계마다 진행 링을 채운다. 마지막 단계는 90%까지만 (응답이 오면 화면이 바뀐다)
    const target = Math.min((step + 1) / steps.length, 0.9);
    Animated.timing(progress, { toValue: target, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [step, steps.length, progress]);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [len, 0] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View accessibilityLiveRegion="polite" style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top + space.lg,
      paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.page, justifyContent: "center", gap: space.xl }}>
      <View style={{ alignSelf: "center", width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", width: size - stroke * 2 - 8, height: size - stroke * 2 - 8,
          borderRadius: size, overflow: "hidden", backgroundColor: colors.tint }}>
          {photo && <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} accessibilityLabel="분석 중인 사진"
            style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
          {/* 사진 위를 지나가는 스캔 빛 */}
          <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            alignItems: "center", transform: [{ rotate }] }}>
            <View style={{ width: 3, height: "50%", backgroundColor: "rgba(255,255,255,0.85)",
              boxShadow: "0 0 12px rgba(37, 99, 235, 0.9)" }} />
          </Animated.View>
        </View>
        <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.tintStrong} strokeWidth={stroke} fill="none" />
          <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={colors.primary} strokeWidth={stroke} fill="none"
            strokeLinecap="round" strokeDasharray={`${len} ${len}`} strokeDashoffset={dashOffset} />
        </Svg>
      </View>

      <View style={{ alignItems: "center", gap: space.xs }}>
        <Text accessibilityRole="header" style={{ ...typography.heading, fontSize: 24, color: colors.text }}>물건을 분석하고 있어요</Text>
        <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext }}>보통 5~10초 걸려요</Text>
      </View>

      <View style={{ alignSelf: "center", gap: space.smPlus, minWidth: 240, padding: space.md, borderRadius: radius.lg,
        borderCurve: "continuous", backgroundColor: colors.bg }}>
        {steps.map((label, i) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 28 }}>
            {i < step ? <Icon name="checkCircle" size={22} color={colors.primary} />
              : i === step ? <ActivityIndicator size="small" color={colors.primary} style={{ width: 22 }} />
              : <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border }} />}
            <Text style={{ ...typography.body, fontWeight: i === step ? "700" : "400",
              color: i <= step ? colors.text : colors.subtext }}>{label}</Text>
          </View>
        ))}
      </View>

      <Button label="취소" variant="secondary" style={{ alignSelf: "center", minWidth: 140 }} onPress={onCancel} />
    </View>
  );
}

function euro(w: string) {
  const last = w.match(/[가-힣]/g)?.at(-1) ?? "";
  if (!last) return "로";
  const c = last.charCodeAt(0) - 0xac00;
  return c % 28 === 0 || c % 28 === 8 ? "로" : "으로";
}

// 시안 ⑨ 확신 낮음 — 추정한 품목을 확정처럼 보여주지 않고, 확인 방법을 고르게 한다.
export function LowConfidenceView({ itemName, confidence, photo, busy, onConfirm, onRetake, onAskByName }: {
  itemName: string; confidence?: number | null; photo: string | null; busy?: boolean;
  onConfirm: () => void; onRetake: () => void; onAskByName: () => void;
}) {
  const insets = useSafeAreaInsets();
  const pct = typeof confidence === "number" && confidence > 0 ? Math.round(confidence * 100) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top + space.lg,
      paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.page, justifyContent: "center", gap: space.xl }}>
      <View style={{ alignSelf: "center", width: 132, height: 132, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", width: 132, height: 132, borderRadius: 66, backgroundColor: colors.warnBg }} />
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "#FDE7A8", alignItems: "center", justifyContent: "center" }}>
          <Icon name="warning" size={46} color={colors.warn} strokeWidth={2} />
        </View>
        {photo && (
          <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} accessibilityLabel="찍은 사진"
            style={{ position: "absolute", right: -6, bottom: -6, width: 52, height: 52, borderRadius: 14,
              borderWidth: 3, borderColor: colors.surface }} />
        )}
      </View>

      <View style={{ alignItems: "center", gap: space.sm }}>
        <Text style={{ ...typography.eyebrow, color: colors.warn }}>확신이 낮아요</Text>
        <Text accessibilityRole="header" style={{ ...typography.resultTitle, color: colors.text, textAlign: "center" }}>
          {itemName}{euro(itemName)} 보여요
        </Text>
        {pct !== null && (
          <View style={{ paddingHorizontal: space.smPlus, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.warnBg }}>
            <Text style={{ ...typography.label, color: colors.warn }}>확신 {pct}%</Text>
          </View>
        )}
        <Text style={{ ...typography.body, color: colors.subtext, textAlign: "center", maxWidth: 320 }}>
          사진만으로는 정확히 판단하기 어려워요.{"\n"}질문 몇 개에 답하면 정확한 배출 방법을 알려드릴게요.
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Button label="되묻기 질문으로 확인하기" icon="chat" loading={busy} disabled={busy} onPress={onConfirm} />
        <Button label="다시 찍기" icon="camera" variant="secondary" disabled={busy} onPress={onRetake} />
        <Button label="이름으로 직접 묻기" variant="text" disabled={busy} onPress={onAskByName} />
      </View>
    </View>
  );
}
