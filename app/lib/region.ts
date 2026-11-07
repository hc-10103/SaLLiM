import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "region_id";
const NAME_KEY = "region_name";
const AREA_KEY = "waste_area_id";

export type RegionSelection = { id: string; name: string; areaId?: string };

export const getRegionId = () => AsyncStorage.getItem(KEY);

export async function getRegionSelection(): Promise<RegionSelection | null> {
  const entries = await AsyncStorage.multiGet([KEY, NAME_KEY, AREA_KEY]);
  const id = entries[0][1];
  const name = entries[1][1];
  const areaId = entries[2][1] || undefined;
  if (!id) return null;
  // 이전 예시 데이터에서 마포구를 선택한 경우에도 실제 서버가 아는 전국 안내로 연결한다.
  if (id === "seoul-mapo") return { id: "nationwide", name: name || "서울특별시 마포구" };
  return { id, name: name || (id === "seoul-gwanak" ? "서울특별시 관악구" : "전국 공통 안내"), areaId };
}

export async function setRegionSelection(selection: RegionSelection) {
  await AsyncStorage.multiSet([[KEY, selection.id], [NAME_KEY, selection.name],
    [AREA_KEY, selection.areaId || ""]]);
}
