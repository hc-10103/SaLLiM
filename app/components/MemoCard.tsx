import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useHomeMemo } from "../lib/memo";
import { colors, radius, space, typography } from "../theme";
import Icon from "./Icon";

const EXAMPLES = ["쓰레기봉투 사기", "목요일 투명페트 내놓기", "세제 리필"];

// 홈 '자취 메모' — 체크리스트형 메모지
export default function MemoCard() {
  const { items, ready, add, toggle, remove, clearDone } = useHomeMemo();
  const [text, setText] = useState("");
  const doneCount = items.filter((m) => m.done).length;

  function submit(value = text) {
    add(value);
    setText("");
  }

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderCurve: "continuous", padding: space.md, gap: space.smPlus }}>
      {/* 입력 */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, paddingLeft: space.smPlus, paddingRight: 4,
        minHeight: 48, borderRadius: radius.button, borderCurve: "continuous", backgroundColor: "#F1F4F9" }}>
        <Icon name="check" size={18} color={colors.subtext} />
        <TextInput value={text} onChangeText={setText} onSubmitEditing={() => submit()} returnKeyType="done"
          accessibilityLabel="메모 추가" placeholder="오늘 사야 할 것, 잊으면 안 되는 것" placeholderTextColor={colors.disabledText}
          maxLength={80} style={{ flex: 1, minHeight: 44, ...typography.body, color: colors.text }} />
        <Pressable accessibilityRole="button" accessibilityLabel="메모 추가" disabled={!text.trim()} onPress={() => submit()}
          style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 12, borderCurve: "continuous", alignItems: "center", justifyContent: "center",
            backgroundColor: !text.trim() ? "transparent" : pressed ? colors.primaryPressed : colors.primary })}>
          <Icon name="send" size={20} color={text.trim() ? colors.onPrimary : colors.disabledText} strokeWidth={2} />
        </Pressable>
      </View>

      {/* 비었을 때: 예시 */}
      {ready && items.length === 0 && (
        <View style={{ gap: space.sm }}>
          <Text style={{ ...typography.caption, color: colors.subtext }}>이렇게 적어 보세요</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
            {EXAMPLES.map((e) => (
              <Pressable key={e} accessibilityRole="button" accessibilityLabel={`${e} 메모 추가`} onPress={() => submit(e)}
                style={({ pressed }) => ({ paddingHorizontal: space.smPlus, minHeight: 34, justifyContent: "center",
                  borderRadius: radius.pill, borderWidth: 1, borderColor: colors.divider, backgroundColor: pressed ? colors.tint : colors.surface })}>
                <Text style={{ ...typography.caption, fontWeight: "600", color: colors.text }}>+ {e}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* 목록 */}
      {items.map((m) => (
        <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: m.done }} accessibilityLabel={m.text}
            onPress={() => toggle(m.id)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: space.smPlus, minHeight: 44 }}>
            <View style={{ width: 24, height: 24, borderRadius: 8, borderCurve: "continuous", borderWidth: m.done ? 0 : 1.75,
              borderColor: colors.border, backgroundColor: m.done ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
              {m.done && <Icon name="check" size={16} color={colors.onPrimary} strokeWidth={2.6} />}
            </View>
            <Text style={{ flex: 1, ...typography.body, color: m.done ? colors.disabledText : colors.text,
              textDecorationLine: m.done ? "line-through" : "none" }}>{m.text}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${m.text} 지우기`} onPress={() => remove(m.id)} hitSlop={6}
            style={{ width: 36, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={16} color={colors.disabledText} />
          </Pressable>
        </View>
      ))}

      {doneCount > 0 && (
        <Pressable accessibilityRole="button" onPress={clearDone} hitSlop={6} style={{ alignSelf: "flex-end", minHeight: 36, justifyContent: "center" }}>
          <Text style={{ ...typography.caption, fontWeight: "600", color: colors.subtext }}>완료한 {doneCount}개 지우기</Text>
        </Pressable>
      )}
    </View>
  );
}
