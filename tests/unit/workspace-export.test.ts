import { describe, expect, it } from "vitest";
import type { WorkspaceExport } from "../../contracts/domain";
import workspaceJson from "../../examples/workspace.demo.json";
import { auditWorkspaceExport, cloneImportedWorkspace, exportBranchSvg, exportWorkspaceJson, exportWorkspaceMarkdown, pngEligibility } from "../../src/domain/export/workspace-export";

const workspace = workspaceJson as WorkspaceExport;
const branch = workspace.workspace.branches[0]!;

describe("workspace exports", () => {
  it("round-trips full JSON without credentials", () => {
    const json = exportWorkspaceJson(workspace, "0.6.0");
    const parsed = JSON.parse(json) as unknown as WorkspaceExport;
    expect(parsed.workspace).toEqual(workspace.workspace);
    expect(json).not.toMatch(/api[_-]?key|authorization|bearer/i);
    expect(auditWorkspaceExport(workspace).credentials).toBe(0);
  });
  it("renders a Markdown outline with numbered sources and epistemic labels", () => {
    const markdown = exportWorkspaceMarkdown(workspace, branch.id);
    expect(markdown).toContain("## 参考文献");
    expect(markdown).toContain("**sourced**");
    expect(markdown).toContain("[1]");
  });
  it("exports hidden nodes only for complete scope and emits inert SVG", () => {
    const visible = exportBranchSvg(branch, "visible", [branch.graph.nodes[0]!.id]);
    const complete = exportBranchSvg(branch, "complete");
    expect((visible.match(/<rect /g) ?? []).length).toBe(2);
    expect((complete.match(/<rect /g) ?? []).length).toBeGreaterThan(2);
    expect(complete).not.toMatch(/<script|<image|href=/i);
    expect(pngEligibility(complete).format).toBe("png");
    expect(pngEligibility('<svg width="9000" height="100"></svg>').format).toBe("svg");
  });
  it("imports as a new project without overwriting an existing id", () => {
    const ids = ["workspace-demo", "new-1"];
    const imported = cloneImportedWorkspace(workspace, new Set(["workspace-demo", "new-1"]), () => ids.shift() ?? "new-2");
    expect(imported.workspace.id).toBe("new-2");
    expect(imported.workspace.title).toMatch(/导入/);
    expect(imported.isDemo).toBe(false);
  });
});
