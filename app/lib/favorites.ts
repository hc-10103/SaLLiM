import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import type { AskResponse } from "./api-types";

// 즐겨찾기: 자주 버리는 물건(분리배출 결과)과 생활 가이드. 기기에만 저장.
export type Favorite =
  | { kind: "item"; key: string; name: string; category: string | null; savedAt: number;
      result?: AskResponse; regionId?: string; areaId?: string }
  | { kind: "guide"; key: string; name: string; category: string; savedAt: number };

type FavoriteInput = Omit<Extract<Favorite, { kind: "item" }>, "savedAt"> |
  Omit<Extract<Favorite, { kind: "guide" }>, "savedAt">;

const KEY = "favorites_v1";
let cache: Favorite[] | null = null;
const listeners = new Set<(f: Favorite[]) => void>();

async function load(): Promise<Favorite[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache!;
}

async function save(next: Favorite[]) {
  cache = next;
  listeners.forEach((fn) => fn(next));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

const same = (a: Pick<Favorite, "kind" | "key">, b: Pick<Favorite, "kind" | "key">) => a.kind === b.kind && a.key === b.key;

export async function toggleFavorite(fav: FavoriteInput) {
  const list = await load();
  const exists = list.some((f) => same(f, fav));
  await save(exists ? list.filter((f) => !same(f, fav)) : [{ ...fav, savedAt: Date.now() } as Favorite, ...list]);
  return !exists;
}

export async function removeFavorite(fav: Pick<Favorite, "kind" | "key">) {
  const list = await load();
  await save(list.filter((f) => !same(f, fav)));
}

export async function getItemFavorite(key: string) {
  return (await load()).find((favorite) => favorite.kind === "item" && favorite.key === key) as
    Extract<Favorite, { kind: "item" }> | undefined;
}

export async function saveItemFavoriteResult(key: string, result: AskResponse, regionId: string, areaId?: string) {
  const list = await load();
  if (!list.some((favorite) => favorite.kind === "item" && favorite.key === key)) return;
  await save(list.map((favorite) => favorite.kind === "item" && favorite.key === key
    ? { ...favorite, result, regionId, areaId } : favorite));
}

// 화면 어디서든 같은 목록을 보게 하는 훅 (다른 화면에서 바꿔도 바로 반영)
export function useFavorites() {
  const [list, setList] = useState<Favorite[]>(cache ?? []);
  useEffect(() => {
    let alive = true;
    load().then((l) => { if (alive) setList(l); });
    listeners.add(setList);
    return () => { alive = false; listeners.delete(setList); };
  }, []);
  return list;
}

export function useIsFavorite(kind: Favorite["kind"], key: string | null | undefined) {
  const list = useFavorites();
  return !!key && list.some((f) => f.kind === kind && f.key === key);
}
