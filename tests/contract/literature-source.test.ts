import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import manifestJsonSchema from "../../contracts/literature-source.schema.json";
import {
  literatureSourceManifestSchema,
  parseLiteratureSourceManifest,
} from "../../src/domain/literature-source/literature-source";
import { BUILTIN_LITERATURE_SOURCE_MANIFESTS } from "../../src/infrastructure/literature/builtin-source-registry";

describe("literature source manifest contract", () => {
  const validate = new Ajv2020({ strict: false }).compile(manifestJsonSchema);

  it("accepts every built-in manifest in JSON Schema and Zod", () => {
    for (const manifest of BUILTIN_LITERATURE_SOURCE_MANIFESTS) {
      expect(validate(manifest), JSON.stringify(validate.errors)).toBe(true);
      expect(literatureSourceManifestSchema.safeParse(manifest).success).toBe(true);
    }
  });

  it("rejects invalid IDs, unknown fields and secret-bearing manifests", () => {
    const base = structuredClone(BUILTIN_LITERATURE_SOURCE_MANIFESTS[0]);
    expect(validate({ ...base, id: "OpenAlex" })).toBe(false);
    expect(() => parseLiteratureSourceManifest({ ...base, apiKey: "secret-value" })).toThrow();
    expect(validate({ ...base, apiKey: "secret-value" })).toBe(false);
  });
});
