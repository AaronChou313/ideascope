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

const endpoint = "https://ieeexploreapi.ieee.org/api/v1/search/articles";
const responseSchema = z.object({
  total_records: z.union([z.number(), z.string()]).optional(),
  articles: z.array(z.object({
    article_number: z.union([z.string(), z.number()]).optional(),
    title: z.string().min(1),
    authors: z.object({ authors: z.array(z.object({ full_name: z.string() })) }).optional(),
    publication_year: z.union([z.string(), z.number()]).optional(),
    publication_title: z.string().optional(),
    doi: z.string().optional(),
    abstract: z.string().optional(),
    html_url: z.string().optional(),
  })).optional(),
});

export class IeeeXploreLiteratureAdapter implements LiteratureAdapter {
  readonly source = "ieee-xplore";
  private readonly fetcher: typeof fetch;
  private readonly getApiKey: () => string | null;
  private readonly throttle: RequestThrottle;

  constructor(options: {
    getApiKey: () => string | null;
    fetcher?: typeof fetch;
    throttle?: RequestThrottle;
  }) {
    this.getApiKey = options.getApiKey;
    this.fetcher = options.fetcher ?? fetch;
    this.throttle = options.throttle ?? new RequestThrottle(500);
  }

  async search(query: LiteratureQuery, options: LiteratureSearchOptions, signal: AbortSignal): Promise<LiteratureSearchResult> {
    validateLiteratureQuery(query);
    const startedAt = new Date().toISOString();
    const apiKey = this.getApiKey();
    let status: SearchStatus = "source_unavailable";
    let httpStatus: number | null = null;
    let papers: Paper[] = [];
    let totalAvailable: number | null = null;
    if (apiKey) {
      const url = new URL(endpoint);
      url.searchParams.set("apikey", apiKey);
      url.searchParams.set("querytext", query.keywords.trim());
      url.searchParams.set("max_records", String(Math.min(Math.max(options.limit, 1), 25)));
      try {
        const response = await this.throttle.run(signal, () =>
          this.fetcher(url, { signal, headers: { Accept: "application/json" } }),
        );
        httpStatus = response.status;
        if (!response.ok) status = response.status === 429 ? "rate_limited" : "source_unavailable";
        else {
          const parsed = responseSchema.safeParse(await response.json());
          if (!parsed.success) status = "invalid_response";
          else {
            status = "completed";
            totalAvailable = Number(parsed.data.total_records ?? 0);
            papers = (parsed.data.articles ?? []).map((article) => {
              const number = String(article.article_number ?? crypto.randomUUID());
              const doi = article.doi?.toLowerCase();
              const year = Number(article.publication_year);
              return {
                id: `ieee:${number}`,
                externalIds: { ieee: number, ...(doi ? { doi } : {}) },
                title: article.title,
                authors: article.authors?.authors.map((author) => author.full_name) ?? [],
                year: Number.isInteger(year) ? year : null,
                venue: article.publication_title ?? null,
                url: article.html_url ?? (doi ? `https://doi.org/${doi}` : "https://ieeexplore.ieee.org"),
                abstract: article.abstract ?? null,
                source: this.source,
                fetchedAt: new Date().toISOString(),
                relatedVersionIds: [],
              } satisfies Paper;
            });
            if (!papers.length) status = "empty";
          }
        }
      } catch {
        status = signal.aborted ? "cancelled" : "source_unavailable";
      }
    }
    const endedAt = new Date().toISOString();
    return {
      papers, nextCursor: null,
      record: {
        id: crypto.randomUUID(), source: this.source, query,
        cacheKey: createSearchCacheKey(this.source, query, options), status,
        startedAt, endedAt, resultCount: papers.length, totalAvailable,
        pagesFetched: status === "completed" ? 1 : 0,
        diagnostic: {
          endpoint, httpStatus, rateLimitRemaining: null, rateLimitResetSeconds: null,
          requestCostUsd: null,
          errorCode: status === "completed" || status === "empty" ? null : status,
        },
      },
    };
  }
}
