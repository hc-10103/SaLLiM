import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";
import { colors } from "../../theme";
import { getRegionId } from "../../lib/region";

export default function TabsLayout() {
  const router = useRouter();
  // 첫 실행: 동네가 없으면 설정(동네 선택)으로
  useEffect(() => { getRegionId().then((id) => { if (!id) router.replace("/settings"); }); }, [router]);
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.subtext, tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.divider, height: 66,
        paddingTop: 7, paddingBottom: 7 }, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: "홈", tabBarIcon: () => <Text style={{ fontSize: 23 }}>⌂</Text> }} />
      <Tabs.Screen name="guides" options={{ title: "생활 가이드", tabBarIcon: () => <Text style={{ fontSize: 21 }}>▤</Text> }} />
      <Tabs.Screen name="ask" options={{ title: "물어보기", tabBarIcon: () => <Text style={{ fontSize: 21 }}>◌</Text> }} />
      <Tabs.Screen name="settings" options={{ title: "내 지역", tabBarIcon: () => <Text style={{ fontSize: 21 }}>⌖</Text> }} />
    </Tabs>
  );
}
