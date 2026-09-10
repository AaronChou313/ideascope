import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentRunResult } from "../../src/agent/controller";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { RunExecutionStore } from "../../src/infrastructure/storage/run-execution-store";

const databases: IdeaScopeDatabase[] = [];
function database() { const db = new IdeaScopeDatabase(`run-${crypto.randomUUID()}`); databases.push(db); return db; }
afterEach(async () => Promise.all(databases.splice(0).map((db) => db.delete())));

describe("RunExecutionStore", () => {
  it("marks a refresh-interrupted run without inventing usage", async () => {
    const store = new RunExecutionStore(database());
    await store.start({ id: "run-1", workspaceId: "ws", branchId: "b", baseRevision: 0 });
    expect(await store.interruptRunning("ws")).toBe(1);
    expect(await store.get("run-1")).toMatchObject({ status: "interrupted", usage: { source: "unknown", inputTokens: null, outputTokens: null } });
  });
  it("persists provider-reported tokens but no fabricated price", async () => {
    const store = new RunExecutionStore(database());
    await store.start({ id: "run-2", workspaceId: "ws", branchId: "b", baseRevision: 0 });
    const result: AgentRunResult = { state: "completed", output: { answer: "answer", evidenceIds: [], limitations: [], nextQuestions: [], toolRequest: null }, states: ["idle", "completed"], usage: { modelCalls: 1, toolCalls: 0, searchQueries: 0, candidates: 0, tokens: { inputTokens: 20, outputTokens: 8, source: "reported" } }, error: null };
    await store.finish("run-2", result);
    const saved = await store.get("run-2");
    expect(saved?.usage).toEqual({ inputTokens: 20, outputTokens: 8, source: "reported" });
    expect(saved).not.toHaveProperty("cost");
  });
});
