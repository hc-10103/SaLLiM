import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import Icon, { type IconName } from "../../components/Icon";
import { colors, sizes } from "../../theme";
import { getRegionId } from "../../lib/region";
import { isOnboardingDone } from "../../lib/onboarding";

const TAB_ICONS: Record<string, IconName> = {
  index: "home", camera: "camera", ask: "search", favorites: "bookmark", settings: "settings",
};

export default function TabsLayout() {
  const router = useRouter();
  // 첫 실행: 온보딩 → 동네 선택(설정) 순서
  useEffect(() => {
    (async () => {
      if (!(await isOnboardingDone())) { router.replace("/onboarding"); return; }
      if (!(await getRegionId())) router.replace("/settings");
    })();
  }, [router]);
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.subtext,
      tabBarLabelStyle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.divider, height: sizes.tabBarMinHeight + 6,
        paddingTop: 8, paddingBottom: 8 },
      sceneStyle: { backgroundColor: colors.bg },
      tabBarIcon: ({ color, focused }) => (
        <Icon name={TAB_ICONS[route.name] ?? "home"} size={24} color={String(color)} strokeWidth={focused ? 2.1 : 1.75} />
      ),
    })}>
      <Tabs.Screen name="index" options={{ title: "홈" }} />
      <Tabs.Screen name="camera" options={{ title: "찍기" }} />
      <Tabs.Screen name="ask" options={{ title: "물어보기" }} />
      <Tabs.Screen name="favorites" options={{ title: "즐겨찾기" }} />
      <Tabs.Screen name="settings" options={{ title: "설정" }} />
    </Tabs>
  );
}
