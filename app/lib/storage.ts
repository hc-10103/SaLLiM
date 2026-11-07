import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AssistResponse } from "./api-types";

const RECENT_MESSAGES_KEY = "salim_recent_messages_v1";
const MAX_RECENT_MESSAGES = 10;
let writeQueue: Promise<void> = Promise.resolve();

export type RecentMessage = {
  id: number;
  regionId: string;
  question: string;
  result: AssistResponse;
};

export async function loadRecentMessages(): Promise<RecentMessage[]> {
  try {
    await writeQueue;
    const raw = await AsyncStorage.getItem(RECENT_MESSAGES_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((value): value is RecentMessage =>
      value !== null && typeof value === "object" &&
      typeof value.id === "number" && typeof value.regionId === "string" &&
      typeof value.question === "string" &&
      value.result !== null && typeof value.result === "object" &&
      ["recycling", "tip", "unknown"].includes(value.result.kind),
    ).slice(-MAX_RECENT_MESSAGES);
  } catch {
    return [];
  }
}

export async function saveRecentMessages(messages: RecentMessage[]): Promise<void> {
  const current = writeQueue.then(() => messages.length === 0
    ? AsyncStorage.removeItem(RECENT_MESSAGES_KEY)
    : AsyncStorage.setItem(RECENT_MESSAGES_KEY,
      JSON.stringify(messages.slice(-MAX_RECENT_MESSAGES))));
  writeQueue = current.catch(() => undefined);
  await current;
}
