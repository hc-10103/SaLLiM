const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatWasteDays(raw: string): string {
  const values = raw.split("+").map((value) => value.trim()).filter(Boolean);
  if (!values.length || values.some((value) => !DAYS.includes(value))) return raw || "등록 정보 없음";
  return DAYS.filter((day) => values.includes(day)).join("·");
}

export function isOldWasteData(date: string): boolean {
  const value = Date.parse(date);
  return Number.isFinite(value) && Date.now() - value > 365 * 24 * 60 * 60 * 1000;
}
