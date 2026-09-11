import type { WorkspaceExport } from "../../../contracts/domain";
import { migrateWorkspaceExport } from "../../domain/workspace/migrate-workspace";
import { IdeaScopeDatabase, ideaScopeDatabase, type WorkspaceRecord } from "./ideascope-database";

export type SaveResult = { status: "saved"; updatedAt: string } | { status: "quota_exceeded"; message: string } | { status: "failed"; message: string };

function quotaError(error: unknown) { return error instanceof DOMException && error.name === "QuotaExceededError"; }

export class WorkspaceRepository {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}
  async save(raw: unknown): Promise<SaveResult> {
    try {
      const exported = migrateWorkspaceExport(raw);
      const { workspace } = exported;
      const now = new Date().toISOString();
      const existing = await this.db.workspaces.get(workspace.id);
      const record: WorkspaceRecord = { id: workspace.id, title: workspace.title, seedIdea: workspace.seedIdea, activeBranchId: workspace.activeBranchId, branchIds: workspace.branches.map(({ id }) => id), paperIds: workspace.papers.map(({ id }) => id), evidenceIds: workspace.evidence.map(({ id }) => id), messageIds: workspace.messages.map(({ id }) => id), runIds: workspace.runs.map(({ id }) => id), isDemo: exported.isDemo, createdAt: existing?.createdAt ?? now, updatedAt: now, archivedAt: existing?.archivedAt ?? null };
      await this.db.transaction("rw", this.db.workspaces, this.db.branches, this.db.papers, this.db.evidence, this.db.messages, async () => {
        await this.db.workspaces.put(record);
        await this.db.branches.bulkPut(workspace.branches.map((branch) => ({ key: `${workspace.id}:${branch.id}`, workspaceId: workspace.id, branch: structuredClone(branch) })));
        await this.db.papers.bulkPut(structuredClone(workspace.papers));
        await this.db.evidence.bulkPut(structuredClone(workspace.evidence));
        await this.db.messages.bulkPut(workspace.messages.map((message) => ({ ...structuredClone(message), workspaceId: workspace.id })));
      });
      return { status: "saved", updatedAt: now };
    } catch (error) {
      if (quotaError(error)) return { status: "quota_exceeded", message: "浏览器存储空间不足，未保存本次修改。请先导出备份。" };
      return { status: "failed", message: error instanceof Error ? error.message : "保存失败。" };
    }
  }
  async get(id: string): Promise<WorkspaceExport | undefined> {
    const record = await this.db.workspaces.get(id);
    if (!record) return undefined;
    const branches = (await Promise.all(record.branchIds.map((branchId) => this.db.branches.get(`${id}:${branchId}`)))).flatMap((item) => item ? [item.branch] : []);
    const papers = (await Promise.all(record.paperIds.map((paperId) => this.db.papers.get(paperId)))).flatMap((item) => item ? [item] : []);
    const evidence = (await Promise.all(record.evidenceIds.map((evidenceId) => this.db.evidence.get(evidenceId)))).flatMap((item) => item ? [item] : []);
    const messages = (await Promise.all(record.messageIds.map((messageId) => this.db.messages.get(messageId)))).flatMap((item) => item ? [{ id: item.id, branchId: item.branchId, role: item.role, text: item.text, evidenceIds: item.evidenceIds, createdAt: item.createdAt, isDemo: item.isDemo }] : []);
    const legacy = branches.some((branch) => branch.graph.nodes.some((node) => !("depth" in node) || !("parentId" in node)) || branch.graph.edges.some((edge) => !("role" in edge)));
    return migrateWorkspaceExport({ documentType: "ideascope.workspace", formatVersion: legacy ? 1 : 2, createdWith: "0.6.15", exportedAt: record.updatedAt, isDemo: record.isDemo, workspace: { id: record.id, title: record.title, seedIdea: record.seedIdea, activeBranchId: record.activeBranchId, branches, papers, evidence, messages, runs: [] } });
  }
  list() { return this.db.workspaces.orderBy("updatedAt").reverse().toArray(); }
  async rename(id: string, title: string) {
    const value = title.trim();
    if (!value) throw new Error("项目名称不能为空。");
    const workspace = await this.db.workspaces.get(id);
    if (!workspace) throw new Error("项目不存在。");
    await this.db.workspaces.put({ ...workspace, updatedAt: new Date().toISOString(), title: value });
  }
  async archive(id: string) {
    const workspace = await this.db.workspaces.get(id);
    if (!workspace) throw new Error("项目不存在。");
    await this.db.workspaces.put({ ...workspace, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  async delete(id: string, confirmedTitle: string) {
    const workspace = await this.db.workspaces.get(id);
    if (!workspace) throw new Error("项目不存在。");
    if (confirmedTitle !== workspace.title) throw new Error("删除确认名称不匹配；请先导出备份。");
    await this.db.transaction("rw", [this.db.workspaces, this.db.branches, this.db.messages, this.db.runExecutions, this.db.checkpoints, this.db.patchReceipts, this.db.runSummaries, this.db.writerLeases, this.db.researchProfiles], async () => {
      await this.db.branches.where("workspaceId").equals(id).delete();
      await this.db.messages.filter((item) => item.workspaceId === id).delete();
      await this.db.runExecutions.where("workspaceId").equals(id).delete();
      await this.db.checkpoints.where("workspaceId").equals(id).delete();
      await this.db.patchReceipts.where("workspaceId").equals(id).delete();
      await this.db.runSummaries.where("workspaceId").equals(id).delete();
      await this.db.writerLeases.delete(id);
      await this.db.researchProfiles.delete(`session:${id}`);
      await this.db.workspaces.delete(id);
    });
  }
}
