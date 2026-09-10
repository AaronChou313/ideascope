import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { Branch, WorkspaceExport } from "../../contracts/domain";
import workspaceJson from "../../examples/workspace.demo.json";
import { planCompaction } from "../../src/domain/graph/compaction";
import { DirectionService } from "../../src/infrastructure/storage/direction-service";
import { GraphPatchRepository } from "../../src/infrastructure/storage/graph-patch-repository";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";

const workspace = workspaceJson as WorkspaceExport;
const original = workspace.workspace.branches[0]!;
const databases: IdeaScopeDatabase[] = [];
function database() { const db = new IdeaScopeDatabase(`direction-${crypto.randomUUID()}`); databases.push(db); return db; }
afterEach(async () => Promise.all(databases.splice(0).map((db) => db.delete())));

describe("compaction and directions", () => {
  it("limits visibility to 30 without deleting graph data and only suggests merges", () => {
    const branch: Branch = structuredClone(original);
    for (let index = branch.graph.nodes.length; index < 35; index += 1) branch.graph.nodes.push({ id: `extra-${index}`, kind: "concept", title: index === 34 ? "重复概念" : `概念 ${index}`, summary: "保留数据", claimIds: [], aliases: index === 33 ? ["重复概念"] : [], locked: false, archived: false, mergedInto: null });
    const plan = planCompaction(branch);
    expect(plan.visibleIds).toHaveLength(30);
    expect(plan.collapsedIds).toHaveLength(5);
    expect(branch.graph.nodes).toHaveLength(35);
    expect(plan.mergeSuggestions).toContainEqual(expect.objectContaining({ sourceId: "extra-34", targetId: "extra-33" }));
  });
  it("persists a user direction decision with checkpoint and revision", async () => {
    const db = database();
    const branches = new GraphPatchRepository(db);
    await branches.seedBranch("workspace-demo", original);
    const id = original.directions[0]!.id;
    await new DirectionService(db).setStatus("workspace-demo", original.id, id, "excluded");
    expect((await branches.getBranch("workspace-demo", original.id))?.directions[0]).toMatchObject({ status: "excluded", userEdited: true });
    expect((await branches.getBranch("workspace-demo", original.id))?.revision).toBe(1);
    expect(await db.checkpoints.count()).toBe(1);
  });
});
