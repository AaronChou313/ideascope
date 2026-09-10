import type { Branch, GraphPatch } from "../../../contracts/domain";
import { applyGraphPatch } from "../../domain/graph/apply-graph-patch";
import { IdeaScopeDatabase, ideaScopeDatabase, type PatchReceipt, type RunSummary } from "./ideascope-database";

export interface PatchCommit { branch: Branch; receipt: PatchReceipt; summary: RunSummary; replayed: boolean }

export class GraphPatchRepository {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}
  static branchKey(workspaceId: string, branchId: string) { return `${workspaceId}:${branchId}`; }
  async seedBranch(workspaceId: string, branch: Branch) {
    await this.db.branches.put({ key: GraphPatchRepository.branchKey(workspaceId, branch.id), workspaceId, branch: structuredClone(branch) });
  }
  async getBranch(workspaceId: string, branchId: string) {
    return (await this.db.branches.get(GraphPatchRepository.branchKey(workspaceId, branchId)))?.branch;
  }
  async apply(patch: GraphPatch): Promise<PatchCommit> {
    return this.db.transaction("rw", this.db.branches, this.db.evidence, this.db.checkpoints, this.db.patchReceipts, this.db.runSummaries, async () => {
      const replay = await this.db.patchReceipts.get(patch.patchId);
      if (replay) {
        if (replay.workspaceId !== patch.workspaceId || replay.branchId !== patch.branchId || replay.runId !== patch.runId) throw new Error("补丁 ID 已被其他运行使用。");
        const stored = await this.getBranch(patch.workspaceId, patch.branchId);
        const summary = await this.db.runSummaries.get(replay.runId);
        if (!stored || !summary) throw new Error("补丁回执不完整。");
        return { branch: stored, receipt: replay, summary, replayed: true };
      }
      const key = GraphPatchRepository.branchKey(patch.workspaceId, patch.branchId);
      const stored = await this.db.branches.get(key);
      if (!stored) throw new Error("目标分支不存在。");
      const evidenceIds = new Set((await this.db.evidence.toCollection().primaryKeys()).map(String));
      const branch = applyGraphPatch(patch, { workspaceId: patch.workspaceId, branch: stored.branch, evidenceIds });
      const now = new Date().toISOString();
      const receipt: PatchReceipt = { patchId: patch.patchId, workspaceId: patch.workspaceId, branchId: patch.branchId, runId: patch.runId, baseRevision: patch.baseRevision, committedRevision: branch.revision, committedAt: now, patch: structuredClone(patch) };
      const summary: RunSummary = { runId: patch.runId, workspaceId: patch.workspaceId, branchId: patch.branchId, status: "completed", patchId: patch.patchId, operationCount: patch.operations.length, baseRevision: patch.baseRevision, committedRevision: branch.revision, summary: patch.summary, endedAt: now };
      await this.db.checkpoints.add({ id: `${patch.patchId}:before`, workspaceId: patch.workspaceId, branchId: patch.branchId, revision: stored.branch.revision, createdAt: now, reason: `应用 ${patch.patchId} 前`, branch: structuredClone(stored.branch) });
      await this.db.branches.put({ ...stored, branch });
      await this.db.patchReceipts.add(receipt);
      await this.db.runSummaries.put(summary);
      return { branch, receipt, summary, replayed: false };
    });
  }
}
