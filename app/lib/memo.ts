import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

// 홈 '자취 메모' — 사야 할 것, 잊으면 안 되는 것. 기기에만 저장.
export type MemoItem = { id: string; text: string; done: boolean; createdAt: number };
const KEY = "home_memo_v1";

export function useHomeMemo() {
  const [items, setItems] = useState<MemoItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { const v = raw ? JSON.parse(raw) : []; setItems(Array.isArray(v) ? v : []); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const commit = useCallback((next: MemoItem[]) => {
    setItems(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  return {
    items, ready,
    add: (text: string) => {
      const t = text.trim();
      if (!t) return;
      commit([{ id: `${Date.now()}`, text: t.slice(0, 80), done: false, createdAt: Date.now() }, ...items].slice(0, 30));
    },
    toggle: (id: string) => commit(items.map((m) => (m.id === id ? { ...m, done: !m.done } : m))),
    remove: (id: string) => commit(items.filter((m) => m.id !== id)),
    clearDone: () => commit(items.filter((m) => !m.done)),
  };
}
