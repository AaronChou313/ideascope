import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceExport } from "../../contracts/domain";
import workspaceJson from "../../examples/workspace.demo.json";
import { migrateWorkspaceExport } from "../../src/domain/workspace/migrate-workspace";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { WorkspaceRepository } from "../../src/infrastructure/storage/workspace-repository";
import { WriterLeaseService } from "../../src/infrastructure/storage/writer-lease";

const workspace = workspaceJson as WorkspaceExport;
const databases: IdeaScopeDatabase[] = [];
function database() { const db = new IdeaScopeDatabase(`workspace-${crypto.randomUUID()}`); databases.push(db); return db; }
afterEach(async () => Promise.all(databases.splice(0).map((db) => db.delete())));

describe("workspace persistence and migration", () => {
  it("round-trips committed workspace semantics after a new repository instance", async () => {
    const db = database();
    expect((await new WorkspaceRepository(db).save(workspace)).status).toBe("saved");
    const restored = await new WorkspaceRepository(db).get(workspace.workspace.id);
    expect(restored?.workspace).toEqual(workspace.workspace);
    expect(restored?.formatVersion).toBe(1);
  });
  it("migrates version 0 and explicitly rejects future versions", () => {
    expect(migrateWorkspaceExport({ ...workspace, formatVersion: 0 }).formatVersion).toBe(1);
    expect(() => migrateWorkspaceExport({ ...workspace, formatVersion: 99 })).toThrow(/未来版本/);
  });
  it("reports quota exhaustion instead of claiming save success", async () => {
    const db = database();
    vi.spyOn(db, "transaction").mockRejectedValueOnce(new DOMException("full", "QuotaExceededError"));
    await expect(new WorkspaceRepository(db).save(workspace)).resolves.toMatchObject({ status: "quota_exceeded" });
  });
  it("renames, archives and requires exact confirmation before deletion", async () => {
    const db = database();
    const repository = new WorkspaceRepository(db);
    await repository.save(workspace);
    await repository.rename(workspace.workspace.id, "新名称");
    await expect(repository.delete(workspace.workspace.id, "wrong")).rejects.toThrow(/确认名称/);
    await repository.archive(workspace.workspace.id);
    const archived = (await repository.list())[0];
    expect(archived?.title).toBe("新名称");
    expect(typeof archived?.archivedAt).toBe("string");
    await repository.delete(workspace.workspace.id, "新名称");
    expect(await repository.get(workspace.workspace.id)).toBeUndefined();
  });
});

describe("single-writer lease", () => {
  it("excludes another tab until expiration and allows renewal by the owner", async () => {
    let now = 1_000;
    const lease = new WriterLeaseService(database(), () => now);
    expect(await lease.acquire("ws", "tab-a", 100)).toBe(true);
    expect(await lease.acquire("ws", "tab-b", 100)).toBe(false);
    expect(await lease.renew("ws", "tab-a", 200)).toBe(true);
    now = 1_301;
    expect(await lease.acquire("ws", "tab-b", 100)).toBe(true);
  });
});
