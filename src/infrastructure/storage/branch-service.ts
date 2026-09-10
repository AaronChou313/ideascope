import type { Branch, Message } from "../../../contracts/domain";
import { GraphPatchRepository } from "./graph-patch-repository";
import { IdeaScopeDatabase, ideaScopeDatabase } from "./ideascope-database";

export class BranchService {
  private readonly patches: GraphPatchRepository;
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {
    this.patches = new GraphPatchRepository(db);
  }
  async fork(workspaceId: string, sourceBranchId: string, input: { id: string; title: string }) {
    return this.db.transaction("rw", this.db.branches, this.db.runExecutions, async () => {
      const running = await this.db.runExecutions.where("workspaceId").equals(workspaceId).filter(({ status }) => status === "running").count();
      if (running) throw new Error("请先结束或取消当前运行，再创建分支。");
      if (await this.patches.getBranch(workspaceId, input.id)) throw new Error("分支 ID 已存在。");
      const source = await this.patches.getBranch(workspaceId, sourceBranchId);
      if (!source) throw new Error("来源分支不存在。");
      const branch: Branch = structuredClone(source);
      branch.id = input.id;
      branch.title = input.title.trim();
      if (!branch.title) throw new Error("分支标题不能为空。");
      branch.parentBranchId = source.id;
      branch.forkedFromRevision = source.revision;
      branch.revision = 0;
      await this.patches.seedBranch(workspaceId, branch);
      return branch;
    });
  }
  async list(workspaceId: string) {
    return (await this.db.branches.where("workspaceId").equals(workspaceId).toArray()).map(({ branch }) => branch);
  }
  async appendMessage(workspaceId: string, message: Message) {
    if (!(await this.patches.getBranch(workspaceId, message.branchId))) throw new Error("消息目标分支不存在。");
    await this.db.messages.add({ ...structuredClone(message), workspaceId });
  }
  async messages(workspaceId: string, branchId: string) {
    return this.db.messages.where("branchId").equals(branchId).filter((item) => item.workspaceId === workspaceId).sortBy("createdAt");
  }
}
