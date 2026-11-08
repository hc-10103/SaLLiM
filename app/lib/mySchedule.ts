import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

// 우리 집 배출 요일 직접 설정 (아파트 단지 등 공공데이터와 다른 경우). 기기에만 저장.
export const WEEK = ["월", "화", "수", "목", "금", "토", "일"] as const;
export const SCHEDULE_CATEGORIES = ["일반쓰레기", "음식물", "플라스틱", "투명페트", "비닐", "종이", "종이팩",
  "캔·고철", "유리병", "스티로폼"] as const;

export type MySchedule = { week: Record<string, string[]>; start: string; end: string; updatedAt: number };

const KEY = "my_schedule_v1";
let cache: MySchedule | null | undefined;
const listeners = new Set<(s: MySchedule | null) => void>();

export async function loadMySchedule(): Promise<MySchedule | null> {
  if (cache !== undefined) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    cache = v && typeof v === "object" && v.week ? v : null;
  } catch {
    cache = null;
  }
  return cache ?? null;
}

function emit(next: MySchedule | null) {
  cache = next;
  listeners.forEach((fn) => fn(next));
}

export async function saveMySchedule(s: Omit<MySchedule, "updatedAt">) {
  const next = { ...s, updatedAt: Date.now() };
  emit(next);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

export async function clearMySchedule() {
  emit(null);
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

export function scheduleTime(s: MySchedule | null) {
  if (!s || (!s.start && !s.end)) return null;
  return `${s.start || "?"} ~ ${s.end || "?"}`;
}

export function useMySchedule() {
  const [value, setValue] = useState<MySchedule | null>(cache ?? null);
  const [ready, setReady] = useState(cache !== undefined);
  useEffect(() => {
    let alive = true;
    loadMySchedule().then((v) => { if (alive) { setValue(v); setReady(true); } });
    listeners.add(setValue);
    return () => { alive = false; listeners.delete(setValue); };
  }, []);
  return { schedule: value, ready };
}
