import Dexie, { type EntityTable } from "dexie";
import type { Branch, Evidence, GraphPatch, Message, Paper } from "../../../contracts/domain";
import type { SearchRecord } from "../../domain/search/literature";
import type { SavedProviderProfile } from "../../domain/provider/provider-profile";
import type { LiteratureSourceManifest, SourceInstallation } from "../../domain/literature-source/literature-source";
import type { ResearchProfile } from "../../domain/research-profile/research-profile";

export class IdeaScopeDatabase extends Dexie {
  papers!: EntityTable<Paper, "id">;
  evidence!: EntityTable<Evidence, "id">;
  searchRecords!: EntityTable<SearchRecord, "id">;
  branches!: EntityTable<StoredBranch, "key">;
  checkpoints!: EntityTable<GraphCheckpoint, "id">;
  patchReceipts!: EntityTable<PatchReceipt, "patchId">;
  runSummaries!: EntityTable<RunSummary, "runId">;
  runExecutions!: EntityTable<RunExecution, "id">;
  messages!: EntityTable<StoredMessage, "id">;
  workspaces!: EntityTable<WorkspaceRecord, "id">;
  writerLeases!: EntityTable<WriterLease, "workspaceId">;
  providerProfiles!: EntityTable<SavedProviderProfile, "id">;
  sourceInstallations!: EntityTable<SourceInstallation, "sourceId">;
  sourceManifests!: EntityTable<LiteratureSourceManifest, "id">;
  researchProfiles!: EntityTable<ResearchProfile, "id">;
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
    this.version(3).stores({
      papers: "id,externalIds.doi,externalIds.arxiv,externalIds.openalex,fetchedAt",
      evidence: "id,paperId,level,fetchedAt",
      searchRecords: "id,source,status,endedAt,cacheKey",
      branches: "key,workspaceId,branch.id,branch.revision",
      checkpoints: "id,workspaceId,branchId,revision,createdAt",
      patchReceipts: "patchId,workspaceId,branchId,runId,committedAt",
      runSummaries: "runId,workspaceId,branchId,status,endedAt",
      runExecutions: "id,workspaceId,branchId,status,startedAt,endedAt",
    });
    this.version(4).stores({
      papers: "id,externalIds.doi,externalIds.arxiv,externalIds.openalex,fetchedAt",
      evidence: "id,paperId,level,fetchedAt",
      searchRecords: "id,source,status,endedAt,cacheKey",
      branches: "key,workspaceId,branch.id,branch.revision",
      checkpoints: "id,workspaceId,branchId,revision,createdAt",
      patchReceipts: "patchId,workspaceId,branchId,runId,committedAt",
      runSummaries: "runId,workspaceId,branchId,status,endedAt",
      runExecutions: "id,workspaceId,branchId,status,startedAt,endedAt",
      messages: "id,branchId,createdAt",
    });
    this.version(5).stores({
      papers: "id,externalIds.doi,externalIds.arxiv,externalIds.openalex,fetchedAt",
      evidence: "id,paperId,level,fetchedAt",
      searchRecords: "id,source,status,endedAt,cacheKey",
      branches: "key,workspaceId,branch.id,branch.revision",
      checkpoints: "id,workspaceId,branchId,revision,createdAt",
      patchReceipts: "patchId,workspaceId,branchId,runId,committedAt",
      runSummaries: "runId,workspaceId,branchId,status,endedAt",
      runExecutions: "id,workspaceId,branchId,status,startedAt,endedAt",
      messages: "id,branchId,createdAt",
      workspaces: "id,title,updatedAt,archivedAt",
      writerLeases: "workspaceId,ownerId,expiresAt",
    });
    this.version(6).stores({
      papers: "id,externalIds.doi,externalIds.arxiv,externalIds.openalex,fetchedAt",
      evidence: "id,paperId,level,fetchedAt",
      searchRecords: "id,source,status,endedAt,cacheKey",
      branches: "key,workspaceId,branch.id,branch.revision",
      checkpoints: "id,workspaceId,branchId,revision,createdAt",
      patchReceipts: "patchId,workspaceId,branchId,runId,committedAt",
      runSummaries: "runId,workspaceId,branchId,status,endedAt",
      runExecutions: "id,workspaceId,branchId,status,startedAt,endedAt",
      messages: "id,branchId,createdAt",
      workspaces: "id,title,updatedAt,archivedAt",
      writerLeases: "workspaceId,ownerId,expiresAt",
      providerProfiles: "id,updatedAt",
    });
    this.version(7).stores({
      papers: "id,externalIds.doi,externalIds.arxiv,externalIds.openalex,fetchedAt",
      evidence: "id,paperId,level,fetchedAt",
      searchRecords: "id,source,status,endedAt,cacheKey",
      branches: "key,workspaceId,branch.id,branch.revision",
      checkpoints: "id,workspaceId,branchId,revision,createdAt",
      patchReceipts: "patchId,workspaceId,branchId,runId,committedAt",
      runSummaries: "runId,workspaceId,branchId,status,endedAt",
      runExecutions: "id,workspaceId,branchId,status,startedAt,endedAt",
      messages: "id,branchId,createdAt",
      workspaces: "id,title,updatedAt,archivedAt",
      writerLeases: "workspaceId,ownerId,expiresAt",
      providerProfiles: "id,updatedAt",
      sourceInstallations: "sourceId,enabled,updatedAt",
    });
    this.version(8).stores({
      papers: "id,externalIds.doi,externalIds.arxiv,externalIds.openalex,fetchedAt",
      evidence: "id,paperId,level,fetchedAt",
      searchRecords: "id,source,status,endedAt,cacheKey",
      branches: "key,workspaceId,branch.id,branch.revision",
      checkpoints: "id,workspaceId,branchId,revision,createdAt",
      patchReceipts: "patchId,workspaceId,branchId,runId,committedAt",
      runSummaries: "runId,workspaceId,branchId,status,endedAt",
      runExecutions: "id,workspaceId,branchId,status,startedAt,endedAt",
      messages: "id,branchId,createdAt",
      workspaces: "id,title,updatedAt,archivedAt",
      writerLeases: "workspaceId,ownerId,expiresAt",
      providerProfiles: "id,updatedAt",
      sourceInstallations: "sourceId,enabled,updatedAt",
      researchProfiles: "id,mode,updatedAt",
    });
    this.version(9).stores({
      papers: "id,externalIds.doi,externalIds.arxiv,externalIds.openalex,fetchedAt",
      evidence: "id,paperId,level,fetchedAt",
      searchRecords: "id,source,status,endedAt,cacheKey",
      branches: "key,workspaceId,branch.id,branch.revision",
      checkpoints: "id,workspaceId,branchId,revision,createdAt",
      patchReceipts: "patchId,workspaceId,branchId,runId,committedAt",
      runSummaries: "runId,workspaceId,branchId,status,endedAt",
      runExecutions: "id,workspaceId,branchId,status,startedAt,endedAt",
      messages: "id,branchId,createdAt",
      workspaces: "id,title,updatedAt,archivedAt",
      writerLeases: "workspaceId,ownerId,expiresAt",
      providerProfiles: "id,updatedAt",
      sourceInstallations: "sourceId,enabled,updatedAt",
      researchProfiles: "id,mode,updatedAt",
      sourceManifests: "id,adapter.kind",
    });
  }
}

