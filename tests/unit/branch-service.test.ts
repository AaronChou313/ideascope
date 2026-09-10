import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { GraphPatch, WorkspaceExport } from "../../contracts/domain";
import patchJson from "../../examples/patch.demo.json";
import workspaceJson from "../../examples/workspace.demo.json";
import { BranchService } from "../../src/infrastructure/storage/branch-service";
import { GraphPatchRepository } from "../../src/infrastructure/storage/graph-patch-repository";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { RunExecutionStore } from "../../src/infrastructure/storage/run-execution-store";

const workspace = workspaceJson as WorkspaceExport;
const source = workspace.workspace.branches[0]!;
const databases: IdeaScopeDatabase[] = [];
function database() { const db = new IdeaScopeDatabase(`branch-${crypto.randomUUID()}`); databases.push(db); return db; }
afterEach(async () => Promise.all(databases.splice(0).map((db) => db.delete())));

describe("BranchService", () => {
  it("forks an isolated snapshot and routes messages by branch", async () => {
    const db = database();
    const patches = new GraphPatchRepository(db);
    const service = new BranchService(db);
    await patches.seedBranch("workspace-demo", source);
    const fork = await service.fork("workspace-demo", source.id, { id: "branch-b", title: "路线 B" });
    expect(fork).toMatchObject({ parentBranchId: source.id, forkedFromRevision: source.revision, revision: 0 });
    fork.graph.nodes[0]!.title = "本地临时修改";
    expect((await patches.getBranch("workspace-demo", source.id))!.graph.nodes[0]!.title).not.toBe("本地临时修改");
    await service.appendMessage("workspace-demo", { id: "m-b", branchId: "branch-b", role: "user", text: "只属于 B", evidenceIds: [], createdAt: "2026-09-11T00:00:00Z", isDemo: false });
    expect(await service.messages("workspace-demo", source.id)).toHaveLength(0);
    expect(await service.messages("workspace-demo", "branch-b")).toHaveLength(1);
  });
  it("blocks forks during a run and rejects a late patch for another branch", async () => {
    const db = database();
    const patches = new GraphPatchRepository(db);
    const service = new BranchService(db);
    await patches.seedBranch("workspace-demo", source);
    await new RunExecutionStore(db).start({ id: "active", workspaceId: "workspace-demo", branchId: source.id, baseRevision: 0 });
    await expect(service.fork("workspace-demo", source.id, { id: "branch-b", title: "B" })).rejects.toThrow(/结束或取消/);
    const late = { ...(patchJson as GraphPatch), branchId: "branch-b" };
    await expect(patches.apply(late)).rejects.toThrow(/目标分支不存在/);
    expect((await patches.getBranch("workspace-demo", source.id))?.revision).toBe(0);
  });
});
