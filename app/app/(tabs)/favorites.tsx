import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryBadge } from "../../components/CategoryIcon";
import GuideIcon from "../../components/GuideIcon";
import Icon from "../../components/Icon";
import Thumb from "../../components/Thumb";
import { Button } from "../../components/ui";
import { removeFavorite, useFavorites, type Favorite } from "../../lib/favorites";
import type { GuideCategory } from "../../lib/guides";
import { photoForCategory } from "../../lib/photos";
import { colors, space, typography } from "../../theme";

export default function Favorites() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useFavorites();
  const items = list.filter((f) => f.kind === "item");
  const guides = list.filter((f) => f.kind === "guide");

  function open(f: Favorite) {
    if (f.kind === "item") router.push({ pathname: "/favorite/[key]", params: { key: f.key } });
    else router.push({ pathname: "/guide/[id]", params: { id: f.key } });
  }

  return (
    <ScrollView style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ paddingHorizontal: space.page, paddingTop: insets.top + space.sm, paddingBottom: space.section, gap: space.xl }}>
      <View style={{ gap: space.xs, paddingTop: space.sm }}>
        <Text accessibilityRole="header" style={{ ...typography.heading, color: colors.text }}>즐겨찾기</Text>
        <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext }}>자주 버리는 물건과 아껴둔 가이드</Text>
      </View>

      {list.length === 0 ? (
        <View style={{ alignItems: "center", gap: space.smPlus, paddingVertical: space.section }}>
          <View style={{ width: 72, height: 72, borderRadius: 24, borderCurve: "continuous", backgroundColor: colors.primarySoft,
            alignItems: "center", justifyContent: "center" }}>
            <Icon name="bookmark" size={34} color={colors.primary} />
          </View>
          <Text style={{ ...typography.section, color: colors.text }}>아직 저장한 게 없어요</Text>
          <Text style={{ ...typography.label, fontWeight: "500", color: colors.subtext, textAlign: "center" }}>
            결과 카드나 가이드 오른쪽 위의{"\n"}북마크를 누르면 여기에 모여요.
          </Text>
          <Button label="물어보러 가기" icon="search" variant="soft" style={{ marginTop: space.sm, paddingHorizontal: space.lg }}
            onPress={() => router.push("/ask")} />
        </View>
      ) : (
        <>
          {items.length > 0 && <Section title="자주 버리는 물건" count={items.length}>
            {items.map((f) => (
              <Row key={`i-${f.key}`} onPress={() => open(f)} onRemove={() => removeFavorite(f)} title={f.name}
                leading={photoForCategory(f.category) ? <Thumb photo={photoForCategory(f.category)!} size={64} />
                  : <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: colors.tint }} />}
                sub={f.category ? <CategoryBadge category={f.category} size="sm" /> : null} />
            ))}
          </Section>}
          {guides.length > 0 && <Section title="저장한 가이드" count={guides.length}>
            {guides.map((f) => (
              <Row key={`g-${f.key}`} onPress={() => open(f)} onRemove={() => removeFavorite(f)} title={f.name}
                leading={<GuideIcon id={f.key} category={f.category as GuideCategory} size={64} />}
                sub={<Text style={{ ...typography.caption, color: colors.subtext }}>{f.category} 가이드</Text>} />
            ))}
          </Section>}
        </>
      )}
    </ScrollView>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return <View style={{ gap: space.xs }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
      <Text accessibilityRole="header" style={{ fontSize: 20, lineHeight: 28, fontWeight: "800", letterSpacing: -0.4, color: colors.text }}>{title}</Text>
      <Text style={{ ...typography.label, color: colors.subtext }}>{count}개</Text>
    </View>
    {children}
  </View>;
}

function Row({ title, sub, leading, onPress, onRemove }: {
  title: string; sub: React.ReactNode; leading: React.ReactNode; onPress: () => void; onRemove: () => void;
}) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${title} 열기`} onPress={onPress}
      style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.smPlus,
        opacity: pressed ? 0.6 : 1 })}>
      {leading}
      <View style={{ flex: 1, gap: 6 }}>
        <Text numberOfLines={2} style={{ fontSize: 16, lineHeight: 22, fontWeight: "700", letterSpacing: -0.3, color: colors.text }}>{title}</Text>
        {sub}
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${title} 즐겨찾기에서 빼기`} onPress={onRemove} hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
        backgroundColor: pressed ? colors.tint : "transparent" })}>
      <Icon name="bookmark" size={22} color={colors.primary} filled />
    </Pressable>
  </View>;
}
