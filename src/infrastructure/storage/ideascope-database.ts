import Dexie, { type EntityTable } from "dexie";
import type { Branch, Evidence, GraphPatch, Paper } from "../../../contracts/domain";
import type { SearchRecord } from "../../domain/search/literature";

export class IdeaScopeDatabase extends Dexie {
  papers!: EntityTable<Paper, "id">;
  evidence!: EntityTable<Evidence, "id">;
  searchRecords!: EntityTable<SearchRecord, "id">;
  branches!: EntityTable<StoredBranch, "key">;
  checkpoints!: EntityTable<GraphCheckpoint, "id">;
  patchReceipts!: EntityTable<PatchReceipt, "patchId">;
  runSummaries!: EntityTable<RunSummary, "runId">;
  constructor(name = "ideascope") {
    super(name);
    this.version(1).stores({
      papers:
        "id,externalIds.doi,externalIds.arxiv,externalIds.openalex,fetchedAt",
      evidence: "id,paperId,level,fetchedAt",
      searchRecords: "id,source,status,endedAt,cacheKey",
    });
    this.version(2).stores({
      papers: "id,externalIds.doi,externalIds.arxiv,externalIds.openalex,fetchedAt",
      evidence: "id,paperId,level,fetchedAt",
      searchRecords: "id,source,status,endedAt,cacheKey",
      branches: "key,workspaceId,branch.id,branch.revision",
      checkpoints: "id,workspaceId,branchId,revision,createdAt",
      patchReceipts: "patchId,workspaceId,branchId,runId,committedAt",
      runSummaries: "runId,workspaceId,branchId,status,endedAt",
    });
  }
}

export interface StoredBranch { key: string; workspaceId: string; branch: Branch }
export interface GraphCheckpoint { id: string; workspaceId: string; branchId: string; revision: number; createdAt: string; reason: string; branch: Branch }
export interface PatchReceipt { patchId: string; workspaceId: string; branchId: string; runId: string; baseRevision: number; committedRevision: number; committedAt: string; patch: GraphPatch }
export interface RunSummary { runId: string; workspaceId: string; branchId: string; status: "completed"; patchId: string; operationCount: number; baseRevision: number; committedRevision: number; summary: string; endedAt: string }

export const ideaScopeDatabase = new IdeaScopeDatabase();
