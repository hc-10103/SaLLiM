import { Text, View } from "react-native";
import type { AssistResponse } from "../lib/api-types";
import { isMock } from "../lib/api";
import { colors, radius, space, typography } from "../theme";
import ResultCard from "./ResultCard";

type Props = {
  result: AssistResponse;
  regionId: string;
  areaId?: string;
  onChange: (result: AssistResponse) => void;
};

export default function AssistCard({ result, regionId, areaId, onChange }: Props) {
  if (result.kind === "recycling" && result.recycling_list?.length) {
    return (
      <View style={{ gap: space.md }}>
        <Text style={{ color: colors.text, ...typography.label }}>
          물품 {result.recycling_list.length}개를 각각 확인했어요
        </Text>
        {result.recycling_list.map((recycling, index) => (
          <ResultCard key={`${index}-${recycling.item_key}`} result={recycling}
            regionId={regionId} areaId={areaId}
            onChange={(updated) => onChange({ ...result, recycling_list: result.recycling_list!.map(
              (item, itemIndex) => itemIndex === index ? updated : item,
            ) })} />
        ))}
      </View>
    );
  }
  if (result.kind === "recycling" && result.recycling) {
    return <ResultCard result={result.recycling} regionId={regionId} areaId={areaId}
      onChange={(recycling) => onChange({ ...result, recycling })} />;
  }

  if (result.kind === "tip" && result.tip) {
    const tip = result.tip;
    return (
      <View style={{ gap: space.sm, padding: space.md, borderWidth: 1, borderColor: colors.divider,
        borderRadius: radius.md, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.primary, ...typography.label }}>{tip.category} 팁</Text>
        <Text style={{ color: colors.text, ...typography.section }}>{tip.title}</Text>
        {isMock && <Text style={{ color: colors.error }}>예시 데이터예요 · 실제 안내가 아니에요</Text>}
        <Text style={{ color: colors.text, ...typography.body }}>{tip.answer}</Text>
        {tip.steps.map((step, index) => (
          <Text key={index} style={{ color: colors.text, ...typography.body }}>{index + 1}. {step}</Text>
        ))}
        {tip.caution && <Text style={{ color: colors.warn, ...typography.label }}>주의: {tip.caution}</Text>}
        {!isMock && <Text style={{ color: colors.subtext, ...typography.caption }}>
          AI가 정리한 일반 생활 팁이에요. 위험하거나 비용이 큰 문제는 전문가에게 확인해 주세요.
        </Text>}
      </View>
    );
  }

  return (
    <View style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.warnBg }}>
      <Text style={{ color: colors.warn }}>{result.message || "상황을 조금 더 자세히 알려주세요."}</Text>
    </View>
  );
}
