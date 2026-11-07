import { SvgXml } from "react-native-svg";
import { colors } from "../theme";

// 원본: docs/design/icons/*.svg (24×24, stroke 2, 자체 제작). 장식용 — 항상 카테고리 글자와 함께 쓴다.
const BODY: Record<string, string> = {
  "투명페트": "<path d=\"M9 2h6v4l3 4v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10l3-4ZM9 6h6M6 12h12M6 17h12\"/>",
  "플라스틱": "<path d=\"M5 7h14l-2 14H7ZM4 4h16M8 11h8M9 16h6\"/>",
  "종이": "<path d=\"M5 2h9l5 5v15H5ZM14 2v6h5M8 12h8M8 16h8\"/>",
  "종이팩": "<path d=\"M5 8 9 2h7l3 6v14H5ZM5 8h14M9 2v6m7-6-3 6M13 8v14M7 13h3M7 17h3\"/>",
  "캔·고철": "<ellipse cx=\"12\" cy=\"4\" rx=\"6\" ry=\"2\"/><path d=\"M6 4v16c0 3 12 3 12 0V4M9 10h6M9 16h6\"/>",
  "유리병": "<path d=\"M10 2h4v7l3 4v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-7l3-4ZM10 5h4M10 14v5\"/>",
  "비닐": "<path d=\"M7 3h3v4h4V3h3l3 18H4ZM8 11l2 3-2 4m8-7-2 3 2 4\"/>",
  "스티로폼": "<path d=\"m3 7 9-4 9 4v13H3ZM3 7h18M12 3v4\"/><circle cx=\"7\" cy=\"12\" r=\".6\"/><circle cx=\"12\" cy=\"12\" r=\".6\"/><circle cx=\"17\" cy=\"12\" r=\".6\"/><circle cx=\"9\" cy=\"17\" r=\".6\"/><circle cx=\"15\" cy=\"17\" r=\".6\"/>",
  "일반쓰레기": "<path d=\"m9 3 3 2 3-2-1 5c3 2 6 7 6 11 0 3-16 3-16 0 0-4 3-9 6-11ZM9 8h6M9 13l-1 5m7-5 1 5\"/>",
  "음식물": "<path d=\"M3 12h18c-1 6-4 9-9 9S4 18 3 12ZM8 4c-3 1 3 4 0 6m8-6c-3 1 3 4 0 6M7 22h10\"/>",
  "전용수거": "<path d=\"M4 9h16v13H4ZM3 6h18v3H3M8 13h8M10 2h4v4h-4Z\"/><path d=\"M12 16v3m-2-1.5h4\"/>",
  "대형폐기물": "<path d=\"M7 12V3h10v9M5 12h14v6H5ZM6 18v4m12-4v4M10 6h4\"/>"
};

export default function CategoryIcon({ category, size = 24, color = colors.primary }: {
  category: string | null; size?: number; color?: string;
}) {
  const body = category ? BODY[category] : undefined;
  if (!body) return null;
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}
