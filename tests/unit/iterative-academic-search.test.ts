import { describe, expect, it, vi } from "vitest";
import type { Paper } from "../../contracts/domain";
import { searchAcademicIteratively } from "../../src/application/literature/search-academic-iteratively";
import { SourceRegistry } from "../../src/application/literature/literature-source-registry";
import type { LiteratureAdapter } from "../../src/domain/search/literature";

const request = (query: string) => ({
  requestVersion: 1 as const, userQuestion: "robot localization", query,
  intent: "landscape" as const, budget: { maxSources: 1, maxQueries: 3, maxCandidates: 6 },
});
function paper(id: string): Paper {
  return { id, externalIds: { doi: `10.1000/${id}` }, title: `robot localization ${id}`, authors: [], year: 2025, venue: null, url: "https://example.test", abstract: "abstract", source: "mock", fetchedAt: "2026-01-01T00:00:00.000Z", relatedVersionIds: [] };
}
function createRegistry(search: LiteratureAdapter["search"]) {
  const registry = new SourceRegistry();
  registry.register({
    manifest: {
      documentType: "ideascope.literature-source", manifestVersion: 1, id: "mock", name: "Mock", description: "mock source",
      adapter: { kind: "builtin", driver: "mock" }, auth: { kind: "none" },
      capabilities: { search: "supported", abstract: "supported", citations: "unknown", references: "unknown", venueFilter: "unknown", yearFilter: "unknown", authorFilter: "unknown", fullText: "unsupported", directLookup: "unsupported" },
      metadata: { homepage: "https://example.test" },
    },
    installation: { sourceId: "mock", enabled: true, installedAt: "now", updatedAt: "now", credentialSlot: null },
    createAdapter: () => ({ source: "mock", search }),
  });
  return registry;
}

describe("searchAcademicIteratively", () => {
  it("observes each round and stops once evidence is sufficient", async () => {
    let call = 0;
    const search = vi.fn<LiteratureAdapter["search"]>((query) => {
      call += 1;
      const papers = call === 1 ? [paper("a")] : [paper("b"), paper("c")];
      return Promise.resolve({ papers, nextCursor: null, record: {
        id: `${call}`, source: "mock", query, cacheKey: `${call}`, status: "completed", startedAt: "a", endedAt: "b", resultCount: papers.length, totalAvailable: papers.length, pagesFetched: 1,
        diagnostic: { endpoint: "https://example.test", httpStatus: 200, rateLimitRemaining: null, rateLimitResetSeconds: null, requestCostUsd: null, errorCode: null },
      } });
    });
    const onRound = vi.fn();
    const output = await searchAcademicIteratively({
      requests: [request("q1"), request("q2"), request("q3")], registry: createRegistry(search), effectiveProfile: null,
      signal: new AbortController().signal, sufficientCandidates: 3, onRound,
    });
    expect(search).toHaveBeenCalledTimes(2);
    expect(output.papers).toHaveLength(3);
    expect(output.rounds.map((round) => round.query)).toEqual(["q1", "q2"]);
    expect(onRound).toHaveBeenCalledTimes(2);
  });

  it("never exceeds three rounds or the candidate budget", async () => {
    let call = 0;
    const search: LiteratureAdapter["search"] = (query) => {
      call += 1;
      const papers = [paper(`p${call}`)];
      return Promise.resolve({ papers, nextCursor: null, record: {
        id: `${call}`, source: "mock", query, cacheKey: `${call}`, status: "completed", startedAt: "a", endedAt: "b", resultCount: 1, totalAvailable: 1, pagesFetched: 1,
        diagnostic: { endpoint: "https://example.test", httpStatus: 200, rateLimitRemaining: null, rateLimitResetSeconds: null, requestCostUsd: null, errorCode: null },
      } });
    };
    const output = await searchAcademicIteratively({
      requests: [request("q1"), request("q2"), request("q3")], registry: createRegistry(search), effectiveProfile: null,
      signal: new AbortController().signal, sufficientCandidates: 6,
    });
    expect(output.rounds).toHaveLength(3);
    expect(output.papers.length).toBeLessThanOrEqual(6);
  });
});
