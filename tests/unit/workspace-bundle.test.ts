// @vitest-environment node
import "fake-indexeddb/auto";
import { strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { WorkspaceBundleService } from "../../src/application/archive/workspace-bundle-service";
import { createEmptyWorkspace } from "../../src/domain/workspace/create-workspace";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { WorkspaceRepository } from "../../src/infrastructure/storage/workspace-repository";

describe("multi-workspace Bundle", () => {
  it("creates a real ZIP with manifest, archives, hashes and optional resources", async () => {
    const db = new IdeaScopeDatabase(`bundle-${crypto.randomUUID()}`);
    const repository = new WorkspaceRepository(db);
    const first = createEmptyWorkspace("bundle-a"); first.workspace.title = "A";
    const second = createEmptyWorkspace("bundle-b"); second.workspace.title = "B";
    await repository.save(first); await repository.save(second);
    const service = new WorkspaceBundleService(db);
    const bundle = await service.create(["bundle-a", "bundle-b"]);
    const files = unzipSync(bundle.bytes);
    expect(files["ideascope-bundle.json"]).toBeDefined();
    expect(Object.keys(files).filter((path) => path.startsWith("workspaces/"))).toHaveLength(2);
    expect(Object.keys(files).some((path) => path.startsWith("resources/sources/"))).toBe(true);
    const preview = await service.preview(bundle.bytes);
    expect(preview.items.map((item) => item.title)).toEqual(["A", "B"]);
    await db.delete();
  });

  it("detects a modified workspace entry", async () => {
    const db = new IdeaScopeDatabase(`bundle-tamper-${crypto.randomUUID()}`);
    const workspace = createEmptyWorkspace("bundle-tamper");
    await new WorkspaceRepository(db).save(workspace);
    const service = new WorkspaceBundleService(db);
    const bundle = await service.create([workspace.workspace.id], false);
    const files = unzipSync(bundle.bytes);
    const path = bundle.manifest.workspaces[0]!.path;
    files[path] = strToU8("{}");
    await expect(service.preview(zipSync(files))).rejects.toThrow("完整性校验失败");
    await db.delete();
  });
});
