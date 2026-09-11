import { describe, expect, it } from "vitest";
import { BUILTIN_RESEARCH_PROFILES, getBuiltInResearchProfile } from "../../src/domain/research-profile/builtin-profiles";
import { researchProfileSchema } from "../../src/domain/research-profile/research-profile";

describe("built-in research profiles", () => {
  it("ships four valid, lightweight templates", () => {
    expect(BUILTIN_RESEARCH_PROFILES.map((profile) => profile.name)).toEqual([
      "General Research", "Robotics", "Localization & Navigation", "Geomatics / Surveying",
    ]);
    for (const profile of BUILTIN_RESEARCH_PROFILES) {
      expect(researchProfileSchema.safeParse(profile).success).toBe(true);
      expect(profile.provenance).toBe("builtin");
      expect(profile.scope.concepts.length).toBeLessThanOrEqual(3);
    }
  });

  it("resolves templates by stable ID without implying an Auto selection", () => {
    expect(getBuiltInResearchProfile("builtin.robotics")?.scope.domains).toContain("Robotics");
    expect(getBuiltInResearchProfile("auto")).toBeNull();
  });
});
