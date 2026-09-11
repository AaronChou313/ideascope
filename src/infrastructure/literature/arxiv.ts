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

const endpoint = "https://export.arxiv.org/api/query";

export class ArxivLiteratureAdapter implements LiteratureAdapter {
  readonly source = "arxiv";
  private readonly fetcher: typeof fetch;
  private readonly throttle: RequestThrottle;

  constructor(options: { fetcher?: typeof fetch; throttle?: RequestThrottle } = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.throttle = options.throttle ?? new RequestThrottle(1_000);
  }

  async search(
    query: LiteratureQuery,
    options: LiteratureSearchOptions,
    signal: AbortSignal,
  ): Promise<LiteratureSearchResult> {
    validateLiteratureQuery(query);
    const startedAt = new Date().toISOString();
    const url = new URL(endpoint);
    url.searchParams.set("search_query", `all:${query.keywords.trim()}`);
    url.searchParams.set("start", "0");
    url.searchParams.set("max_results", String(Math.min(Math.max(options.limit, 1), 30)));
    let status: SearchStatus = "completed";
    let httpStatus: number | null = null;
    let papers: Paper[] = [];
    try {
      const response = await this.throttle.run(signal, () =>
        this.fetcher(url, { signal, headers: { Accept: "application/atom+xml" } }),
      );
      httpStatus = response.status;
      if (!response.ok) {
        status = response.status === 429 ? "rate_limited" : "source_unavailable";
      } else {
        const parsed = parseArxivFeed(await response.text(), new Date().toISOString());
        if (!parsed) status = "invalid_response";
        else {
          papers = parsed;
          if (!papers.length) status = "empty";
        }
      }
    } catch {
      status = signal.aborted ? "cancelled" : "source_unavailable";
    }
    const endedAt = new Date().toISOString();
    return {
      papers,
      nextCursor: null,
      record: {
        id: crypto.randomUUID(), source: this.source, query,
        cacheKey: createSearchCacheKey(this.source, query, options), status,
        startedAt, endedAt, resultCount: papers.length, totalAvailable: null,
        pagesFetched: status === "completed" ? 1 : 0,
        diagnostic: {
          endpoint, httpStatus, rateLimitRemaining: null,
          rateLimitResetSeconds: null, requestCostUsd: null,
          errorCode: status === "completed" || status === "empty" ? null : status,
        },
      },
    };
  }
}

function text(element: Element, selector: string) {
  return element.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

export function parseArxivFeed(xml: string, fetchedAt: string): Paper[] | null {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) return null;
  return [...document.querySelectorAll("entry")].flatMap((entry) => {
    const title = text(entry, "title");
    const idUrl = text(entry, "id");
    const match = idUrl.match(/\/abs\/([^?#]+)/);
    if (!title || !match?.[1]) return [];
    const versionedId = match[1];
    const baseId = versionedId.replace(/v\d+$/, "");
    const published = text(entry, "published");
    const year = /^\d{4}/.test(published) ? Number(published.slice(0, 4)) : null;
    const doi = text(entry, "arxiv\\:doi, doi").toLowerCase() || undefined;
    return [{
      id: `arxiv:${baseId}`,
      externalIds: { arxiv: baseId, ...(doi ? { doi } : {}) },
      title,
      authors: [...entry.querySelectorAll("author > name")]
        .map((author) => author.textContent?.trim())
        .filter((author): author is string => Boolean(author)),
      year,
      venue: "arXiv",
      url: idUrl,
      abstract: text(entry, "summary") || null,
      source: "arxiv",
      fetchedAt,
      relatedVersionIds: versionedId === baseId ? [] : [`arxiv:${versionedId}`],
    }];
  });
}
