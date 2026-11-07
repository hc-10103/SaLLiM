import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { colors, radius, shadow, sizes, space, typography } from "../theme";
import Icon, { type IconName } from "./Icon";

type ButtonVariant = "primary" | "secondary" | "soft" | "text";

// 공통 버튼: 주(파랑) / 보조(흰 바탕+테두리) / 연한 파랑 / 텍스트. 눌림은 색만 바꾼다(모션 줄이기와 무관하게 안전).
export function Button({ label, onPress, variant = "primary", icon, disabled, loading, style, accessibilityLabel }: {
  label: string; onPress: () => void; variant?: ButtonVariant; icon?: IconName; disabled?: boolean;
  loading?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const off = disabled || loading;
  const fg = off ? colors.disabledText
    : variant === "primary" ? colors.onPrimary : colors.primary;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!off, busy: !!loading }} disabled={off} onPress={onPress}
      style={({ pressed }) => [{
        minHeight: variant === "text" ? sizes.touchMin : sizes.buttonMinHeight,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
        paddingHorizontal: space.md, borderRadius: radius.button, borderCurve: "continuous",
        backgroundColor: off ? (variant === "text" ? "transparent" : colors.disabledBg)
          : variant === "primary" ? (pressed ? colors.primaryPressed : colors.primary)
          : variant === "secondary" ? (pressed ? colors.tint : colors.surface)
          : variant === "soft" ? (pressed ? colors.tintStrong : colors.primarySoft)
          : (pressed ? colors.tint : "transparent"),
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor: off ? colors.disabledBg : colors.border,
      }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text style={{ ...typography.button, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, borderCurve: "continuous", padding: padded ? space.md : 0,
    borderWidth: 1, borderColor: colors.divider, boxShadow: shadow.card }, style]}>{children}</View>;
}

export function Chip({ label, onPress, selected, icon, leading }: {
  label: string; onPress?: () => void; selected?: boolean; icon?: IconName; leading?: ReactNode;
}) {
  const content = <>
    {leading}
    {icon && <Icon name={icon} size={16} color={selected ? colors.onPrimary : colors.primary} />}
    <Text style={{ ...typography.label, color: selected ? colors.onPrimary : colors.text }}>{label}</Text>
  </>;
  const base: ViewStyle = { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 36,
    paddingHorizontal: space.smPlus, borderRadius: radius.pill, borderWidth: 1,
    backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.divider };
  if (!onPress) return <View style={base}>{content}</View>;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress}
    hitSlop={4} style={({ pressed }) => [base, pressed && !selected && { backgroundColor: colors.tint }]}>{content}</Pressable>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
    <Text accessibilityRole="header" style={{ ...typography.section, color: colors.text }}>{title}</Text>
    {action && onAction && <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}
      style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: sizes.touchMin }}>
      <Text style={{ ...typography.label, color: colors.primary }}>{action}</Text>
      <Icon name="chevronRight" size={16} color={colors.primary} />
    </Pressable>}
  </View>;
}

// 화면 상단 제목 영역
export function ScreenTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return <View style={{ gap: space.xs, paddingTop: space.sm }}>
    {eyebrow && <Text style={{ ...typography.eyebrow, color: colors.primary }}>{eyebrow}</Text>}
    <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.text }}>{title}</Text>
    {subtitle && <Text style={{ ...typography.body, color: colors.subtext }}>{subtitle}</Text>}
  </View>;
}

// 경고·안내 박스 (확신 낮음, 예시 데이터, 지역 미선택 등). 결과 첫 화면에 둔다.
export function Notice({ tone = "info", title, children, icon }: {
  tone?: "info" | "warn" | "error" | "success"; title?: string; children?: ReactNode; icon?: IconName;
}) {
  const palette = {
    info: { bg: colors.tint, fg: colors.primary, text: colors.text, icon: "info" as IconName },
    warn: { bg: colors.warnBg, fg: colors.warn, text: colors.warn, icon: "warning" as IconName },
    error: { bg: colors.errorBg, fg: colors.error, text: colors.error, icon: "warning" as IconName },
    success: { bg: colors.successBg, fg: colors.success, text: colors.success, icon: "checkCircle" as IconName },
  }[tone];
  return <View accessibilityRole={tone === "error" || tone === "warn" ? "alert" : undefined}
    style={{ flexDirection: "row", gap: space.sm, padding: space.smPlus, borderRadius: radius.button, borderCurve: "continuous", backgroundColor: palette.bg }}>
    <View style={{ paddingTop: 1 }}><Icon name={icon ?? palette.icon} size={18} color={palette.fg} /></View>
    <View style={{ flex: 1, gap: 2 }}>
      {title && <Text style={{ ...typography.label, fontWeight: "700", color: palette.fg }}>{title}</Text>}
      {typeof children === "string"
        ? <Text style={{ ...typography.caption, color: palette.text }}>{children}</Text> : children}
    </View>
  </View>;
}

// 동그란 아이콘 타일
export function IconTile({ name, size = 44, bg = colors.primarySoft, color = colors.primary }: {
  name: IconName; size?: number; bg?: string; color?: string;
}) {
  return <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg,
    alignItems: "center", justifyContent: "center" }}>
    <Icon name={name} size={Math.round(size * 0.5)} color={color} />
  </View>;
}
