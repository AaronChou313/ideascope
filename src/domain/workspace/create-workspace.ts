import type { WorkspaceExport } from "../../../contracts/domain";

export function createWorkspaceFromIdea(idea: string, id: string = crypto.randomUUID()): WorkspaceExport {
  const text = idea.trim();
  if (!text) throw new Error("请先写下一个想法。");
  const now = new Date().toISOString();
  return {
    documentType: "ideascope.workspace",
    formatVersion: 2,
    createdWith: "0.6.14",
    exportedAt: now,
    isDemo: false,
    workspace: {
      id,
      title: text.slice(0, 48),
      seedIdea: text,
      activeBranchId: "branch-main",
      branches: [{
        id: "branch-main", title: "初始范围", parentBranchId: null, forkedFromRevision: null, revision: 0, focusNodeId: "question-root",
        scope: { object: text, question: text, constraints: [], assumptions: [] },
        summary: { understood: [], decisions: [], openQuestions: [text] },
        graph: { nodes: [{ id: "question-root", kind: "question", title: text.slice(0, 80), summary: "用户写下的探索起点；尚未检索或由模型分析。", claimIds: [], parentId: null, depth: 0, aliases: [], locked: false, archived: false, mergedInto: null }], edges: [], claims: [] },
        view: { positions: {}, collapsedIds: [], viewport: { x: 0, y: 0, zoom: 1 } }, directions: [],
      }],
      papers: [], evidence: [], messages: [], runs: [],
    },
  };
}

export function createEmptyWorkspace(id: string = crypto.randomUUID()): WorkspaceExport {
  const now = new Date().toISOString();
  return { documentType: "ideascope.workspace", formatVersion: 2, createdWith: "0.6.14", exportedAt: now, isDemo: false, workspace: { id, title: "未命名探索", seedIdea: "", activeBranchId: "branch-main", branches: [{ id: "branch-main", title: "主要探索", parentBranchId: null, forkedFromRevision: null, revision: 0, focusNodeId: null, scope: { object: "", question: "", constraints: [], assumptions: [] }, summary: { understood: [], decisions: [], openQuestions: [] }, graph: { nodes: [], edges: [], claims: [] }, view: { positions: {}, collapsedIds: [], viewport: { x: 0, y: 0, zoom: 1 } }, directions: [] }], papers: [], evidence: [], messages: [], runs: [] } };
}
