import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { GraphPatch, WorkspaceExport } from "../../contracts/domain";
import demoPatchJson from "../../examples/patch.demo.json";
import workspaceJson from "../../examples/workspace.demo.json";
import { applyGraphPatch } from "../../src/domain/graph/apply-graph-patch";
import { GraphPatchRepository } from "../../src/infrastructure/storage/graph-patch-repository";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";

const workspace = workspaceJson as WorkspaceExport;
const branch = workspace.workspace.branches[0]!;
const demoPatch = demoPatchJson as GraphPatch;
const demoEvidenceIds = new Set(workspace.workspace.evidence.map(({ id }) => id));
const databases: IdeaScopeDatabase[] = [];
function database() {
  const db = new IdeaScopeDatabase(`patch-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}
afterEach(async () => Promise.all(databases.splice(0).map((db) => db.delete())));

describe("GraphPatch reducer", () => {
  it("applies an evidence-free research question without mutating the source", () => {
    const next = applyGraphPatch(demoPatch, { workspaceId: "workspace-demo", branch, evidenceIds: demoEvidenceIds });
    expect(next.revision).toBe(1);
    expect(next.graph.nodes.some(({ id }) => id === "q-evidence-criteria")).toBe(true);
    expect(branch.revision).toBe(0);
  });
  it("rejects a whole patch when one operation is illegal", () => {
    const patch: GraphPatch = { ...demoPatch, operations: [...demoPatch.operations, { op: "ADD_EDGE", edge: { id: "bad", source: "missing", target: "q-evidence-criteria", relation: "related_to", label: "bad", claimIds: [] } }] };
    expect(() => applyGraphPatch(patch, { workspaceId: "workspace-demo", branch, evidenceIds: demoEvidenceIds })).toThrow(/端点不存在/);
    expect(branch.graph.claims.some(({ id }) => id === "claim-new")).toBe(false);
  });
  it("cannot manufacture sourced claims or edit locked nodes", () => {
    const sourced: GraphPatch = { ...demoPatch, operations: [{ op: "ADD_CLAIM", claim: { id: "fake", text: "确定结论", epistemicStatus: "sourced", evidenceLinks: [{ evidenceId: "invented-paper", stance: "supports" }], qualifiers: [], verification: "unreviewed" } }] };
    expect(() => applyGraphPatch(sourced, { workspaceId: "workspace-demo", branch, evidenceIds: demoEvidenceIds })).toThrow(/不存在的证据/);
    const locked = structuredClone(branch);
    locked.graph.nodes[0]!.locked = true;
    expect(() => applyGraphPatch({ ...demoPatch, operations: [{ op: "UPDATE_NODE", nodeId: locked.graph.nodes[0]!.id, changes: { title: "改写" } }] }, { workspaceId: "workspace-demo", branch: locked, evidenceIds: demoEvidenceIds })).toThrow(/已锁定/);
  });
  it("rejects stale revisions", () => {
    expect(() => applyGraphPatch({ ...demoPatch, baseRevision: 9 }, { workspaceId: "workspace-demo", branch, evidenceIds: demoEvidenceIds })).toThrow(/revision/);
  });
});

describe("GraphPatchRepository transaction", () => {
  it("commits branch, checkpoint, receipt and summary atomically and replays idempotently", async () => {
    const db = database();
    const repository = new GraphPatchRepository(db);
    await repository.seedBranch("workspace-demo", branch);
    await db.evidence.bulkAdd(workspace.workspace.evidence);
    const first = await repository.apply(demoPatch);
    expect(first.replayed).toBe(false);
    expect(first.branch.revision).toBe(1);
    expect(await db.checkpoints.count()).toBe(1);
    expect(await db.runSummaries.count()).toBe(1);
    const replay = await repository.apply(demoPatch);
    expect(replay.replayed).toBe(true);
    expect(replay.branch.revision).toBe(1);
    expect(await db.checkpoints.count()).toBe(1);
  });
  it("writes nothing when any operation fails", async () => {
    const db = database();
    const repository = new GraphPatchRepository(db);
    await repository.seedBranch("workspace-demo", branch);
    await db.evidence.bulkAdd(workspace.workspace.evidence);
    const invalid: GraphPatch = { ...demoPatch, patchId: "invalid", runId: "invalid-run", operations: [...demoPatch.operations, { op: "UPDATE_NODE", nodeId: "missing", changes: { title: "bad" } }] };
    await expect(repository.apply(invalid)).rejects.toThrow(/不存在/);
    expect((await repository.getBranch("workspace-demo", "branch-main"))?.revision).toBe(0);
    expect(await db.checkpoints.count()).toBe(0);
    expect(await db.patchReceipts.count()).toBe(0);
    expect(await db.runSummaries.count()).toBe(0);
  });
});
