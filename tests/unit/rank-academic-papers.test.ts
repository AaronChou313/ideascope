import { describe, expect, it } from "vitest";
import type { Paper } from "../../contracts/domain";
import { rankAcademicPapers } from "../../src/application/literature/rank-academic-papers";
import type { EffectiveResearchProfile } from "../../src/domain/research-profile/research-profile";

const request = {
  requestVersion: 1 as const, userQuestion: "robot localization", query: "robot localization lidar",
  intent: "landscape" as const, budget: { maxSources: 4, maxQueries: 2, maxCandidates: 10 },
};
const makePaper = (id: string, changes: Partial<Paper> = {}): Paper => ({
  id, externalIds: {}, title: id, authors: [], year: 2020, venue: null,
  url: "https://example.test", abstract: null, source: "openalex",
  fetchedAt: "2026-01-01T00:00:00.000Z", relatedVersionIds: [], ...changes,
});
const profile: EffectiveResearchProfile = {
  scope: { domains: [], subfields: [], concepts: [] }, sourcePreferences: [],
  venueGroups: [{ id: "robotics", name: "Robotics", venues: [{ name: "ICRA", aliases: ["IEEE International Conference on Robotics and Automation"] }] }],
  queryVocabulary: [], arxivCategories: [], languagePreferences: [],
  provenance: { baseProfileIds: [], sessionProfileId: null, contextTerms: [] },
};

describe("rankAcademicPapers", () => {
  it("puts text relevance first and emits explainable reasons", () => {
    const ranked = rankAcademicPapers([
      makePaper("unrelated", { title: "Marine ecology", venue: "ICRA", citationCount: 10_000 }),
      makePaper("relevant", { title: "Lidar robot localization", abstract: "robot localization with lidar" }),
    ], [request], profile, 2026);
    expect(ranked[0]!.id).toBe("relevant");
    expect(ranked[0]!.selectionReasons).toEqual(expect.arrayContaining(["与当前问题高度相关", "摘要可用"]));
    expect(ranked[1]!.selectionReasons).toEqual(expect.arrayContaining(["匹配研究领域 Venue：ICRA", "具有引用记录（仅作辅助信号）"]));
  });

  it("only gives recency a meaningful boost for recent intent", () => {
    const old = makePaper("old", { title: "robot localization", year: 2018 });
    const recent = makePaper("recent", { title: "robot localization", year: 2026 });
    const ranked = rankAcademicPapers([old, recent], [{ ...request, intent: "recent" }], null, 2026);
    expect(ranked[0]!.id).toBe("recent");
    expect(ranked[0]!.selectionReasons).toContain("近期工作");
    expect(rankAcademicPapers([old], [request], null, 2026)[0]!.selectionReasons).not.toContain("近期工作");
  });

  it("uses a capped citation signal and marks source-diversity selections", () => {
    const ranked = rankAcademicPapers([
      makePaper("a", { title: "robot localization alpha", citationCount: 1, source: "openalex" }),
      makePaper("b", { title: "robot localization beta", citationCount: 1_000_000, source: "openalex" }),
      makePaper("c", { title: "robot localization gamma", source: "crossref" }),
    ], [request], null, 2026);
    expect(ranked.every((paper) => (paper.selectionReasons?.length ?? 0) > 0)).toBe(true);
    expect(ranked.find((paper) => paper.source === "crossref")!.selectionReasons).toContain("补充来源多样性");
  });
});
