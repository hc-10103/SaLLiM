import { ActivityIndicator, Text, View } from "react-native";
import { colors, radius, space, typography } from "../theme";
import Icon from "./Icon";
import { Button } from "./ui";

export function Loading({ label = "확인하는 중이에요" }: { label?: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: space.smPlus,
      padding: space.md, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ ...typography.label, color: colors.text }}>{label}</Text>
    </View>
  );
}

// 기존 화면 호환용 보조 버튼
export function Btn({ label, onPress, disabled, variant = "secondary" }: {
  label: string; onPress: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "soft";
}) {
  return <Button label={label} onPress={onPress} disabled={disabled} variant={variant} />;
}

// 새 결과를 못 받았음을 알리고 같은 요청을 다시 보낼 수 있게 한다 (입력은 부모가 유지)
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View accessibilityRole="alert" style={{ gap: space.smPlus, padding: space.md, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.errorBg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Icon name="warning" size={20} color={colors.error} />
        <Text style={{ ...typography.bodyStrong, color: colors.error }}>결과를 받지 못했어요</Text>
      </View>
      <Text style={{ ...typography.label, fontWeight: "500", color: colors.error }}>{message}</Text>
      {onRetry && <Button label="다시 시도하기" icon="refresh" variant="secondary" onPress={onRetry} />}
    </View>
  );
}
