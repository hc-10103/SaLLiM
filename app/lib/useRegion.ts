import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getRegionSelection, type RegionSelection } from "./region";

// 화면이 포커스될 때마다 저장된 동네를 다시 읽는다. undefined=로딩, null=미선택
export function useRegionSelection() {
  const [selection, setSelection] = useState<RegionSelection | null | undefined>(undefined);
  useFocusEffect(useCallback(() => { getRegionSelection().then(setSelection); }, []));
  return selection;
}

export function useRegion() {
  const selection = useRegionSelection();
  return selection === null ? null : selection?.id;
}
