import { cloneImportedWorkspace } from "../../domain/export/workspace-export";
import type { WorkspaceArchive } from "../../domain/archive/workspace-archive";
import { researchProfileSchema } from "../../domain/research-profile/research-profile";
import { literatureSourceManifestSchema } from "../../domain/literature-source/literature-source";
import { IdeaScopeDatabase, ideaScopeDatabase } from "../../infrastructure/storage/ideascope-database";
import { WorkspaceRepository } from "../../infrastructure/storage/workspace-repository";
import { ResearchProfileRepository } from "../../infrastructure/storage/research-profile-repository";
import { SourceManifestRepository } from "../../infrastructure/storage/source-manifest-repository";
import { SourceInstallationRepository } from "../../infrastructure/storage/source-installation-repository";
import { migrateWorkspaceExport } from "../../domain/workspace/migrate-workspace";

export class WorkspaceArchiveService {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}

  async create(workspaceId: string): Promise<WorkspaceArchive> {
    const workspace = await new WorkspaceRepository(this.db).get(workspaceId);
    if (!workspace) throw new Error("探索项目不存在。");
    const profiles = new ResearchProfileRepository(this.db);
    return {
      documentType: "ideascope.workspace-archive", archiveVersion: 1, createdWith: "0.6.15", exportedAt: new Date().toISOString(),
      workspace,
      searchRecords: await this.db.searchRecords.where("workspaceId").equals(workspaceId).toArray(),
      runs: {
        executions: await this.db.runExecutions.where("workspaceId").equals(workspaceId).toArray(),
        summaries: await this.db.runSummaries.where("workspaceId").equals(workspaceId).toArray(),
      },
      sessionProfile: await profiles.getSession(workspaceId) ?? null,
      baseProfileSnapshots: await profiles.listBase(),
      sourceSnapshots: await new SourceManifestRepository(this.db).list(),
      sourceInstallations: await new SourceInstallationRepository(this.db).list(),
      provenance: { originalWorkspaceId: workspaceId, importedAt: null },
    };
  }

  parse(raw: unknown): WorkspaceArchive {
    if (!raw || typeof raw !== "object") throw new Error("完整探索档案格式无效。");
    const value = raw as Partial<WorkspaceArchive>;
    if (value.documentType !== "ideascope.workspace-archive" || value.archiveVersion !== 1) throw new Error("不支持的完整探索档案版本。");
    if (!Array.isArray(value.searchRecords) || !value.runs || !Array.isArray(value.runs.executions) || !Array.isArray(value.runs.summaries) || !Array.isArray(value.baseProfileSnapshots) || !Array.isArray(value.sourceSnapshots) || !Array.isArray(value.sourceInstallations) || !value.workspace || !value.provenance)
      throw new Error("完整探索档案缺少必要数据。");
    value.baseProfileSnapshots.forEach((profile) => researchProfileSchema.parse(profile));
    if (value.sessionProfile) researchProfileSchema.parse(value.sessionProfile);
    value.sourceSnapshots.forEach((manifest) => literatureSourceManifestSchema.parse(manifest));
    value.workspace = migrateWorkspaceExport(value.workspace);
    return value as WorkspaceArchive;
  }

  async import(raw: unknown) {
    const archive = this.parse(raw);
    const repository = new WorkspaceRepository(this.db);
    const existing = new Set((await repository.list()).map((item) => item.id));
    const workspace = cloneImportedWorkspace(archive.workspace, existing, () => crypto.randomUUID());
    const saved = await repository.save(workspace);
    if (saved.status !== "saved") throw new Error(saved.message);
    const workspaceId = workspace.workspace.id;
    const profiles = new ResearchProfileRepository(this.db);
    if (archive.sessionProfile) await profiles.save({ ...archive.sessionProfile, id: `session:${workspaceId}`, mode: "session", updatedAt: new Date().toISOString() });
    for (const profile of archive.baseProfileSnapshots)
      await profiles.save({ ...profile, id: `imported:${profile.id}:${crypto.randomUUID()}`, mode: "base", provenance: "imported", updatedAt: new Date().toISOString() });
    const manifests = new SourceManifestRepository(this.db);
    for (const manifest of archive.sourceSnapshots) {
      if (manifest.adapter.kind === "builtin") continue;
      try { await manifests.install(manifest); } catch { /* conflict remains unchanged */ }
    }
    await this.db.searchRecords.bulkPut(archive.searchRecords.map((record) => ({ ...record, id: crypto.randomUUID(), workspaceId })));
    await this.db.runExecutions.bulkPut(archive.runs.executions.map((run) => ({ ...run, id: crypto.randomUUID(), workspaceId })));
    return workspace;
  }
}
