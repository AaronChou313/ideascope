import type { Branch, GraphEdge, GraphNode, WorkspaceExport } from "../../../contracts/domain";
import { relationToShortLabel, validateTreeStructure } from "../graph/graph-structure";

export class WorkspaceFormatError extends Error {}

type LegacyNode = Omit<GraphNode, "parentId" | "depth"> & Partial<Pick<GraphNode, "parentId" | "depth">>;
type LegacyEdge = Omit<GraphEdge, "role"> & Partial<Pick<GraphEdge, "role">>;

function migrateBranch(branch: Branch) {
  const nodes = branch.graph.nodes as LegacyNode[], edges = branch.graph.edges as LegacyEdge[];
  if (!nodes.length) return;
  const nodeIds = new Set(nodes.map(({ id }) => id)), incoming = new Map(nodes.map(({ id }) => [id, 0]));
  for (const edge of edges) if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  const root = nodes.find((node) => node.parentId === null && node.depth === 0) ?? [...nodes].sort((a, b) => Number(b.kind === "question") - Number(a.kind === "question") || (incoming.get(a.id) ?? 0) - (incoming.get(b.id) ?? 0))[0]!;
  const byId = new Map(nodes.map((node) => [node.id, node])), visited = new Set([root.id]), primaryIds = new Set<string>();
  root.parentId = null; root.depth = 0;
  const queue = [root];
  while (queue.length) {
    const parent = queue.shift()!;
    for (const edge of edges) {
      if (edge.source !== parent.id || visited.has(edge.target)) continue;
      const child = byId.get(edge.target); if (!child) continue;
      child.parentId = parent.id; child.depth = (parent.depth ?? 0) + 1; edge.role = "primary";
      primaryIds.add(edge.id); visited.add(child.id); queue.push(child);
    }
  }
  for (const node of nodes) if (!visited.has(node.id)) {
    node.parentId = root.id; node.depth = 1;
    const edge: LegacyEdge = { id: `edge-migrated-${node.id}`, source: root.id, target: node.id, relation: "decomposes_into", role: "primary", label: "分解", claimIds: [] };
    edges.push(edge); primaryIds.add(edge.id);
  }
  for (const edge of edges) { if (!primaryIds.has(edge.id)) edge.role = "cross"; edge.label = relationToShortLabel(edge.relation); }
  validateTreeStructure(branch);
}

export function migrateWorkspaceExport(raw: unknown): WorkspaceExport {
  if (!raw || typeof raw !== "object") throw new WorkspaceFormatError("导入文件不是对象。");
  const input = raw as Record<string, unknown>;
  if (input.documentType !== "ideascope.workspace") throw new WorkspaceFormatError("不是 IdeaScope workspace 文件。");
  const version = input.formatVersion;
  if (version !== 0 && version !== 1 && version !== 2) {
    if (typeof version === "number" && version > 2) throw new WorkspaceFormatError(`文件版本 ${version} 来自未来版本，当前不能安全导入。`);
    throw new WorkspaceFormatError("缺少可识别的格式版本。");
  }
  const workspace = input.workspace;
  if (!workspace || typeof workspace !== "object") throw new WorkspaceFormatError("workspace 内容缺失。");
  const migrated = structuredClone(input) as unknown as WorkspaceExport;
  migrated.formatVersion = 2;
  if (typeof migrated.createdWith !== "string") migrated.createdWith = version === 0 ? "legacy-0" : "unknown";
  if (typeof migrated.exportedAt !== "string") migrated.exportedAt = new Date(0).toISOString();
  if (typeof migrated.isDemo !== "boolean") migrated.isDemo = false;
  const value = migrated.workspace;
  if (!value.id || !value.title || !value.activeBranchId || !Array.isArray(value.branches) || !Array.isArray(value.papers) || !Array.isArray(value.evidence) || !Array.isArray(value.messages) || !Array.isArray(value.runs)) throw new WorkspaceFormatError("workspace 必填字段不完整。");
  for (const branch of value.branches) {
    if (version === 2) validateTreeStructure(branch);
    else { migrateBranch(branch); branch.view.positions = {}; }
  }
  return migrated;
}
