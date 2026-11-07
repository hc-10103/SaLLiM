import type {
  AskRequest, AskResponse, AssistRequest, AssistResponse, FollowUpRequest, Region, ScheduleResponse,
  WasteAreaDetail, WasteAreaSearch,
} from "./api-types";

const BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, ""); // 없으면 mock 모드
export const isMock = !BASE;

const SOURCES = [{ title: "환경부 분리배출 안내(mock)", url: "https://example.com", updated: "2026-11" }];

const MOCK_REGIONS: Region[] = [
  { id: "seoul-gwanak", name: "서울특별시 관악구" },
  { id: "nationwide", name: "전국 공통 안내 (배출 요일 제외)" },
];

const MOCK_PET: AskResponse = {
  item_key: "pet_bottle_clear",
  item_name: "투명 페트병",
  category: "투명페트",
  answer: "투명 페트병은 라벨을 떼고 비워서 투명페트 수거함에 버려요.",
  steps: ["내용물 비우고 헹구기", "라벨 떼기", "찌그러뜨려 뚜껑 닫기"],
  next_days: ["화", "금"],
  time: "18:00~24:00",
  note: "예시: 단독주택·상가 기준이에요. 아파트는 단지 안내문을 확인하세요.",
  confident: true,
  follow_up: { key: "has_label", question: "라벨이나 스티커가 아직 붙어 있나요?" },
  sources: SOURCES,
};

const MOCK_UNKNOWN: AskResponse = {
  item_key: null, item_name: null, category: null,
  answer: "다시 찍거나 이름으로 물어봐 주세요",
  steps: [], next_days: [], time: null, confident: false, follow_up: null, sources: [],
};

const MOCK_SCHEDULE: ScheduleResponse = {
  region_id: "seoul-gwanak",
  today: "화",
  today_categories: ["플라스틱", "비닐"],
  week: {
    월: ["일반쓰레기", "음식물"], 화: ["플라스틱", "비닐"], 수: ["일반쓰레기", "음식물"],
    목: ["종이", "캔·고철"], 금: ["플라스틱", "비닐"], 토: [], 일: ["일반쓰레기", "음식물"],
  },
  time: "18:00~24:00",
  note: "예시: 단독주택·상가 기준이에요. 아파트는 단지 안내문을 확인하세요.",
  sources: SOURCES,
};

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 300));

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    throw new Error("서버에 연결할 수 없어요. 컴퓨터와 휴대폰이 같은 와이파이에 있고 서버가 켜져 있는지 확인해 주세요.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const d = body?.detail;
    throw new Error(typeof d === "string" ? d : `서버 오류 ${res.status}`);
  }
  return res.json();
}

const post = <T,>(path: string, body: unknown) =>
  http<T>(path, { method: "POST", body: JSON.stringify(body) });

export function getRegions(): Promise<Region[]> {
  return isMock ? delay(MOCK_REGIONS) : http("/regions");
}

export function searchWasteAreas(query: string): Promise<WasteAreaSearch> {
  return isMock ? delay({ items: [], total: 0, downloaded_on: "" })
    : http(`/waste-areas?query=${encodeURIComponent(query)}`);
}

export function getWasteArea(areaId: string): Promise<WasteAreaDetail> {
  if (isMock) return Promise.reject(new Error("지역 배출 요일을 보려면 서버를 연결해 주세요."));
  return http(`/waste-areas/${encodeURIComponent(areaId)}`);
}

export function ask(req: AskRequest): Promise<AskResponse> {
  if (!isMock) return post("/ask", req);
  // mock: 사진이거나 "페트"가 들어간 질문만 인식, 나머지는 unknown
  const hit = req.image_base64 || req.question?.includes("페트");
  const result = req.region_id === "nationwide"
    ? { ...MOCK_PET, next_days: [], time: null, note: "배출 요일·시간은 거주지 안내문을 확인하세요." }
    : MOCK_PET;
  return delay(hit ? result : MOCK_UNKNOWN);
}

export function assist(req: AssistRequest): Promise<AssistResponse> {
  if (!isMock) return post("/assist", req);
  if (req.image_base64 || /버려|분리|재활용|쓰레기|배출/.test(req.question ?? "")) {
    return ask(req).then((recycling) => ({ kind: "recycling", recycling, tip: null, message: null }));
  }
  return delay({
    kind: "tip", recycling: null, message: null,
    tip: {
      category: "자취", title: "생활 문제 해결 예시",
      answer: "이 화면은 예시 답변이에요. Gemini를 연결하면 질문에 맞게 답해요.",
      steps: ["문제 상황을 구체적으로 적어 주세요.", "사진이 있다면 함께 올려 주세요."],
      caution: "예시 데이터이므로 실제 상황에 그대로 적용하지 마세요.",
    },
  } as AssistResponse);
}

export function followUp(req: FollowUpRequest): Promise<AskResponse> {
  if (!isMock) return post("/ask/followup", req);
  const labeled = req.state.has_label;
  return delay({
    ...MOCK_PET,
    ...(req.region_id === "nationwide" ? { next_days: [], time: null,
      note: "배출 요일·시간은 거주지 안내문을 확인하세요." } : {}),
    follow_up: null,
    answer: labeled
      ? "라벨을 먼저 떼야 해요. 라벨은 비닐류로 따로 버려요."
      : MOCK_PET.answer,
    answered_state: req.state,
  });
}

export function getSchedule(regionId: string): Promise<ScheduleResponse> {
  return isMock
    ? delay(regionId === "nationwide" ? {
      ...MOCK_SCHEDULE, region_id: regionId, week: {}, today_categories: [], time: null,
      note: "지역별 배출 요일·시간은 거주지 지자체나 공동주택 안내문을 확인하세요.",
    } : { ...MOCK_SCHEDULE, region_id: regionId })
    : http(`/schedule?region_id=${encodeURIComponent(regionId)}`);
}
