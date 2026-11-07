import { SvgXml } from "react-native-svg";
import { colors } from "../theme";

// 24×24 선 아이콘 (stroke 1.75, currentColor 대신 color prop). 탭 아이콘은 docs/design/v2/icons/tab-*.svg 기반.
const PATHS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
  camera: '<path d="M4 7h3.5l2-3h5l2 3H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4.5 4.5"/>',
  guide: '<path d="M4 4.5h6a2.5 2.5 0 0 1 2.5 2.5v13A2 2 0 0 0 10.5 18H4zM20 4.5h-6A2.5 2.5 0 0 0 11.5 7v13a2 2 0 0 1 2-2H20z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  chevronRight: '<path d="m9 5 7 7-7 7"/>',
  chevronLeft: '<path d="m15 5-7 7 7 7"/>',
  chevronDown: '<path d="m5 9 7 7 7-7"/>',
  chevronUp: '<path d="m5 15 7-7 7 7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m20.5 16-5-5-8.5 8.5"/>',
  send: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  sparkle: '<path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.5 10.2 12.6 4.5 10.8 10.2 9z"/><path d="M18.5 3.5v3M17 5h3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
  warning: '<path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17v.1"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  link: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>',
  trash: '<path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
  location: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  chat: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z"/>',
  flash: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
  // 생활 가이드·자주 묻는 품목용 (이모지 대체)
  bowl: '<path d="M3.5 11h17c-.4 4.8-3.9 8.5-8.5 8.5S3.9 15.8 3.5 11zM9 20.5h6M8 8c0-1.5 1-2 1-3.5M12 8c0-1.5 1-2 1-3.5M16 8c0-1.5 1-2 1-3.5"/>',
  snowflake: '<path d="M12 2.5v19M4 7l16 10M20 7 4 17M9.5 4 12 6.5 14.5 4M9.5 20 12 17.5 14.5 20M4.3 10.4 7.3 9.4 6.6 6.3M19.7 13.6 16.7 14.6 17.4 17.7M19.7 10.4 16.7 9.4 17.4 6.3M4.3 13.6 7.3 14.6 6.6 17.7"/>',
  leaf: '<path d="M5 19C5 10 10 4.5 20 4c-.5 10-6 15-15 15zM5 19l8-8"/>',
  spray: '<path d="M8 9h6l1 3v8.5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V12zM9 9V6h4l2-1.5M13 6h-4M18 4h.01M20 6h.01M18 8h.01"/>',
  shirt: '<path d="M8.5 3.5 4 6l2 4 2-1v11.5h8V9l2 1 2-4-4.5-2.5c-.5 1.5-1.8 2.5-3.5 2.5s-3-1-3.5-2.5z"/>',
  cup: '<path d="M5.5 7h13l-1.6 13.2a1 1 0 0 1-1 .8H8.1a1 1 0 0 1-1-.8zM4.5 4h15v3h-15zM12 4l2-2.5"/>',
  drop: '<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  plug: '<path d="M9 3v4.5M15 3v4.5M6.5 7.5h11V11a5.5 5.5 0 0 1-11 0zM12 16.5V21"/>',
  flame: '<path d="M12 21.5c3.9 0 6.5-2.6 6.5-6.2 0-4.3-3.6-6.3-4.5-10.8-2.4 1.6-3.5 4-3.5 6-1-.5-1.8-1.6-2-2.8-1.9 2-3 4.2-3 6.9 0 3.6 2.6 6.9 6.5 6.9z"/><path d="M12 21.5c-1.7 0-2.8-1.2-2.8-2.8 0-2 2.8-3.5 2.8-5.2 1.1 1.4 2.8 3 2.8 5.2 0 1.6-1.1 2.8-2.8 2.8z"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5zM10 21h4M3 9c.5-2 1.5-3.5 3-4.5M21 9c-.5-2-1.5-3.5-3-4.5"/>',
  thermometer: '<path d="M14 14.5V5a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0z"/><path d="M12 9v8"/>',
  tag: '<path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.5 1.5 0 0 1 0 2.1l-7 7a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8.5" cy="8.5" r="1.5"/>',
  knife: '<path d="M4 20 15.5 8.5l2-2a2.1 2.1 0 0 1 3 3l-2 2L7 23"/><path d="M4 20l3-3M15.5 8.5l3 3"/>',
  box: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4zM3.5 7.5 12 11.5l8.5-4M12 11.5v9M7.8 5.5l8.4 4"/>',
  can: '<ellipse cx="12" cy="6" rx="6" ry="2.2"/><path d="M6 6v12c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V6M6 12c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2"/>',
  detergent: '<path d="M8 8.5h7a2 2 0 0 1 2 2v9.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-9.5a2 2 0 0 1 2-2zM9.5 8.5V5h4v3.5M13.5 5.5H17M9 14h5"/>',
  carton: '<path d="M6.5 8.5 9 3.5h6l2.5 5V21h-11zM6.5 8.5h11M12 8.5V21M9 3.5l3 5"/>',
  pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>',
  egg: '<path d="M12 3c3.6 0 6.5 5.3 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.3 8.4 3 12 3z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1v.5h5V16c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  bone: '<path d="M8.5 15.5l7-7M7 13.5a2.5 2.5 0 1 0-1.5 4.5 2.5 2.5 0 1 0 4.5 1.5M17 10.5a2.5 2.5 0 1 0 1.5-4.5A2.5 2.5 0 1 0 14 4.5"/>',
  battery: '<rect x="7" y="5.5" width="10" height="15.5" rx="2"/><path d="M10 5.5V3h4v2.5M12 10v5M9.5 12.5h5"/>',
  bookmark: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4.5L5.5 21V4.5a1 1 0 0 1 1-1z"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  recycle: '<path d="M7 19.5 3.5 13.5l3-5M3.5 13.5H10M17 4.5l3.5 6-3 5M20.5 10.5H14M8 6.5 11.5 3h5.5M11.5 3l1 4.5M16 20.5h-5l-2-3.5M11 20.5l-1.5-4"/>',
};

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 24, color = colors.text, strokeWidth = 1.75, filled = false }: {
  name: IconName; size?: number; color?: string; strokeWidth?: number; filled?: boolean;
}) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${filled ? color : "none"}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}
