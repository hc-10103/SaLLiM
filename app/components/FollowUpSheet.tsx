import { Text, View } from "react-native";
import { BottomSheet, Host } from "@expo/ui";
import Icon from "./Icon";
import { Button } from "./ui";
import { colors, space, typography } from "../theme";

// 되묻기 바텀시트 (시안 ⑦). expo-ui 스킬: 시트는 @expo/ui BottomSheet, children은 RN 뷰.
export default function FollowUpSheet({ open, question, itemName, busy, onAnswer, onClose }: {
  open: boolean;
  question: string;
  itemName?: string | null;
  busy: boolean | null;
  onAnswer: (yes: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Host matchContents>
      <BottomSheet isPresented={open} onDismiss={onClose} containerColor={colors.surface}
        contentPadding={{ top: space.sm, bottom: space.lg, left: space.page, right: space.page }}>
        <View style={{ gap: space.md, paddingTop: space.sm }}>
          <View style={{ width: 52, height: 52, borderRadius: 18, borderCurve: "continuous", backgroundColor: colors.primarySoft,
            alignItems: "center", justifyContent: "center" }}>
            <Icon name="info" size={26} color={colors.primary} />
          </View>
          <View style={{ gap: space.xs }}>
            {itemName && <Text style={{ ...typography.label, color: colors.primary }}>{itemName} 확인</Text>}
            <Text accessibilityRole="header" style={{ ...typography.heading, fontSize: 22, lineHeight: 30, color: colors.text }}>{question}</Text>
            <Text style={{ ...typography.body, color: colors.subtext }}>답에 따라 배출 방법이 달라져요.</Text>
          </View>
          <View style={{ gap: space.sm }}>
            <Button label="예" loading={busy === true} disabled={busy !== null} onPress={() => onAnswer(true)} />
            <Button label="아니오" variant="secondary" loading={busy === false} disabled={busy !== null} onPress={() => onAnswer(false)} />
            <Button label="나중에 답할게요" variant="text" disabled={busy !== null} onPress={onClose} />
          </View>
        </View>
      </BottomSheet>
    </Host>
  );
}
