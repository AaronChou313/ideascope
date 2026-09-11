// @vitest-environment node
import "fake-indexeddb/auto";
import { strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { WorkspaceBundleService } from "../../src/application/archive/workspace-bundle-service";
import { inspectZipEntries } from "../../src/application/archive/workspace-bundle-service";
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

  it("validates manifest resources during the dry run", async () => {
    const db = new IdeaScopeDatabase(`bundle-resource-${crypto.randomUUID()}`);
    const workspace = createEmptyWorkspace("bundle-resource");
    await new WorkspaceRepository(db).save(workspace);
    const service = new WorkspaceBundleService(db);
    const bundle = await service.create([workspace.workspace.id]);
    const files = unzipSync(bundle.bytes);
    const sourcePath = bundle.manifest.resources?.sources?.[0];
    if (!sourcePath) throw new Error("expected a bundled source resource");
    files[sourcePath] = strToU8(JSON.stringify({ id: 42 }));
    await expect(service.preview(zipSync(files))).rejects.toThrow();
    await db.delete();
  });

  it("rejects traversal paths before expansion", () => {
    const bytes = zipSync({ "../escape.json": strToU8("{}") });
    expect(() => inspectZipEntries(bytes)).toThrow("不安全路径");
  });

  it("imports selected workspaces atomically and rolls back the batch on write failure", async () => {
    const db = new IdeaScopeDatabase(`bundle-atomic-${crypto.randomUUID()}`);
    const repository = new WorkspaceRepository(db);
    const first = createEmptyWorkspace("atomic-a"); first.workspace.title = "A";
    const second = createEmptyWorkspace("atomic-b"); second.workspace.title = "B";
    await repository.save(first); await repository.save(second);
    const service = new WorkspaceBundleService(db);
    const bundle = await service.create(["atomic-a", "atomic-b"], false);
    await db.workspaces.clear(); await db.branches.clear(); await db.messages.clear();
    db.workspaces.hook("creating", (_key, value) => { if (value.title.startsWith("B")) throw new Error("simulated write failure"); });
    await expect(service.importSelected(bundle.bytes)).rejects.toThrow("simulated write failure");
    expect(await db.workspaces.count()).toBe(0);
    await db.delete();
  });

  it("rejects selected paths that were not part of the validated manifest", async () => {
    const db = new IdeaScopeDatabase(`bundle-selection-${crypto.randomUUID()}`);
    const workspace = createEmptyWorkspace("bundle-selection");
    await new WorkspaceRepository(db).save(workspace);
    const service = new WorkspaceBundleService(db);
    const bundle = await service.create([workspace.workspace.id], false);
    await expect(service.importSelected(bundle.bytes, ["workspaces/not-in-manifest.json"])).rejects.toThrow("未经校验");
    await db.delete();
  });
});
