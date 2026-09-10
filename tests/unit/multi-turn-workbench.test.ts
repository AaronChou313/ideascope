import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { GraphPatch, WorkspaceExport } from "../../contracts/domain";
import patchJson from "../../examples/patch.demo.json";
import workspaceJson from "../../examples/workspace.demo.json";
import { buildAgentContext } from "../../src/agent/context-builder";
import { classifyTurnIntent, intentAllowsGraphPatch } from "../../src/domain/agent/turn-intent";
import { GraphPatchRepository } from "../../src/infrastructure/storage/graph-patch-repository";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";

const workspace = workspaceJson as WorkspaceExport;
const patch = patchJson as GraphPatch;
const branch = workspace.workspace.branches[0]!;
const databases: IdeaScopeDatabase[] = [];
function database() { const db = new IdeaScopeDatabase(`turn-${crypto.randomUUID()}`); databases.push(db); return db; }
afterEach(async () => Promise.all(databases.splice(0).map((db) => db.delete())));

describe("multi-turn intent and focus", () => {
  it("does not authorize a graph patch for an explanation-only turn", () => {
    expect(classifyTurnIntent("解释一下这个节点是什么意思")).toBe("explain");
    expect(intentAllowsGraphPatch("explain")).toBe(false);
    expect(classifyTurnIntent("继续检索相关研究")).toBe("explore");
    expect(intentAllowsGraphPatch("explore")).toBe(true);
  });
  it("includes the selected node and neighborhood in bounded context", () => {
    const serialized = buildAgentContext({ runId: "r", workspaceId: "ws", branchId: "b", baseRevision: 2, promptVersion: "0.1", userGoal: "继续", branchSummary: [], recentMessages: [], availableEvidenceIds: [], focus: { nodeId: "n", title: "焦点", summary: "局部问题", neighborIds: ["near"], claimIds: ["c"] } }, 10_000);
    expect(serialized).toContain('"nodeId":"n"');
    expect(serialized).toContain('"neighborIds":["near"]');
  });
});

describe("patch preview and undo", () => {
  it("previews without writing, commits once, and restores through a new revision", async () => {
    const db = database();
    const repository = new GraphPatchRepository(db);
    await repository.seedBranch("workspace-demo", branch);
    await db.evidence.bulkAdd(workspace.workspace.evidence);
    const preview = await repository.preview(patch);
    expect(preview).toMatchObject({ addedNodes: 1, addedEdges: 1, addedClaims: 1, operationCount: 3 });
    expect((await repository.getBranch("workspace-demo", "branch-main"))?.revision).toBe(0);
    await repository.apply(patch);
    const restored = await repository.undoLast("workspace-demo", "branch-main");
    expect(restored.revision).toBe(2);
    expect(restored.graph.nodes.some(({ id }) => id === "q-evidence-criteria")).toBe(false);
    await expect(repository.undoLast("workspace-demo", "branch-main")).rejects.toThrow(/没有可撤销/);
  });
});
