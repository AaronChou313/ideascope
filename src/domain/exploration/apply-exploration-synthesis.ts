import type { Branch, Claim, GraphOperation, GraphPatch, WorkspaceExport } from "../../../contracts/domain";
import type { ResearchSynthesis } from "./exploration-output";
import { applyGraphPatch } from "../graph/apply-graph-patch";
import { primaryEdge, relationToShortLabel, validateTreeStructure } from "../graph/graph-structure";

const normalized = (value: string) => value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\-_—–·:：，,。.!！?？()（）]/g, "");

export function ensureRootNode(branch: Branch, title: string, summary: string, updateExisting = false) {
  const current = branch.graph.nodes.find((node) => !node.archived && node.parentId === null && node.depth === 0);
  if (current) {
    current.kind = "question";
    if (updateExisting) { current.title = title; current.summary = summary; }
    return current;
  }
  const root = { id: `node-root-${crypto.randomUUID()}`, kind: "question" as const, title, summary, claimIds: [], parentId: null, depth: 0, aliases: [], locked: false, archived: false, mergedInto: null };
  branch.graph.nodes.push(root); return root;
}

export function applyExplorationSynthesis(workspace: WorkspaceExport, branch: Branch, synthesis: ResearchSynthesis, contextNodeId: string | null) {
  const previousEdgeCount = branch.graph.edges.length;
  const evidenceIds = new Set(workspace.workspace.evidence.map(({ id }) => id));
  const root = branch.graph.nodes.find((node) => node.parentId === null && node.depth === 0);
  if (!root) throw new Error("研究地图缺少 Root，无法安全应用模型输出。");
  const tempIds = new Set<string>();
  for (const draft of synthesis.nodes) {
    if (tempIds.has(draft.tempId)) throw new Error("模型返回了重复 tempId。");
    tempIds.add(draft.tempId);
    if (draft.evidenceIds.some((id) => !evidenceIds.has(id))) throw new Error("模型引用了不存在的 Evidence。");
    if (draft.existingNodeId && !branch.graph.nodes.some((node) => node.id === draft.existingNodeId)) throw new Error("模型引用了不存在的已有节点。");
  }
  const operations: GraphOperation[] = [], refs = new Map<string, string>([["ROOT", root.id], ...branch.graph.nodes.map((node) => [node.id, node.id] as const)]);
  const addedIds: string[] = [];
  for (const draft of synthesis.nodes) {
    const duplicate = branch.graph.nodes.find((node) => normalized(node.title) === normalized(draft.title) || node.aliases.some((alias) => normalized(alias) === normalized(draft.title)));
    const existingId = draft.existingNodeId ?? duplicate?.id;
    if (existingId) {
      const existing = branch.graph.nodes.find((node) => node.id === existingId)!;
      operations.push({ op: "UPDATE_NODE", nodeId: existing.id, changes: { summary: draft.summary, aliases: [...new Set([...existing.aliases, ...(draft.aliases ?? []), draft.title])].slice(0, 8) } });
      refs.set(draft.tempId, existing.id); continue;
    }
    const parentRef = draft.parentRef ?? (contextNodeId ?? "ROOT");
    const parentId = refs.get(parentRef);
    if (!parentId) throw new Error(`模型返回的 parentRef ${parentRef} 不存在。`);
    const parent = branch.graph.nodes.find((node) => node.id === parentId) ?? operations.flatMap((operation) => operation.op === "ADD_NODE" ? [operation.node] : []).find((node) => node.id === parentId);
    if (!parent) throw new Error("模型返回的父节点无法解析。");
    const id = `node-${crypto.randomUUID()}`; refs.set(draft.tempId, id); addedIds.push(id);
    const valid = draft.evidenceIds.filter((value) => evidenceIds.has(value));
    const claim: Claim = { id: `claim-${crypto.randomUUID()}`, text: draft.summary, epistemicStatus: valid.length ? "sourced" : "inference", evidenceLinks: valid.map((evidenceId) => ({ evidenceId, stance: "background" })), qualifiers: valid.length ? [] : ["模型归纳，待进一步核查"], verification: "unreviewed" };
    operations.push({ op: "ADD_CLAIM", claim });
    operations.push({ op: "ADD_NODE", node: { id, kind: draft.kind, title: draft.title, summary: draft.summary, claimIds: [claim.id], parentId, depth: parent.depth + 1, aliases: draft.aliases ?? [] } });
    operations.push({ op: "ADD_EDGE", edge: primaryEdge(parentId, id, parent.depth === 0 ? "addressed_by" : "decomposes_into") });
  }
  for (const link of synthesis.crossLinks) {
    const source = refs.get(link.sourceRef), target = refs.get(link.targetRef);
    if (!source || !target || source === target) throw new Error("模型返回的 Cross Link 引用无效。");
    if (branch.graph.edges.some((edge) => edge.source === source && edge.target === target)) continue;
    operations.push({ op: "ADD_EDGE", edge: { id: `edge-${crypto.randomUUID()}`, source, target, relation: link.relation, role: "cross", label: relationToShortLabel(link.relation), claimIds: [] } });
  }
  const patch: GraphPatch = { protocolVersion: "0.1", patchId: `patch-${crypto.randomUUID()}`, runId: `run-${crypto.randomUUID()}`, workspaceId: workspace.workspace.id, branchId: branch.id, baseRevision: branch.revision, summary: "应用经验证的渐进式研究树更新", operations };
  const next = applyGraphPatch(patch, { workspaceId: workspace.workspace.id, branch, evidenceIds });
  next.summary.understood = [...new Set([...next.summary.understood, ...synthesis.summary])].slice(-12);
  next.summary.openQuestions = synthesis.nextQuestions;
  validateTreeStructure(next);
  Object.assign(branch, next);
  return { nodesAdded: addedIds.length, edgesAdded: next.graph.edges.length - previousEdgeCount };
}
