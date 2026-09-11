import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import requestJsonSchema from "../../contracts/academic-search-request.schema.json";
import { academicSearchRequestSchema, inferSearchIntent } from "../../src/domain/search/academic-search";
import { mergeResearchProfiles } from "../../src/domain/research-profile/research-profile";
import { getBuiltInResearchProfile } from "../../src/domain/research-profile/builtin-profiles";
import { createBuiltInSourceRegistry } from "../../src/infrastructure/literature/builtin-source-registry";
import { routeAcademicSearch } from "../../src/application/literature/route-academic-search";

const request = {
  requestVersion: 1 as const,
  userQuestion: "近期机器人定位有哪些代表工作？",
  query: "recent robot localization",
  intent: "recent" as const,
  budget: { maxSources: 3, maxQueries: 2, maxCandidates: 30 },
};

describe("academic search request and routing", () => {
  it("keeps JSON Schema and Zod validation aligned", () => {
    const validate = new Ajv2020({ strict: false }).compile(requestJsonSchema);
    expect(validate(request)).toBe(true);
    expect(academicSearchRequestSchema.safeParse(request).success).toBe(true);
    expect(validate({ ...request, intent: "magic", secret: "no" })).toBe(false);
    expect(academicSearchRequestSchema.safeParse({ ...request, budget: { ...request.budget, maxSources: 0 } }).success).toBe(false);
  });

  it("infers controlled intents without exposing prompt reasoning", () => {
    expect(inferSearchIntent("看看最新研究", false)).toBe("recent");
    expect(inferSearchIntent("有哪些反证？", true)).toBe("counterevidence");
    expect(inferSearchIntent("继续这个节点", true)).toBe("representative");
    expect(inferSearchIntent("给我整体路线", false)).toBe("landscape");
  });

  it("routes enabled capable sources using Effective Profile preference and budget", () => {
    const robotics = getBuiltInResearchProfile("builtin.robotics")!;
    const effective = mergeResearchProfiles([robotics], null);
    const routed = routeAcademicSearch(request, createBuiltInSourceRegistry({ disabledSourceIds: ["arxiv"] }), effective);
    expect(routed.sources).toHaveLength(3);
    expect(routed.sources[0]?.sourceId).toBe("openalex");
    expect(routed.sources.map((source) => source.sourceId)).not.toContain("arxiv");
    expect(routed.sources[0]?.reasons).toContain("符合当前研究领域来源偏好");
  });

  it("does not call sources that explicitly lack the requested capability", () => {
    const routed = routeAcademicSearch(
      { ...request, intent: "direct_lookup" },
      createBuiltInSourceRegistry(),
      null,
    );
    expect(routed.sources).toEqual([]);
  });
});
