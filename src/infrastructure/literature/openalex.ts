import { z } from "zod";
import type { Paper } from "../../../contracts/domain";
import {
  createSearchCacheKey,
  type LiteratureAdapter,
  type LiteratureQuery,
  type LiteratureSearchOptions,
  type LiteratureSearchResult,
  type SearchDiagnostic,
  type SearchStatus,
  validateLiteratureQuery,
} from "../../domain/search/literature";
import { RequestThrottle } from "./request-throttle";

const endpoint = "https://api.openalex.org/works";
export const OPENALEX_FIELDS = [
  "id",
  "doi",
  "title",
  "publication_year",
  "authorships",
  "primary_location",
  "best_oa_location",
  "abstract_inverted_index",
] as const;
const workSchema = z.object({
  id: z.string().url(),
  doi: z.string().nullable().optional(),
  title: z.string().min(1),
  publication_year: z.number().int().nullable().optional(),
  authorships: z
    .array(
      z.object({
        author: z.object({ display_name: z.string().nullable().optional() }),
      }),
    )
    .optional(),
  primary_location: z
    .object({
      source: z
        .object({ display_name: z.string().nullable().optional() })
        .nullable()
        .optional(),
      landing_page_url: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  best_oa_location: z
    .object({ landing_page_url: z.string().nullable().optional() })
    .nullable()
    .optional(),
  abstract_inverted_index: z
    .record(z.string(), z.array(z.number().int().nonnegative()))
    .nullable()
    .optional(),
});
const responseSchema = z.object({
  meta: z.object({
    count: z.number().int().nonnegative(),
    next_cursor: z.string().nullable().optional(),
    cost_usd: z.number().nonnegative().nullable().optional(),
  }),
  results: z.array(workSchema),
});
type Work = z.infer<typeof workSchema>;

export interface OpenAlexAdapterOptions {
  fetcher?: typeof fetch;
  throttle?: RequestThrottle;
  timeoutMs?: number;
  now?: () => Date;
}

export class OpenAlexLiteratureAdapter implements LiteratureAdapter {
  readonly source = "openalex";
  private readonly fetcher: typeof fetch;
  private readonly throttle: RequestThrottle;
  private readonly timeoutMs: number;
  private readonly now: () => Date;
  constructor(options: OpenAlexAdapterOptions = {}) {
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.throttle = options.throttle ?? new RequestThrottle();
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.now = options.now ?? (() => new Date());
  }

  async search(
    query: LiteratureQuery,
    options: LiteratureSearchOptions,
    signal: AbortSignal,
  ): Promise<LiteratureSearchResult> {
    validateLiteratureQuery(query);
    const fields = options.fields.length ? options.fields : OPENALEX_FIELDS;
    if (
      fields.some(
        (field) =>
          !OPENALEX_FIELDS.includes(field as (typeof OPENALEX_FIELDS)[number]),
      )
    )
      throw new Error("OpenAlex 字段列表包含未允许字段。");
    if (
      options.filters?.fromYear &&
      options.filters?.toYear &&
      options.filters.fromYear > options.filters.toYear
    )
      throw new Error("检索起始年份不能晚于结束年份。");
    const limit = Math.min(Math.max(Math.floor(options.limit), 1), 60);
    const maxPages = Math.min(Math.max(Math.floor(options.maxPages), 1), 5);
    const startedAt = this.now().toISOString();
    const cacheKey = createSearchCacheKey(this.source, query, options);
    const papers: Paper[] = [];
    let cursor: string | null = options.cursor ?? "*";
    let pagesFetched = 0;
    let totalAvailable: number | null = null;
    let diagnostic = emptyDiagnostic();
    let status: SearchStatus = "completed";
    let timedOut = false;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    try {
      while (cursor && pagesFetched < maxPages && papers.length < limit) {
        const url = buildSearchUrl(
          query,
          { ...options, fields },
          cursor,
          Math.min(100, limit - papers.length),
        );
        const response = await this.throttle.run(controller.signal, () =>
          this.fetcher(url, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          }),
        );
        diagnostic = readDiagnostic(response);
        if (!response.ok) {
          status =
            response.status === 429 ? "rate_limited" : "source_unavailable";
          diagnostic.errorCode = status;
          break;
        }
        const parsed = responseSchema.safeParse(await response.json());
        if (!parsed.success) {
          status = "invalid_response";
          diagnostic.errorCode = status;
          break;
        }
        pagesFetched += 1;
        totalAvailable = parsed.data.meta.count;
        diagnostic.requestCostUsd = parsed.data.meta.cost_usd ?? null;
        papers.push(
          ...parsed.data.results.map((work) =>
            normalizeWork(work, this.now().toISOString()),
          ),
        );
        cursor = parsed.data.meta.next_cursor ?? null;
      }
      if (status === "completed" && papers.length === 0) status = "empty";
    } catch {
      status = controller.signal.aborted
        ? timedOut
          ? "timed_out"
          : "cancelled"
        : "source_unavailable";
      diagnostic.errorCode = status;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    }
    const record = {
      id: crypto.randomUUID(),
      source: this.source,
      query,
      cacheKey,
      status,
      startedAt,
      endedAt: this.now().toISOString(),
      resultCount: papers.length,
      totalAvailable,
      pagesFetched,
      diagnostic,
    };
    return { papers: papers.slice(0, limit), nextCursor: cursor, record };
  }
}

function buildSearchUrl(
  query: LiteratureQuery,
  options: LiteratureSearchOptions,
  cursor: string,
  perPage: number,
) {
  const url = new URL(endpoint);
  url.searchParams.set("search", query.keywords.trim());
  url.searchParams.set("cursor", cursor);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("select", options.fields.join(","));
  const filters: string[] = [];
  if (options.filters?.fromYear)
    filters.push(`from_publication_date:${options.filters.fromYear}-01-01`);
  if (options.filters?.toYear)
    filters.push(`to_publication_date:${options.filters.toYear}-12-31`);
  if (options.filters?.openAccessOnly) filters.push("is_oa:true");
  if (filters.length) url.searchParams.set("filter", filters.join(","));
  if (options.sort && options.sort !== "relevance")
    url.searchParams.set("sort", `${options.sort}:desc`);
  return url;
}

function normalizeWork(work: Work, fetchedAt: string): Paper {
  const openalex = work.id.replace("https://openalex.org/", "");
  const doi = work.doi
    ?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .toLowerCase();
  const externalIds: Paper["externalIds"] = { openalex };
  if (doi) externalIds.doi = doi;
  return {
    id: `openalex:${openalex}`,
    externalIds,
    title: work.title,
    authors: (work.authorships ?? [])
      .map((item) => item.author.display_name)
      .filter((name): name is string => Boolean(name)),
    year: work.publication_year ?? null,
    venue: work.primary_location?.source?.display_name ?? null,
    url:
      work.best_oa_location?.landing_page_url ??
      work.primary_location?.landing_page_url ??
      work.id,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    source: "openalex",
    fetchedAt,
    relatedVersionIds: [],
  };
}

function reconstructAbstract(index: Work["abstract_inverted_index"]) {
  if (!index) return null;
  const words: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(index))
    for (const position of positions) words.push([position, word]);
  return (
    words
      .sort(([left], [right]) => left - right)
      .map(([, word]) => word)
      .join(" ") || null
  );
}

function emptyDiagnostic(): SearchDiagnostic {
  return {
    endpoint,
    httpStatus: null,
    rateLimitRemaining: null,
    rateLimitResetSeconds: null,
    requestCostUsd: null,
    errorCode: null,
  };
}
function numberHeader(headers: Headers, name: string) {
  const value = headers.get(name);
  return value !== null && Number.isFinite(Number(value))
    ? Number(value)
    : null;
}
function readDiagnostic(response: Response): SearchDiagnostic {
  return {
    endpoint,
    httpStatus: response.status,
    rateLimitRemaining: numberHeader(response.headers, "X-RateLimit-Remaining"),
    rateLimitResetSeconds: numberHeader(response.headers, "X-RateLimit-Reset"),
    requestCostUsd: null,
    errorCode: null,
  };
}
