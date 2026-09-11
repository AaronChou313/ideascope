import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import packSchema from "../../contracts/source-pack.schema.json";
import sourceSchema from "../../contracts/literature-source.schema.json";
import profileSchema from "../../contracts/research-profile.schema.json";
import { sourcePackSchema } from "../../src/domain/import/source-pack";
import { BUILTIN_LITERATURE_SOURCE_MANIFESTS } from "../../src/infrastructure/literature/builtin-source-registry";
import { BUILTIN_RESEARCH_PROFILES } from "../../src/domain/research-profile/builtin-profiles";

const pack = {
  documentType: "ideascope.pack", packVersion: 1, id: "robotics", name: "Robotics", description: "test",
  sources: [BUILTIN_LITERATURE_SOURCE_MANIFESTS[0]], profiles: [BUILTIN_RESEARCH_PROFILES[0]],
};

describe("source pack contract", () => {
  it("validates nested sources and profiles in JSON Schema and Zod", () => {
    const ajv = new Ajv2020({ strict: false });
    ajv.addSchema(sourceSchema); ajv.addSchema(profileSchema);
    const validate = ajv.compile(packSchema);
    expect(validate(pack), JSON.stringify(validate.errors)).toBe(true);
    expect(sourcePackSchema.safeParse(pack).success).toBe(true);
    expect(validate({ ...pack, sources: [{ apiKey: "forbidden" }] })).toBe(false);
  });
});
