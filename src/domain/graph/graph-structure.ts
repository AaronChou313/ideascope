import type { Branch, GraphEdge, GraphNode, Relation } from "../../../contracts/domain";

export const relationShortLabels: Record<Relation, string> = {
  decomposes_into: "分解", addressed_by: "路线", requires: "依赖",
  contrasts_with: "对比", limited_by: "限制", motivates: "引出", related_to: "关联",
};
export function relationToShortLabel(relation: Relation) { return relationShortLabels[relation]; }
export function validateTreeStructure(branch: Branch) {
  const active = branch.graph.nodes.filter((node) => !node.archived);
  if (!active.length) return;
  const byId = new Map(active.map((node) => [node.id, node]));
  const roots = active.filter((node) => node.parentId === null && node.depth === 0);
  if (roots.length !== 1) throw new Error("研究地图必须且只能包含一个 Root。");
  for (const node of active) {
    if (node === roots[0]) continue;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (!parent || parent.id === node.id) throw new Error(`节点 ${node.id} 的父节点无效。`);
    if (node.depth !== parent.depth + 1) throw new Error(`节点 ${node.id} 的 depth 与父节点不一致。`);
    if (branch.graph.edges.filter((edge) => edge.role === "primary" && edge.source === parent.id && edge.target === node.id).length !== 1) throw new Error(`节点 ${node.id} 必须有且只有一条父级关系。`);
    const visited = new Set<string>([node.id]); let cursor: GraphNode | undefined = parent;
    while (cursor) { if (visited.has(cursor.id)) throw new Error("主研究树不能形成环。"); visited.add(cursor.id); cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined; }
  }
  for (const edge of branch.graph.edges) if (edge.role === "primary") {
    const source = byId.get(edge.source), target = byId.get(edge.target);
    if (!source || !target || target.parentId !== source.id || target.depth !== source.depth + 1) throw new Error(`Primary Edge ${edge.id} 与层级结构不一致。`);
  }
}
export function ancestorsOf(nodes: GraphNode[], id: string) {
  const byId = new Map(nodes.map((node) => [node.id, node])); const result = new Set<string>(); let current = byId.get(id);
  while (current?.parentId) { result.add(current.parentId); current = byId.get(current.parentId); }
  return result;
}
export function primaryEdge(source: string, target: string, relation: Relation = "decomposes_into"): GraphEdge {
  return { id: `edge-${crypto.randomUUID()}`, source, target, relation, role: "primary", label: relationToShortLabel(relation), claimIds: [] };
}
