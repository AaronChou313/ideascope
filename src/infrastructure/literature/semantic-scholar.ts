import { z } from "zod";
import type { Paper } from "../../../contracts/domain";
import {
  createSearchCacheKey,
  type LiteratureAdapter,
  type LiteratureQuery,
  type LiteratureSearchOptions,
  type LiteratureSearchResult,
  type SearchStatus,
  validateLiteratureQuery,
} from "../../domain/search/literature";
import { RequestThrottle } from "./request-throttle";

const endpoint = "https://api.semanticscholar.org/graph/v1/paper/search";
const responseSchema = z.object({
  total: z.number(),
  data: z.array(
    z.object({
      paperId: z.string(),
      title: z.string(),
      abstract: z.string().nullable().optional(),
      year: z.number().nullable().optional(),
      authors: z.array(z.object({ name: z.string() })).optional(),
      venue: z.string().nullable().optional(),
      url: z.string().optional(),
      externalIds: z
        .object({
          DOI: z.string().nullable().optional(),
          ArXiv: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
      citationCount: z.number().int().nonnegative().nullable().optional(),
    }),
  ),
});

export class SemanticScholarLiteratureAdapter implements LiteratureAdapter {
  readonly source = "semantic-scholar";
  private readonly fetcher: typeof fetch;
  private readonly throttle: RequestThrottle;
  constructor(
    options: { fetcher?: typeof fetch; throttle?: RequestThrottle } = {},
  ) {
    this.fetcher = options.fetcher ?? fetch;
    this.throttle = options.throttle ?? new RequestThrottle(1000);
  }
  async search(
    query: LiteratureQuery,
    options: LiteratureSearchOptions,
    signal: AbortSignal,
  ): Promise<LiteratureSearchResult> {
    validateLiteratureQuery(query);
    const startedAt = new Date().toISOString();
    const url = new URL(endpoint);
    url.searchParams.set("query", query.keywords);
    url.searchParams.set("limit", String(Math.min(options.limit, 20)));
    url.searchParams.set(
      "fields",
      "paperId,title,abstract,year,authors,venue,url,externalIds,citationCount",
    );
    let status: SearchStatus = "completed",
      httpStatus: number | null = null,
      papers: Paper[] = [];
    try {
      const response = await this.throttle.run(signal, () =>
        this.fetcher(url, { signal, headers: { Accept: "application/json" } }),
      );
      httpStatus = response.status;
      if (!response.ok)
        status =
          response.status === 429 ? "rate_limited" : "source_unavailable";
      else {
        const parsed = responseSchema.safeParse(await response.json());
        if (!parsed.success) status = "invalid_response";
        else
          papers = parsed.data.data.map((item) => {
            const doi = item.externalIds?.DOI?.toLowerCase();
            const arxiv = item.externalIds?.ArXiv ?? undefined;
            return {
              id: `semantic-scholar:${item.paperId}`,
              externalIds: {
                semanticScholar: item.paperId,
                ...(doi ? { doi } : {}),
                ...(arxiv ? { arxiv } : {}),
              },
              title: item.title,
              authors: (item.authors ?? []).map((author) => author.name),
              year: item.year ?? null,
              venue: item.venue ?? null,
              url:
                item.url ??
                `https://www.semanticscholar.org/paper/${item.paperId}`,
              abstract: item.abstract ?? null,
              source: this.source,
              fetchedAt: new Date().toISOString(),
              relatedVersionIds: [],
              citationCount: item.citationCount ?? null,
            };
          });
        if (!papers.length) status = "empty";
      }
    } catch {
      status = signal.aborted ? "cancelled" : "source_unavailable";
    }
    const endedAt = new Date().toISOString();
    return {
      papers,
      nextCursor: null,
      record: {
        id: crypto.randomUUID(),
        source: this.source,
        query,
        cacheKey: createSearchCacheKey(this.source, query, options),
        status,
        startedAt,
        endedAt,
        resultCount: papers.length,
        totalAvailable: null,
        pagesFetched: status === "completed" ? 1 : 0,
        diagnostic: {
          endpoint,
          httpStatus,
          rateLimitRemaining: null,
          rateLimitResetSeconds: null,
          requestCostUsd: null,
          errorCode:
            status === "completed" || status === "empty" ? null : status,
        },
      },
    };
  }
}
