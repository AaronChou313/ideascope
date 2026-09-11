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

const endpoint = "https://api.crossref.org/works";
const responseSchema = z.object({
  message: z.object({
    "total-results": z.number(),
    items: z.array(
      z.object({
        DOI: z.string().nullable().optional(),
        title: z.array(z.string()).nullable().optional(),
        author: z.unknown().optional(),
        published: z.unknown().optional(),
        "container-title": z.unknown().optional(),
        URL: z.string().nullable().optional(),
        abstract: z.string().nullable().optional(),
      }),
    ),
  }),
});

export class CrossrefLiteratureAdapter implements LiteratureAdapter {
  readonly source = "crossref";
  private readonly fetcher: typeof fetch;
  private readonly throttle: RequestThrottle;
  constructor(
    options: { fetcher?: typeof fetch; throttle?: RequestThrottle } = {},
  ) {
    this.fetcher = options.fetcher ?? fetch;
    this.throttle = options.throttle ?? new RequestThrottle(160);
  }
  async search(
    query: LiteratureQuery,
    options: LiteratureSearchOptions,
    signal: AbortSignal,
  ): Promise<LiteratureSearchResult> {
    validateLiteratureQuery(query);
    const startedAt = new Date().toISOString();
    const url = new URL(endpoint);
    url.searchParams.set("query.bibliographic", query.keywords);
    url.searchParams.set("rows", String(Math.min(options.limit, 20)));
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
          papers = parsed.data.message.items.flatMap((item, index) => {
            const title = item.title?.[0]?.trim();
            if (!title) return [];
            const doi = item.DOI?.toLowerCase();
            return [
              {
                id: doi ? `doi:${doi}` : `crossref:${crypto.randomUUID()}`,
                externalIds: doi ? { doi, crossref: doi } : {},
                title,
                authors: readAuthors(item.author),
                year: readYear(item.published),
                venue: readFirstString(item["container-title"]),
                url:
                  item.URL ??
                  (doi ? `https://doi.org/${doi}` : `${endpoint}/${index}`),
                abstract:
                  item.abstract
                    ?.replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim() ?? null,
                source: "crossref",
                fetchedAt: new Date().toISOString(),
                relatedVersionIds: [],
              },
            ];
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

function readAuthors(value: unknown) {
  return Array.isArray(value)
    ? value.flatMap((author) => {
        if (!author || typeof author !== "object") return [];
        const record = author as Record<string, unknown>;
        const name = [record.given, record.family]
          .filter((item): item is string => typeof item === "string")
          .join(" ");
        return name ? [name] : [];
      })
    : [];
}
function readYear(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const parts = (value as Record<string, unknown>)["date-parts"];
  const year: unknown =
    Array.isArray(parts) && Array.isArray(parts[0]) ? parts[0][0] : null;
  return typeof year === "number" ? year : null;
}
function readFirstString(value: unknown) {
  return Array.isArray(value) && typeof value[0] === "string" ? value[0] : null;
}
