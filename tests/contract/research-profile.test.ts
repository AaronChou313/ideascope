import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import profileJsonSchema from "../../contracts/research-profile.schema.json";
import patchJsonSchema from "../../contracts/session-profile-patch.schema.json";
import {
  applySessionProfilePatch,
  createEmptySessionProfile,
  mergeResearchProfiles,
  researchProfileSchema,
  sessionProfilePatchSchema,
  type ResearchProfile,
} from "../../src/domain/research-profile/research-profile";

const now = "2026-09-11T00:00:00.000Z";
const base: ResearchProfile = {
  documentType: "ideascope.research-profile", profileVersion: 1,
  id: "robotics", name: "Robotics", mode: "base", description: "Robotics research",
  scope: { domains: ["Robotics"], subfields: ["Localization"], concepts: ["SLAM"] },
  sourcePreferences: [{ sourceId: "openalex", priority: 80 }],
  venueGroups: [{ id: "robotics", name: "Robotics", venues: [{ name: "ICRA", aliases: [] }] }],
  queryVocabulary: [{ term: "localization", aliases: ["state estimation"] }],
  arxivCategories: ["cs.RO"], languagePreferences: ["en"], provenance: "builtin", updatedAt: now,
};

describe("research profile contracts", () => {
  const ajv = new Ajv2020({ strict: false });
  const validateProfile = ajv.compile(profileJsonSchema);
  const validatePatch = ajv.compile(patchJsonSchema);

  it("accepts the same valid profile and patch in JSON Schema and Zod", () => {
    const patch = { patchVersion: 1, targetProfileId: "session:w1", operations: [
      { op: "addConcept", value: "contact-aided estimation" },
      { op: "addQueryAlias", value: { term: "foot contact", alias: "contact constraint" } },
    ] };
    expect(validateProfile(base)).toBe(true);
    expect(researchProfileSchema.safeParse(base).success).toBe(true);
    expect(validatePatch(patch)).toBe(true);
    expect(sessionProfilePatchSchema.safeParse(patch).success).toBe(true);
  });

  it("rejects unknown fields, invalid priorities and malformed patch values", () => {
    expect(validateProfile({ ...base, apiKey: "forbidden" })).toBe(false);
    expect(researchProfileSchema.safeParse({ ...base, sourcePreferences: [{ sourceId: "openalex", priority: 101 }] }).success).toBe(false);
    expect(validatePatch({ patchVersion: 1, targetProfileId: "x", operations: [{ op: "addConcept", value: { bad: true } }] })).toBe(false);
  });

  it("applies Session patches without permitting Base mutation", () => {
    const session = createEmptySessionProfile("w1", now);
    const updated = applySessionProfilePatch(session, {
      patchVersion: 1, targetProfileId: session.id,
      operations: [
        { op: "addDomainSignal", value: "Robotics" },
        { op: "addSourceHint", value: { sourceId: "arxiv", priority: 70, purposes: ["recent"] } },
      ],
    });
    expect(updated.scope.domains).toEqual(["Robotics"]);
    expect(updated.sourcePreferences[0]).toMatchObject({ sourceId: "arxiv", priority: 70 });
    expect(() => applySessionProfilePatch(base, { patchVersion: 1, targetProfileId: base.id, operations: [] })).toThrow(/Base Profile/);
    expect(base.scope.domains).toEqual(["Robotics"]);
  });

  it("merges Base, Session and node context without writing back to Base", () => {
    const session = { ...createEmptySessionProfile("w1", now), scope: {
      domains: ["Robotics"], subfields: ["Legged Robotics"], concepts: ["Foot sensing"],
    } };
    const effective = mergeResearchProfiles([base], session, ["Slip detection"]);
    expect(effective.scope.domains).toEqual(["Robotics"]);
    expect(effective.scope.concepts).toEqual(["SLAM", "Foot sensing", "Slip detection"]);
    expect(effective.provenance).toEqual({ baseProfileIds: ["robotics"], sessionProfileId: "session:w1", contextTerms: ["Slip detection"] });
    expect(base.scope.concepts).toEqual(["SLAM"]);
  });
});