export interface StoredBranch { key: string; workspaceId: string; branch: Branch }
export interface GraphCheckpoint { id: string; workspaceId: string; branchId: string; revision: number; createdAt: string; reason: string; branch: Branch; consumedAt?: string }
export interface PatchReceipt { patchId: string; workspaceId: string; branchId: string; runId: string; baseRevision: number; committedRevision: number; committedAt: string; patch: GraphPatch }
export interface RunSummary { runId: string; workspaceId: string; branchId: string; status: "completed"; patchId: string; operationCount: number; baseRevision: number; committedRevision: number; summary: string; endedAt: string }
export interface RunExecution { id: string; workspaceId: string; branchId: string; baseRevision: number; status: "running" | "completed" | "failed" | "cancelled" | "interrupted" | "budget_exhausted"; states: string[]; startedAt: string; endedAt: string | null; usage: { inputTokens: number | null; outputTokens: number | null; source: "reported" | "estimated" | "unknown" }; error: string | null }
export interface StoredMessage extends Message { workspaceId: string }
export interface WorkspaceRecord { id: string; title: string; seedIdea: string; activeBranchId: string; branchIds: string[]; paperIds: string[]; evidenceIds: string[]; messageIds: string[]; runIds: string[]; isDemo: boolean; createdAt: string; updatedAt: string; archivedAt: string | null }
export interface WriterLease { workspaceId: string; ownerId: string; expiresAt: number }

export const ideaScopeDatabase = new IdeaScopeDatabase();
