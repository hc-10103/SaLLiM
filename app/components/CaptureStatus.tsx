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
export function ScanningView({ photo, steps, step, title, onCancel }: {
  photo: string | null; steps: string[]; step: number; title: string; onCancel: () => void;
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
        <Text accessibilityRole="header" style={{ ...typography.heading, fontSize: 24, color: colors.text }}>{title}</Text>
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
