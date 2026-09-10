import type { Paper } from "../../../contracts/domain";

export type SearchStatus =
  | "completed"
  | "empty"
  | "cancelled"
  | "timed_out"
  | "rate_limited"
  | "source_unavailable"
  | "invalid_response";
export interface LiteratureQuery {
  originalIdea: string;
  keywords: string;
  language: string;
  rationale: string;
}
export interface LiteratureSearchOptions {
  limit: number;
  maxPages: number;
  cursor?: string;
  filters?: { fromYear?: number; toYear?: number; openAccessOnly?: boolean };
  sort?: "relevance" | "cited_by_count" | "publication_date";
  fields: readonly string[];
}
export interface SearchDiagnostic {
  endpoint: string;
  httpStatus: number | null;
  rateLimitRemaining: number | null;
  rateLimitResetSeconds: number | null;
  requestCostUsd: number | null;
  errorCode: SearchStatus | null;
}
export interface SearchRecord {
  id: string;
  source: string;
  query: LiteratureQuery;
  cacheKey: string;
  status: SearchStatus;
  startedAt: string;
  endedAt: string;
  resultCount: number;
  totalAvailable: number | null;
  pagesFetched: number;
  diagnostic: SearchDiagnostic;
}
export interface LiteratureSearchResult {
  papers: Paper[];
  nextCursor: string | null;
  record: SearchRecord;
}
export interface LiteratureAdapter {
  readonly source: string;
  search(
    query: LiteratureQuery,
    options: LiteratureSearchOptions,
    signal: AbortSignal,
  ): Promise<LiteratureSearchResult>;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  return value;
}

export function createSearchCacheKey(
  source: string,
  query: LiteratureQuery,
  options: LiteratureSearchOptions,
) {
  return JSON.stringify(
    canonicalize({
      source,
      query: query.keywords.trim(),
      filters: options.filters ?? {},
      sort: options.sort ?? "relevance",
      fields: [...options.fields].sort(),
      language: query.language,
    }),
  );
}

export function validateLiteratureQuery(query: LiteratureQuery) {
  const idea = query.originalIdea.trim();
  const keywords = query.keywords.trim();
  if (!idea || !keywords || !query.language.trim() || !query.rationale.trim())
    throw new Error("检索想法、关键词、语言和关键词说明均不能为空。");
  if (keywords.length > 1_000)
    throw new Error("检索关键词过长；请拆分为多个可说明的查询。");
  if (/\p{Script=Han}/u.test(idea) && idea === keywords)
    throw new Error(
      "中文想法不能未经整理直接作为关键词；请提供独立检索词并说明转换依据。",
    );
}
