import { describe, expect, it, vi } from "vitest";
import {
  createSearchCacheKey,
  validateLiteratureQuery,
  type LiteratureQuery,
  type LiteratureSearchOptions,
} from "../../src/domain/search/literature";
import {
  OpenAlexLiteratureAdapter,
  OPENALEX_FIELDS,
} from "../../src/infrastructure/literature/openalex";
import { RequestThrottle } from "../../src/infrastructure/literature/request-throttle";
import { CrossrefLiteratureAdapter } from "../../src/infrastructure/literature/crossref";
import { SemanticScholarLiteratureAdapter } from "../../src/infrastructure/literature/semantic-scholar";
import { ArxivLiteratureAdapter } from "../../src/infrastructure/literature/arxiv";
import { IeeeXploreLiteratureAdapter } from "../../src/infrastructure/literature/ieee-xplore";
import { buildExternalSourceSearchUrl } from "../../src/infrastructure/literature/builtin-source-registry";

const query: LiteratureQuery = {
  originalIdea: "怎样让研究型问答更可靠？",
  keywords: "retrieval augmented generation reliability",
  language: "en",
  rationale: "将研究对象与可靠性约束转换为可检索英文术语。",
};
const options: LiteratureSearchOptions = {
  limit: 2,
  maxPages: 2,
  filters: { fromYear: 2020, openAccessOnly: true },
  sort: "relevance",
  fields: OPENALEX_FIELDS,
};
const work = {
  id: "https://openalex.org/W1",
  doi: "https://doi.org/10.1/ABC",
  title: "A Paper",
  publication_year: 2024,
  authorships: [{ author: { display_name: "Ada" } }],
  primary_location: {
    source: { display_name: "Journal" },
    landing_page_url: "https://example.test/paper",
  },
  best_oa_location: null,
  abstract_inverted_index: { Reliable: [1], Systems: [0] },
};

function response(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function requestedUrl(input: RequestInfo | URL | undefined) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (input instanceof Request) return input.url;
  throw new Error("Expected a request URL");
}

describe("OpenAlex literature adapter", () => {
  it("builds a bounded keyword request and normalizes untrusted response fields", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      response(
        {
          meta: { count: 12, next_cursor: null, cost_usd: 0.001 },
          results: [work],
        },
        200,
        { "X-RateLimit-Remaining": "99", "X-RateLimit-Reset": "300" },
      ),
    );
    const adapter = new OpenAlexLiteratureAdapter({
      fetcher,
      throttle: new RequestThrottle(0),
      now: () => new Date("2026-09-10T00:00:00.000Z"),
    });
    const result = await adapter.search(
      query,
      options,
      new AbortController().signal,
    );
    const requested = new URL(requestedUrl(fetcher.mock.calls[0]?.[0]));
    expect(requested.searchParams.get("search")).toBe(query.keywords);
    expect(requested.toString()).not.toContain(
      encodeURIComponent(query.originalIdea),
    );
    expect(requested.searchParams.get("cursor")).toBe("*");
    expect(requested.searchParams.get("filter")).toContain("is_oa:true");
    expect(result.record).toMatchObject({
      status: "completed",
      resultCount: 1,
      totalAvailable: 12,
      pagesFetched: 1,
    });
    expect(result.record.diagnostic).toMatchObject({
      endpoint: "https://api.openalex.org/works",
      httpStatus: 200,
      rateLimitRemaining: 99,
      rateLimitResetSeconds: 300,
      requestCostUsd: 0.001,
      errorCode: null,
    });
    expect(result.papers[0]).toMatchObject({
      id: "openalex:W1",
      externalIds: { openalex: "W1", doi: "10.1/abc" },
      title: "A Paper",
      authors: ["Ada"],
      abstract: "Systems Reliable",
    });
  });

  it("uses cursor paging but stops at the product record cap", async () => {
    const works = (start: number, count: number) =>
      Array.from({ length: count }, (_, index) => ({
        ...work,
        id: `https://openalex.org/W${start + index}`,
        title: `Paper ${start + index}`,
      }));
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({
          meta: { count: 1000, next_cursor: "next" },
          results: works(1, 40),
        }),
      )
      .mockResolvedValueOnce(
        response({
          meta: { count: 1000, next_cursor: "later" },
          results: works(41, 40),
        }),
      );
    const adapter = new OpenAlexLiteratureAdapter({
      fetcher,
      throttle: new RequestThrottle(0),
    });
    const result = await adapter.search(
      query,
      { ...options, limit: 60 },
      new AbortController().signal,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      new URL(requestedUrl(fetcher.mock.calls[1]?.[0])).searchParams.get(
        "cursor",
      ),
    ).toBe("next");
    expect(result.papers).toHaveLength(60);
    expect(result.nextCursor).toBe("later");
  });

  it.each([
    [429, "rate_limited"],
    [503, "source_unavailable"],
  ] as const)(
    "returns a controlled status for HTTP %s",
    async (status, expected) => {
      const adapter = new OpenAlexLiteratureAdapter({
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(response({}, status)),
        throttle: new RequestThrottle(0),
      });
      const result = await adapter.search(
        query,
        options,
        new AbortController().signal,
      );
      expect(result.record.status).toBe(expected);
      expect(result.papers).toEqual([]);
      expect(result.record.diagnostic.endpoint).not.toContain("?");
    },
  );

  it("distinguishes empty and invalid responses", async () => {
    const emptyAdapter = new OpenAlexLiteratureAdapter({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          response({ meta: { count: 0, next_cursor: null }, results: [] }),
        ),
      throttle: new RequestThrottle(0),
    });
    await expect(
      emptyAdapter.search(query, options, new AbortController().signal),
    ).resolves.toMatchObject({ record: { status: "empty" } });
    const invalidAdapter = new OpenAlexLiteratureAdapter({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(response({ unexpected: true })),
      throttle: new RequestThrottle(0),
    });
    await expect(
      invalidAdapter.search(query, options, new AbortController().signal),
    ).resolves.toMatchObject({ record: { status: "invalid_response" } });
  });

  it("turns timeout and user cancellation into separate records", async () => {
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        ),
      );
    const timeoutAdapter = new OpenAlexLiteratureAdapter({
      fetcher: hangingFetch,
      throttle: new RequestThrottle(0),
      timeoutMs: 5,
    });
    await expect(
      timeoutAdapter.search(query, options, new AbortController().signal),
    ).resolves.toMatchObject({ record: { status: "timed_out" } });
    const controller = new AbortController();
    const cancelled = new OpenAlexLiteratureAdapter({
      fetcher: hangingFetch,
      throttle: new RequestThrottle(0),
    }).search(query, options, controller.signal);
    controller.abort();
    await expect(cancelled).resolves.toMatchObject({
      record: { status: "cancelled" },
    });
  });
});

