import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import schema from "../../contracts/workspace-bundle-manifest.schema.json";
import { workspaceBundleManifestSchema } from "../../src/domain/archive/workspace-bundle";

const manifest = { documentType: "ideascope.bundle", bundleVersion: 1, createdWith: "0.6.11", exportedAt: "2026-09-11T00:00:00.000Z", workspaces: [{ workspaceId: "w1", title: "Workspace", path: "workspaces/w1.ideascope.json", sha256: "a".repeat(64) }] };
describe("workspace Bundle manifest", () => {
  it("keeps JSON Schema and Zod aligned", () => {
    const ajv = new Ajv2020({ strict: false });
    const validate = ajv.compile(schema);
    expect(validate(manifest), JSON.stringify(validate.errors)).toBe(true);
    expect(workspaceBundleManifestSchema.safeParse(manifest).success).toBe(true);
    expect(validate({ ...manifest, workspaces: [{ ...manifest.workspaces[0], path: "../escape" }] })).toBe(false);
  });
});
