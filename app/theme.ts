// 원본: docs/design/v2/tokens.json (Tech Trust v2, 라이트). 기존 키 이름은 유지하고 값만 v2로 바꿨다.
// 새 키: tintStrong, primarySoft, categoryColors, gradient. 토큰이 바뀌면 같이 갱신.
export const colors = {
  "bg": "#F3F6FF",
  "surface": "#FFFFFF",
  "text": "#0F172A",
  "subtext": "#475569",
  "primary": "#2563EB",
  "onPrimary": "#FFFFFF",
  "primaryPressed": "#1D4ED8",
  "primarySoft": "#DBE7FF",
  "tint": "#E9EFFB",
  "tintStrong": "#D6E2FA",
  "accent": "#E8F0FF",
  "onAccent": "#0F172A",
  "border": "#C9D6EA",
  "divider": "#E2E9F4",
  "warn": "#92400E",
  "warnBg": "#FFF4D6",
  "error": "#991B1B",
  "errorBg": "#FEE2E2",
  "success": "#166534",
  "successBg": "#E3F5E9",
  "focus": "#1D4ED8",
  "disabledBg": "#E5EAF2",
  "disabledText": "#64748B",
  "cameraBg": "#0B1220",
  "onCamera": "#FFFFFF",
  "scrim": "#0F172A99"
} as const;

// 히어로 카드 배경 (LinearGradient 없이 겹친 원으로 표현할 때 쓰는 두 색)
export const gradient = { from: "#2563EB", to: "#3B82F6", glow: "#60A5FA" } as const;

export const space = {
  "none": 0,
  "xxs": 2,
  "xs": 4,
  "sm": 8,
  "smPlus": 12,
  "md": 16,
  "page": 20,
  "lg": 24,
  "xl": 32,
  "xxl": 40,
  "section": 48
} as const;

export const radius = {
  "none": 0,
  "xs": 6,
  "sm": 10,
  "button": 14,
  "md": 16,
  "lg": 20,
  "sheet": 24,
  "pill": 999
} as const;

export const typography = {
  "display": { "fontSize": 32, "lineHeight": 40, "fontWeight": "800", "letterSpacing": -0.8 },
  "heading": { "fontSize": 26, "lineHeight": 34, "fontWeight": "800", "letterSpacing": -0.6 },
  "resultTitle": { "fontSize": 26, "lineHeight": 34, "fontWeight": "800", "letterSpacing": -0.6 },
  "section": { "fontSize": 18, "lineHeight": 26, "fontWeight": "700", "letterSpacing": -0.3 },
  "body": { "fontSize": 16, "lineHeight": 24, "fontWeight": "400", "letterSpacing": 0 },
  "bodyStrong": { "fontSize": 16, "lineHeight": 24, "fontWeight": "700", "letterSpacing": -0.1 },
  "button": { "fontSize": 16, "lineHeight": 22, "fontWeight": "700", "letterSpacing": -0.1 },
  "label": { "fontSize": 14, "lineHeight": 20, "fontWeight": "600", "letterSpacing": 0 },
  "caption": { "fontSize": 13, "lineHeight": 19, "fontWeight": "500", "letterSpacing": 0 },
  "eyebrow": { "fontSize": 12, "lineHeight": 18, "fontWeight": "700", "letterSpacing": 0.4 },
  "navigation": { "fontSize": 12, "lineHeight": 16, "fontWeight": "600", "letterSpacing": 0 }
} as const;

export const sizes = {
  "touchMin": 44,
  "touchAbsoluteMin": 44,
  "buttonMinHeight": 52,
  "inputMinHeight": 52,
  "pageGutter": 20,
  "iconSmall": 18,
  "iconDefault": 24,
  "iconLarge": 32,
  "tabBarMinHeight": 64,
  "artboardWidth": 390,
  "artboardHeight": 844
} as const;

// expo-native-ui 규칙: 그림자는 boxShadow 문자열 (옛 shadowColor/elevation 금지). 사용: { boxShadow: shadow.card }
export const shadow = {
  none: "none",
  card: "0 4px 14px rgba(30, 58, 138, 0.07)",
  raised: "0 10px 24px rgba(37, 99, 235, 0.28)",
  overlay: "0 -4px 20px rgba(15, 23, 42, 0.12)",
} as const;

// 분리배출 카테고리 12색 (tokens.json light.category). 색만으로 구분하지 않도록 항상 아이콘+이름과 함께 쓴다.
export const categoryColors: Record<string, { bg: string; fg: string; icon: string }> = {
  "투명페트": { "bg": "#EAF1FF", "fg": "#17233B", "icon": "#2563EB" },
  "플라스틱": { "bg": "#EBF1FF", "fg": "#17233B", "icon": "#3467D5" },
  "종이": { "bg": "#F8F1E6", "fg": "#17233B", "icon": "#956B35" },
  "종이팩": { "bg": "#E7F6FA", "fg": "#17233B", "icon": "#147A9E" },
  "캔·고철": { "bg": "#ECF0F5", "fg": "#17233B", "icon": "#52667E" },
  "유리병": { "bg": "#E7F7F7", "fg": "#17233B", "icon": "#087F8C" },
  "비닐": { "bg": "#F2EEFF", "fg": "#17233B", "icon": "#7056CB" },
  "스티로폼": { "bg": "#EFF3FA", "fg": "#17233B", "icon": "#6179A9" },
  "일반쓰레기": { "bg": "#EDF0F3", "fg": "#17233B", "icon": "#475569" },
  "음식물": { "bg": "#FCF2E7", "fg": "#17233B", "icon": "#B56B22" },
  "전용수거": { "bg": "#F3EDFB", "fg": "#17233B", "icon": "#7953B7" },
  "대형폐기물": { "bg": "#FBEFF2", "fg": "#17233B", "icon": "#A64E69" },
  // 행안부 관리구역 데이터의 큰 분류 (홈 일정)
  "재활용품": { "bg": "#E7F6FA", "fg": "#17233B", "icon": "#147A9E" },
  "음식물쓰레기": { "bg": "#FCF2E7", "fg": "#17233B", "icon": "#B56B22" }
};

export function categoryColor(category: string | null | undefined) {
  return (category && categoryColors[category]) || { bg: colors.tint, fg: colors.text, icon: colors.primary };
}