describe("literature query contract", () => {
  it("normalizes Crossref publication metadata for fallback search", async () => {
    const adapter = new CrossrefLiteratureAdapter({
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(
        response({
          message: {
            "total-results": 1,
            items: [
              {
                DOI: "10.1/LIDAR",
                title: ["Lidar Robot Localization"],
                author: [{ given: "Ada", family: "Li" }],
                published: { "date-parts": [[2025]] },
                "container-title": ["Robotics"],
                URL: "https://doi.org/10.1/lidar",
              },
            ],
          },
        }),
      ),
      throttle: new RequestThrottle(0),
    });
    const result = await adapter.search(
      query,
      { ...options, fields: [] },
      new AbortController().signal,
    );
    expect(result.record.status).toBe("completed");
    expect(result.papers[0]).toMatchObject({
      id: "doi:10.1/lidar",
      title: "Lidar Robot Localization",
      authors: ["Ada Li"],
      source: "crossref",
    });
  });
  it("normalizes Semantic Scholar metadata for fallback search", async () => {
    const adapter = new SemanticScholarLiteratureAdapter({
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(
        response({
          total: 1,
          data: [{
            paperId: "S1", title: "Contact-aware localization", abstract: "Abstract",
            year: 2025, authors: [{ name: "Ada Li" }], venue: "Robotics",
            url: "https://example.test/s1", externalIds: { DOI: "10.1/CONTACT" },
          }],
        }),
      ),
      throttle: new RequestThrottle(0),
    });
    const result = await adapter.search(
      query,
      { ...options, fields: [] },
      new AbortController().signal,
    );
    expect(result.record.status).toBe("completed");
    expect(result.papers[0]).toMatchObject({
      id: "semantic-scholar:S1",
      externalIds: { doi: "10.1/contact" },
      abstract: "Abstract",
      source: "semantic-scholar",
    });
  });
  it("rejects using an unchanged Chinese idea as the keyword query", () => {
    expect(() =>
      validateLiteratureQuery({ ...query, keywords: query.originalIdea }),
    ).toThrow(/不能未经整理/);
  });

  it("makes cache identity sensitive to fields, language, filters, and sort", () => {
    const base = createSearchCacheKey("openalex", query, options);
    expect(
      createSearchCacheKey("openalex", { ...query, language: "zh" }, options),
    ).not.toBe(base);
    expect(
      createSearchCacheKey("openalex", query, { ...options, fields: ["id"] }),
    ).not.toBe(base);
  });
});

describe("additional built-in literature sources", () => {
  it("searches and normalizes an arXiv Atom response", async () => {
    const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <entry><id>https://arxiv.org/abs/2401.12345v2</id><title> Contact Aided Estimation </title>
      <summary> A useful abstract. </summary><published>2024-01-20T00:00:00Z</published>
      <author><name>Ada Li</name></author></entry></feed>`;
    const adapter = new ArxivLiteratureAdapter({
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(xml, { status: 200 })),
      throttle: new RequestThrottle(0),
    });
    const result = await adapter.search(query, { ...options, fields: [] }, new AbortController().signal);
    expect(result.record.status).toBe("completed");
    expect(result.papers[0]).toMatchObject({
      id: "arxiv:2401.12345", externalIds: { arxiv: "2401.12345" },
      title: "Contact Aided Estimation", authors: ["Ada Li"], year: 2024,
      abstract: "A useful abstract.", source: "arxiv",
    });
  });

  it("does not call IEEE Xplore without a user credential", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const adapter = new IeeeXploreLiteratureAdapter({ getApiKey: () => null, fetcher });
    const result = await adapter.search(query, { ...options, fields: [] }, new AbortController().signal);
    expect(result.record.status).toBe("source_unavailable");
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.record.diagnostic.endpoint).not.toContain("apikey");
  });

  it("builds only an external Google Scholar link and never an automated adapter", () => {
    expect(buildExternalSourceSearchUrl("google-scholar", "robot contact sensing")).toBe(
      "https://scholar.google.com/scholar?q=robot%20contact%20sensing",
    );
    expect(buildExternalSourceSearchUrl("openalex", "query")).toBeNull();
  });
});
