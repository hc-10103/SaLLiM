import { SvgXml } from "react-native-svg";

const paths: Record<string, string> = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  camera: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="m8 6 1.5-3h5L16 6"/><circle cx="12" cy="13.5" r="3.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M10 2h4l.5 2.3 2 .8 2-1.3 2.8 2.8-1.3 2 .8 2L23 11v4l-2.2.5-.8 2 1.3 2-2.8 2.8-2-1.3-2 .8L14 23h-4l-.5-2.2-2-.8-2 1.3-2.8-2.8 1.3-2-.8-2L1 15v-4l2.2-.5.8-2-1.3-2 2.8-2.8 2 1.3 2-.8Z"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  guide: '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3H5.5A2.5 2.5 0 0 0 3 20.5Z"/><path d="M14 6a3 3 0 0 1 3-3h1.5A2.5 2.5 0 0 1 21 5.5v15a2.5 2.5 0 0 0-2.5-2.5H17a3 3 0 0 0-3 3"/>',
};

export default function NavIcon({ name, color = "#2563EB", size = 24 }: { name: keyof typeof paths; color?: string; size?: number }) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}
