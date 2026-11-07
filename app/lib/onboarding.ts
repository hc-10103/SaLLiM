import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "onboarding_done_v1";

export const isOnboardingDone = async () => (await AsyncStorage.getItem(KEY)) === "1";
export const setOnboardingDone = () => AsyncStorage.setItem(KEY, "1");
