import type { Paper } from "../../../contracts/domain";
import { reviewDuplicate } from "../../domain/evidence/deduplicate";
import type { EffectiveResearchProfile } from "../../domain/research-profile/research-profile";
import { academicSearchRequestSchema, type AcademicSearchRequest } from "../../domain/search/academic-search";
import type { SearchRecord } from "../../domain/search/literature";
import type { SourceRegistry } from "./literature-source-registry";
import { routeAcademicSearch } from "./route-academic-search";

export interface AcademicSearchTrace {
  status: "completed" | "partial" | "empty" | "failed" | "cancelled";
  sources: string[];
  queries: number;
  candidates: number;
  deduplicated: number;
  failures: Array<{ sourceId: string; status: SearchRecord["status"] }>;
}

export async function searchAcademic(options: {
  requests: readonly AcademicSearchRequest[];
  registry: SourceRegistry;
  effectiveProfile: EffectiveResearchProfile | null;
  signal: AbortSignal;
  onRecord?: (record: SearchRecord) => Promise<void> | void;
}) {
  const requests = options.requests.map((request) => academicSearchRequestSchema.parse(request));
  if (!requests.length) throw new Error("Academic Search 至少需要一个查询。");
  const first = requests[0]!;
  const maxQueries = Math.min(first.budget.maxQueries, requests.length);
  const selected = routeAcademicSearch(first, options.registry, options.effectiveProfile).sources;
  if (!selected.length) throw new Error("当前已启用来源不支持这类检索能力。");
  const perSearchLimit = Math.max(1, Math.ceil(first.budget.maxCandidates / (selected.length * maxQueries)));
  const tasks = requests.slice(0, maxQueries).flatMap((request) =>
    selected.map(({ sourceId, adapter }) => ({ sourceId, promise: (async () => {
      if (options.signal.aborted) throw new DOMException("已取消", "AbortError");
      const result = await adapter.search(
        { originalIdea: request.userQuestion, keywords: request.query, language: "en", rationale: `Search intent: ${request.intent}` },
        {
          limit: perSearchLimit,
          maxPages: 1,
          fields: [],
          filters: request.filters ? { fromYear: request.filters.fromYear, toYear: request.filters.toYear } : undefined,
          sort: request.intent === "recent" ? "publication_date" : "relevance",
        },
        options.signal,
      );
      await options.onRecord?.(result.record);
      return { sourceId, result };
    })() })),
  );
  const settled = await Promise.allSettled(tasks.map((task) => task.promise));
  if (options.signal.aborted) throw new DOMException("已取消", "AbortError");
  const records: SearchRecord[] = [];
  const rawPapers: Paper[] = [];
  const failures: AcademicSearchTrace["failures"] = [];
  for (const [index, item] of settled.entries()) {
    if (item.status === "rejected") {
      if (item.reason instanceof DOMException && item.reason.name === "AbortError")
        throw item.reason;
      failures.push({ sourceId: tasks[index]!.sourceId, status: "source_unavailable" });
      continue;
    }
    records.push(item.value.result.record);
    rawPapers.push(...item.value.result.papers);
    if (!["completed", "empty"].includes(item.value.result.record.status))
      failures.push({ sourceId: item.value.sourceId, status: item.value.result.record.status });
  }
  const papers = deduplicatePapers(rawPapers).slice(0, first.budget.maxCandidates);
  const distinctFailures = [...new Map(
    failures.map((failure) => [`${failure.sourceId}:${failure.status}`, failure]),
  ).values()];
  const successCount = records.filter((record) => record.status === "completed" || record.status === "empty").length;
  const status: AcademicSearchTrace["status"] = papers.length
    ? (distinctFailures.length || successCount < tasks.length ? "partial" : "completed")
    : (successCount ? "empty" : "failed");
  return {
    papers,
    records,
    trace: {
      status,
      sources: selected.map((source) => source.sourceId),
      queries: maxQueries,
      candidates: rawPapers.length,
      deduplicated: papers.length,
      failures: distinctFailures,
    } satisfies AcademicSearchTrace,
  };
}

export function deduplicatePapers(incoming: readonly Paper[]) {
  const papers: Paper[] = [];
  for (const paper of incoming) {
    const sameId = papers.findIndex((existing) => existing.id === paper.id);
    if (sameId >= 0) {
      papers[sameId] = mergePaper(papers[sameId]!, paper);
      continue;
    }
    const matches = reviewDuplicate(paper, papers);
    const exact = matches.find((match) => match.relation === "exact");
    if (exact) {
      const index = papers.findIndex((existing) => existing.id === exact.paperId);
      papers[index] = mergePaper(papers[index]!, paper);
      continue;
    }
    const candidates = matches.filter((match) => match.relation === "candidate");
    const relatedVersionIds = [...new Set([
      ...paper.relatedVersionIds,
      ...candidates.map((match) => match.paperId),
    ])];
    papers.push({ ...paper, relatedVersionIds });
    for (const candidate of candidates) {
      const index = papers.findIndex((existing) => existing.id === candidate.paperId);
      if (index >= 0)
        papers[index] = { ...papers[index]!, relatedVersionIds: [...new Set([...papers[index]!.relatedVersionIds, paper.id])] };
    }
  }
  return papers;
}

function mergePaper(left: Paper, right: Paper): Paper {
  const richer = (right.abstract?.length ?? 0) > (left.abstract?.length ?? 0) ? right : left;
  return {
    ...richer,
    externalIds: { ...left.externalIds, ...right.externalIds },
    authors: richer.authors.length ? richer.authors : left.authors,
    venue: richer.venue ?? left.venue,
    year: richer.year ?? left.year,
    relatedVersionIds: [...new Set([...left.relatedVersionIds, ...right.relatedVersionIds, left.id, right.id])].filter((id) => id !== richer.id),
  };
}
