import type { AgentRunResult } from "../../agent/controller";
import { IdeaScopeDatabase, ideaScopeDatabase, type RunExecution } from "./ideascope-database";

export class RunExecutionStore {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}
  async start(input: Pick<RunExecution, "id" | "workspaceId" | "branchId" | "baseRevision">) {
    const run: RunExecution = { ...input, status: "running", states: ["idle"], startedAt: new Date().toISOString(), endedAt: null, usage: { inputTokens: null, outputTokens: null, source: "unknown" }, error: null };
    await this.db.runExecutions.add(run);
    return run;
  }
  async finish(id: string, result: AgentRunResult) {
    const run = await this.db.runExecutions.get(id);
    if (!run) throw new Error("运行记录不存在。");
    const terminal = ["completed", "failed", "cancelled", "interrupted", "budget_exhausted"].includes(result.state) ? result.state as RunExecution["status"] : "failed";
    await this.db.runExecutions.put({ ...run, status: result.state === "proposal_ready" ? "completed" : terminal, states: result.states, endedAt: new Date().toISOString(), usage: result.usage.tokens, error: result.error });
  }
  async interruptRunning(workspaceId: string) {
    return this.db.transaction("rw", this.db.runExecutions, async () => {
      const running = await this.db.runExecutions.where("workspaceId").equals(workspaceId).filter(({ status }) => status === "running").toArray();
      const endedAt = new Date().toISOString();
      await this.db.runExecutions.bulkPut(running.map((run) => ({ ...run, status: "interrupted" as const, states: [...run.states, "interrupted"], endedAt, error: "页面刷新或会话中断；未提交的结果已丢弃。" })));
      return running.length;
    });
  }
  get(id: string) { return this.db.runExecutions.get(id); }
}
