import { describe, expect, it } from "vitest";
import { createWorkspaceFromIdea } from "../../src/domain/workspace/create-workspace";

describe("createWorkspaceFromIdea", () => {
  it("creates an evidence-free local question without invoking a model", () => {
    const value = createWorkspaceFromIdea("研究不同证据边界", "ws-new");
    expect(value).toMatchObject({ formatVersion: 1, isDemo: false, workspace: { id: "ws-new", activeBranchId: "branch-main" } });
    expect(value.workspace.branches[0]?.graph).toMatchObject({ claims: [], edges: [] });
    expect(value.workspace.papers).toEqual([]);
    expect(value.workspace.evidence).toEqual([]);
  });
});
