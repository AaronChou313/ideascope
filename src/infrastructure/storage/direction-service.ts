import type { DirectionCard } from "../../../contracts/domain";
import { GraphPatchRepository } from "./graph-patch-repository";
import { IdeaScopeDatabase, ideaScopeDatabase } from "./ideascope-database";

export class DirectionService {
  private readonly branches: GraphPatchRepository;
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) { this.branches = new GraphPatchRepository(db); }
  async setStatus(workspaceId: string, branchId: string, directionId: string, status: DirectionCard["status"]) {
    return this.db.transaction("rw", this.db.branches, this.db.checkpoints, async () => {
      const branch = await this.branches.getBranch(workspaceId, branchId);
      if (!branch) throw new Error("目标分支不存在。");
      const direction = branch.directions.find(({ id }) => id === directionId);
      if (!direction) throw new Error("方向不存在。");
      const before = structuredClone(branch);
      direction.status = status;
      direction.userEdited = true;
      branch.revision += 1;
      const now = new Date().toISOString();
      await this.db.checkpoints.add({ id: `direction:${directionId}:${branch.revision}`, workspaceId, branchId, revision: before.revision, createdAt: now, reason: `修改方向 ${directionId} 状态`, branch: before });
      await this.db.branches.put({ key: GraphPatchRepository.branchKey(workspaceId, branchId), workspaceId, branch });
      return direction;
    });
  }
}
