import type { Paper } from "../../../contracts/domain";
import type { EffectiveResearchProfile } from "../../domain/research-profile/research-profile";
import type { AcademicSearchRequest } from "../../domain/search/academic-search";
import type { SearchRecord } from "../../domain/search/literature";
import type { SourceRegistry } from "./literature-source-registry";
import { rankAcademicPapers } from "./rank-academic-papers";
import { deduplicatePapers, searchAcademic, type AcademicSearchTrace } from "./search-academic";

export interface IterativeSearchRound {
  round: number;
  query: string;
  candidates: number;
  deduplicated: number;
  status: AcademicSearchTrace["status"];
}

export async function searchAcademicIteratively(options: {
  requests: readonly AcademicSearchRequest[];
  registry: SourceRegistry;
  effectiveProfile: EffectiveResearchProfile | null;
  signal: AbortSignal;
  maxRounds?: number;
  sufficientCandidates?: number;
  onRecord?: (record: SearchRecord) => Promise<void> | void;
  onRound?: (round: IterativeSearchRound) => void;
}) {
  if (!options.requests.length) throw new Error("迭代检索至少需要一个查询。");
  const first = options.requests[0]!;
  const roundLimit = Math.min(options.maxRounds ?? 3, first.budget.maxQueries, options.requests.length, 3);
  const sufficient = Math.min(options.sufficientCandidates ?? 8, first.budget.maxCandidates);
  const collected: Paper[] = [];
  const records: SearchRecord[] = [];
  const failures: AcademicSearchTrace["failures"] = [];
  const rounds: IterativeSearchRound[] = [];
  const sources = new Set<string>();
  let rawCandidates = 0;

  for (let index = 0; index < roundLimit; index += 1) {
    if (options.signal.aborted) throw new DOMException("已取消", "AbortError");
    const remaining = first.budget.maxCandidates - deduplicatePapers(collected).length;
    if (remaining <= 0) break;
    const request = options.requests[index]!;
    const output = await searchAcademic({
      requests: [{ ...request, budget: { ...request.budget, maxQueries: 1, maxCandidates: remaining } }],
      registry: options.registry,
      effectiveProfile: options.effectiveProfile,
      signal: options.signal,
      onRecord: options.onRecord,
    });
    collected.push(...output.papers);
    records.push(...output.records);
    rawCandidates += output.trace.candidates;
    output.trace.sources.forEach((source) => sources.add(source));
    failures.push(...output.trace.failures);
    const unique = deduplicatePapers(collected);
    const round = {
      round: index + 1,
      query: request.query,
      candidates: output.trace.candidates,
      deduplicated: unique.length,
      status: output.trace.status,
    } satisfies IterativeSearchRound;
    rounds.push(round);
    options.onRound?.(round);
    if (unique.length >= sufficient) break;
  }

  const papers = rankAcademicPapers(
    deduplicatePapers(collected), options.requests.slice(0, rounds.length), options.effectiveProfile,
  ).slice(0, first.budget.maxCandidates);
  const distinctFailures = [...new Map(failures.map((item) => [`${item.sourceId}:${item.status}`, item])).values()];
  const status: AcademicSearchTrace["status"] = papers.length
    ? (distinctFailures.length ? "partial" : "completed")
    : (records.some((record) => record.status === "empty") ? "empty" : "failed");
  return {
    papers,
    records,
    rounds,
    trace: {
      status,
      sources: [...sources],
      queries: rounds.length,
      candidates: rawCandidates,
      deduplicated: papers.length,
      failures: distinctFailures,
    } satisfies AcademicSearchTrace,
  };
}
