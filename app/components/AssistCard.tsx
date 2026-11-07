import { Linking, Text, View } from "react-native";
import type { AssistResponse } from "../lib/api-types";
import { isMock } from "../lib/api";
import { colors, radius, shadow, space, typography } from "../theme";
import Icon from "./Icon";
import ResultCard from "./ResultCard";
import { Notice } from "./ui";

type Props = {
  result: AssistResponse;
  regionId: string;
  areaId?: string;
  onChange: (result: AssistResponse) => void;
  autoOpenFollowUp?: boolean;
};

export default function AssistCard({ result, regionId, areaId, onChange, autoOpenFollowUp = false }: Props) {
  if (result.kind === "recycling" && result.recycling_list?.length) {
    return (
      <View style={{ gap: space.smPlus }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
          <Icon name="checkCircle" size={18} color={colors.primary} />
          <Text style={{ ...typography.label, color: colors.text }}>물건 {result.recycling_list.length}개를 각각 확인했어요</Text>
        </View>
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
    return <ResultCard result={result.recycling} regionId={regionId} areaId={areaId} autoOpenFollowUp={autoOpenFollowUp}
      onChange={(recycling) => onChange({ ...result, recycling })} />;
  }

  if (result.kind === "tip" && result.tip) {
    const tip = result.tip;
    return (
      <View style={{ gap: space.md, padding: space.md, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.divider, boxShadow: shadow.card }}>
        {isMock && <Notice tone="warn" title="예시 데이터예요">실제 안내가 아니에요.</Notice>}
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs, alignSelf: "flex-start",
            paddingHorizontal: space.smPlus, paddingVertical: space.xs + 1, borderRadius: radius.pill, backgroundColor: colors.primarySoft }}>
            <Icon name="sparkle" size={16} color={colors.primary} />
            <Text style={{ ...typography.label, fontWeight: "700", color: colors.primary }}>{tip.category} 팁</Text>
          </View>
          <Text accessibilityRole="header" style={{ ...typography.section, fontSize: 20, lineHeight: 28, color: colors.text }}>{tip.title}</Text>
          <Text style={{ ...typography.body, color: colors.subtext }}>{tip.answer}</Text>
        </View>
        {tip.steps.length > 0 && <View style={{ gap: space.sm }}>
          {tip.steps.map((step, index) => (
            <View key={index} style={{ flexDirection: "row", gap: space.smPlus, alignItems: "flex-start" }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                <Text style={{ ...typography.caption, fontWeight: "800", color: colors.primary }}>{index + 1}</Text>
              </View>
              <Text style={{ flex: 1, ...typography.body, color: colors.text }}>{step}</Text>
            </View>
          ))}
        </View>}
        {tip.caution && <Notice tone="warn" title="주의">{tip.caution}</Notice>}
        {!isMock && <Text style={{ ...typography.caption, color: colors.subtext }}>
          AI가 정리한 일반 생활 팁이에요. 위험하거나 비용이 큰 문제는 전문가에게 확인해 주세요.
        </Text>}
      </View>
    );
  }

  if (result.kind === "web" && result.web) {
    const web = result.web;
    const steps = web.steps.filter((step) => !web.answer.includes(step));
    return (
      <View style={{ gap: space.md, padding: space.md, borderRadius: radius.lg, borderCurve: "continuous",
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, boxShadow: shadow.card }}>
        {isMock && <Notice tone="warn" title="예시 데이터예요">실제 안내가 아니에요.</Notice>}
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs, alignSelf: "flex-start",
          paddingHorizontal: space.smPlus, paddingVertical: space.xs + 1, borderRadius: radius.pill, backgroundColor: colors.primarySoft }}>
          <Icon name="search" size={16} color={colors.primary} />
          <Text style={{ ...typography.label, fontWeight: "700", color: colors.primary }}>웹에서 확인한 자료</Text>
        </View>
        <Text accessibilityRole="header" style={{ ...typography.section, fontSize: 20, lineHeight: 28, color: colors.text }}>
          {web.item_name}
        </Text>
        <Text style={{ ...typography.body, color: colors.text }}>{web.answer}</Text>
        {!!steps.length && <View style={{ gap: space.sm }}>
          <Text style={{ ...typography.label, color: colors.text }}>확인한 방법</Text>
          {steps.map((step, index) => <View key={index} style={{ flexDirection: "row", gap: space.smPlus, alignItems: "flex-start" }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primarySoft,
              alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              <Text style={{ ...typography.caption, fontWeight: "800", color: colors.primary }}>{index + 1}</Text>
            </View>
            <Text style={{ flex: 1, ...typography.body, color: colors.text }}>{step}</Text>
          </View>)}
        </View>}
        {!!web.note && <Notice tone="info">{web.note}</Notice>}
        <View style={{ gap: space.sm, borderTopWidth: 1, borderColor: colors.divider, paddingTop: space.smPlus }}>
          <Text style={{ ...typography.caption, color: colors.subtext }}>검색 확인일 {web.searched_on} · 원문에서 다시 확인하세요</Text>
          {web.sources.map((source) => <Text key={source.url} accessibilityRole="link"
            onPress={() => { void Linking.openURL(source.url); }}
            style={{ ...typography.label, color: colors.primary }}>{source.title} ↗</Text>)}
        </View>
      </View>
    );
  }

  return <Notice tone="warn" title="조금 더 알려주세요">{result.message || "상황을 조금 더 자세히 알려주세요."}</Notice>;
}
