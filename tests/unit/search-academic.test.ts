import { describe, expect, it, vi } from "vitest";
import type { Paper } from "../../contracts/domain";
import { searchAcademic } from "../../src/application/literature/search-academic";
import { SourceRegistry } from "../../src/application/literature/literature-source-registry";
import type { LiteratureAdapter, LiteratureSearchResult, SearchStatus } from "../../src/domain/search/literature";

const capabilities = {
  search: "supported", abstract: "supported", citations: "unknown", references: "unknown",
  yearFilter: "supported", venueFilter: "unknown", authorFilter: "unknown",
  fullText: "unsupported", directLookup: "unsupported",
} as const;

function paper(id: string, overrides: Partial<Paper> = {}): Paper {
  return {
    id, externalIds: {}, title: id, authors: ["A. Author"], year: 2024,
    venue: null, url: `https://example.test/${id}`, abstract: null, source: "test",
    fetchedAt: new Date(0).toISOString(), relatedVersionIds: [], ...overrides,
  };
}

function result(source: string, papers: Paper[], status: SearchStatus = "completed"): LiteratureSearchResult {
  return {
    papers, nextCursor: null,
    record: {
      id: crypto.randomUUID(), source, status, startedAt: "start", endedAt: "end",
      query: { originalIdea: "idea", keywords: "query", language: "en", rationale: "test" },
      cacheKey: source, resultCount: papers.length, totalAvailable: papers.length, pagesFetched: 1,
      diagnostic: { endpoint: "https://example.test", httpStatus: status === "completed" ? 200 : 429, rateLimitRemaining: null, rateLimitResetSeconds: null, requestCostUsd: null, errorCode: status === "completed" ? null : status },
    },
  };
}

function registry(adapters: LiteratureAdapter[]) {
  const value = new SourceRegistry();
  for (const adapter of adapters) value.register({
    manifest: {
      documentType: "ideascope.literature-source", manifestVersion: 1, id: adapter.source,
      name: adapter.source, description: "test source", adapter: { kind: "builtin", driver: adapter.source },
      auth: { kind: "none" }, capabilities, metadata: { homepage: "https://example.test" },
    },
    installation: { sourceId: adapter.source, enabled: true, installedAt: "now", updatedAt: "now", credentialSlot: null },
    createAdapter: () => adapter,
  });
  return value;
}

const request = {
  requestVersion: 1 as const, userQuestion: "机器人定位", query: "robot localization", intent: "landscape" as const,
  budget: { maxSources: 3, maxQueries: 2, maxCandidates: 10 },
};

describe("searchAcademic", () => {
  it("runs sources in parallel and preserves partial results", async () => {
    let active = 0;
    let peak = 0;
    const adapter = (source: string, status: SearchStatus): LiteratureAdapter => ({
      source,
      search: vi.fn(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active -= 1;
        return result(source, status === "completed" ? [paper(source)] : [], status);
      }),
    });
    const output = await searchAcademic({
      requests: [request, { ...request, query: "state estimation" }],
      registry: registry([adapter("source-a", "completed"), adapter("source-b", "rate_limited")]),
      effectiveProfile: null, signal: new AbortController().signal,
    });
    expect(peak).toBeGreaterThan(1);
    expect(output.papers).toHaveLength(1);
    expect(output.trace).toMatchObject({ status: "partial", queries: 2, sources: ["source-a", "source-b"] });
    expect(output.trace.failures).toEqual(expect.arrayContaining([{ sourceId: "source-b", status: "rate_limited" }]));
  });

  it("merges exact DOI duplicates and keeps richer metadata", async () => {
    const left = paper("left", { externalIds: { doi: "10.1000/same", openalex: "W1" }, abstract: null });
    const right = paper("right", { externalIds: { doi: "https://doi.org/10.1000/SAME", crossref: "10.1000/same" }, abstract: "Richer abstract" });
    const adapters: LiteratureAdapter[] = [left, right].map((item, index) => ({
      source: `source-${index}`,
      search: () => Promise.resolve(result(`source-${index}`, [item])),
    }));
    const output = await searchAcademic({ requests: [request], registry: registry(adapters), effectiveProfile: null, signal: new AbortController().signal });
    expect(output.papers).toHaveLength(1);
    expect(output.papers[0]).toMatchObject({ abstract: "Richer abstract", externalIds: { doi: "https://doi.org/10.1000/SAME", openalex: "W1", crossref: "10.1000/same" } });
  });

  it("links title-author-year candidates without silently merging them", async () => {
    const left = paper("preprint", { title: "Contact Aided Estimation", year: 2023 });
    const right = paper("published", { title: "contact-aided estimation", year: 2024 });
    const adapters: LiteratureAdapter[] = [left, right].map((item, index) => ({ source: `source-${index}`, search: () => Promise.resolve(result(`source-${index}`, [item])) }));
    const output = await searchAcademic({ requests: [request], registry: registry(adapters), effectiveProfile: null, signal: new AbortController().signal });
    expect(output.papers).toHaveLength(2);
    expect(output.papers[0]!.relatedVersionIds).toContain("published");
    expect(output.papers[1]!.relatedVersionIds).toContain("preprint");
  });

  it("records thrown source failures instead of discarding diagnostics", async () => {
    const failing: LiteratureAdapter = { source: "broken", search: () => Promise.reject(new TypeError("network")) };
    const output = await searchAcademic({ requests: [request], registry: registry([failing]), effectiveProfile: null, signal: new AbortController().signal });
    expect(output.trace).toMatchObject({ status: "failed", failures: [{ sourceId: "broken", status: "source_unavailable" }] });
  });
});
