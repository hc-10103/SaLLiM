import { SvgXml } from "react-native-svg";

export default function BrandMark({ size = 32 }: { size?: number }) {
  const xml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#2563EB"/><ellipse cx="14" cy="23" rx="6" ry="10" transform="rotate(-38 14 23)" fill="#FFFFFF"/><ellipse cx="27" cy="17" rx="6" ry="10" transform="rotate(35 27 17)" fill="#DFE9FF"/></svg>';
  return <SvgXml xml={xml} width={size} height={size} />;
}
