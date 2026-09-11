import type { Paper } from "../../../contracts/domain";
import type { EffectiveResearchProfile } from "../../domain/research-profile/research-profile";
import type { AcademicSearchRequest } from "../../domain/search/academic-search";

type ScoredPaper = { paper: Paper; score: number; reasons: string[] };

export function rankAcademicPapers(
  papers: readonly Paper[],
  requests: readonly AcademicSearchRequest[],
  profile: EffectiveResearchProfile | null,
  nowYear = new Date().getUTCFullYear(),
) {
  const requestTerms = terms(requests.flatMap((request) => [request.userQuestion, request.query]).join(" "));
  const venueSignals = (profile?.venueGroups ?? []).flatMap((group) =>
    group.venues.flatMap((venue) => [venue.name, ...venue.aliases]),
  );
  const isRecent = requests.some((request) => request.intent === "recent");
  const scored = papers.map<ScoredPaper>((paper) => {
    const reasons: string[] = [];
    const searchable = terms(`${paper.title} ${paper.abstract ?? ""}`);
    const overlap = requestTerms.size
      ? [...requestTerms].filter((term) => searchable.has(term)).length / requestTerms.size
      : 0;
    let score = overlap * 10;
    if (overlap >= 0.45) reasons.push("与当前问题高度相关");
    else if (overlap > 0) reasons.push("与当前问题相关");

    const venue = paper.venue?.toLocaleLowerCase() ?? "";
    const matchedVenue = venueSignals.find((signal) => venue.includes(signal.toLocaleLowerCase()));
    if (matchedVenue) {
      score += 1.5;
      reasons.push(`匹配研究领域 Venue：${paper.venue}`);
    }
    if (paper.abstract) {
      score += 0.6;
      reasons.push("摘要可用");
    } else reasons.push("仅元数据");
    if (isRecent && paper.year !== null) {
      const age = Math.max(0, nowYear - paper.year);
      score += Math.max(0, 2 - age * 0.25);
      if (age <= 2) reasons.push("近期工作");
    }
    if (paper.citationCount && paper.citationCount > 0) {
      score += Math.min(1.5, Math.log10(paper.citationCount + 1) * 0.5);
      reasons.push("具有引用记录（仅作辅助信号）");
    }
    return { paper, score, reasons: reasons.length ? reasons : ["来源返回的候选资料"] };
  });

  const remaining = [...scored];
  const selected: Paper[] = [];
  const sourceCounts = new Map<string, number>();
  while (remaining.length) {
    remaining.sort((left, right) =>
      (right.score - (sourceCounts.get(right.paper.source) ?? 0) * 0.35) -
      (left.score - (sourceCounts.get(left.paper.source) ?? 0) * 0.35) ||
      left.paper.title.localeCompare(right.paper.title),
    );
    const next = remaining.shift()!;
    const sourceSeen = sourceCounts.get(next.paper.source) ?? 0;
    sourceCounts.set(next.paper.source, sourceSeen + 1);
    selected.push({
      ...next.paper,
      selectionReasons: [...next.reasons, ...(sourceSeen === 0 && papers.some((paper) => paper.source !== next.paper.source) ? ["补充来源多样性"] : [])],
    });
  }
  return selected;
}

function terms(value: string) {
  return new Set(
    value.normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [],
  );
}
