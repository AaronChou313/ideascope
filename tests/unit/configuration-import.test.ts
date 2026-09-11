import { describe, expect, it } from "vitest";
import { parseConfigurationImport } from "../../src/application/import/parse-configuration-import";
import { BUILTIN_LITERATURE_SOURCE_MANIFESTS } from "../../src/infrastructure/literature/builtin-source-registry";
import { BUILTIN_RESEARCH_PROFILES } from "../../src/domain/research-profile/builtin-profiles";

describe("configuration import", () => {
  it("recognizes Source, Profile and Pack documents", () => {
    expect(parseConfigurationImport(JSON.stringify(BUILTIN_LITERATURE_SOURCE_MANIFESTS[0])).kind).toBe("source");
    expect(parseConfigurationImport(JSON.stringify(BUILTIN_RESEARCH_PROFILES[0])).kind).toBe("profile");
    expect(parseConfigurationImport(JSON.stringify({ documentType: "ideascope.pack", packVersion: 1, id: "p", name: "Pack", description: "", sources: [], profiles: [] }))).toMatchObject({ kind: "pack", name: "Pack" });
  });

  it("rejects unknown, malformed and over-budget input", () => {
    expect(() => parseConfigurationImport("not json")).toThrow("有效 JSON");
    expect(() => parseConfigurationImport(JSON.stringify({ documentType: "other" }))).toThrow("不支持");
    expect(() => parseConfigurationImport(" ".repeat(2_000_001))).toThrow("2 MB");
  });
});
