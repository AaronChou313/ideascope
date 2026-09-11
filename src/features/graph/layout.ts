import ELK from "elkjs/lib/elk.bundled.js";
import type { GraphEdge, GraphNode, GraphViewState } from "../../../contracts/domain";

export const RESEARCH_NODE_SIZE = { width: 228, height: 148 } as const;
export const COLUMN_GAP = 122;
const ROW_GAP = 34;
const elk = new ELK();
export type PositionMap = Map<string, { x: number; y: number }>;

function separateColumn(nodes: GraphNode[], positions: PositionMap) {
  for (const depth of new Set(nodes.map(({ depth }) => depth))) {
    const column = nodes.filter((node) => node.depth === depth).sort((a, b) => (positions.get(a.id)?.y ?? 0) - (positions.get(b.id)?.y ?? 0));
    let cursor = 0;
    for (const node of column) { const position = positions.get(node.id)!; position.x = depth * (RESEARCH_NODE_SIZE.width + COLUMN_GAP); position.y = Math.max(position.y, cursor); cursor = position.y + RESEARCH_NODE_SIZE.height + ROW_GAP; }
  }
}

export async function fullLayoutGraph(nodes: GraphNode[], edges: GraphEdge[]) {
  const active = nodes.filter((node) => !node.archived);
  const graph = await elk.layout({ id: "root", layoutOptions: { "elk.algorithm": "layered", "elk.direction": "RIGHT", "elk.spacing.nodeNode": String(ROW_GAP), "elk.layered.spacing.nodeNodeBetweenLayers": String(COLUMN_GAP), "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX" }, children: active.map((node) => ({ id: node.id, ...RESEARCH_NODE_SIZE, layoutOptions: { "elk.layered.layering.layerConstraint": node.depth === 0 ? "FIRST" : "NONE" } })), edges: edges.filter((edge) => edge.role === "primary").map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })) });
  const positions: PositionMap = new Map(graph.children?.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]) ?? []);
  separateColumn(active, positions); return positions;
}

export async function layoutGraph(nodes: GraphNode[], edges: GraphEdge[], view?: GraphViewState, forceFull = false) {
  const saved = view?.positions ?? {};
  if (forceFull || !nodes.some((node) => saved[node.id])) return fullLayoutGraph(nodes, edges);
  const positions: PositionMap = new Map(nodes.filter((node) => saved[node.id]).map((node) => [node.id, { x: saved[node.id]!.x, y: saved[node.id]!.y }]));
  const children = new Map<string, GraphNode[]>();
  for (const node of nodes.filter((item) => !positions.has(item.id))) { const key = node.parentId ?? "ROOT"; children.set(key, [...(children.get(key) ?? []), node]); }
  for (const [parentId, additions] of children) {
    const parent = positions.get(parentId) ?? { x: 0, y: 0 };
    const total = additions.length * RESEARCH_NODE_SIZE.height + Math.max(0, additions.length - 1) * ROW_GAP;
    additions.forEach((node, index) => {
      let y = parent.y + RESEARCH_NODE_SIZE.height / 2 - total / 2 + index * (RESEARCH_NODE_SIZE.height + ROW_GAP);
      const occupied = nodes.filter((item) => item.depth === node.depth && positions.has(item.id)).map((item) => positions.get(item.id)!.y);
      while (occupied.some((other) => Math.abs(other - y) < RESEARCH_NODE_SIZE.height + ROW_GAP)) y += RESEARCH_NODE_SIZE.height + ROW_GAP;
      positions.set(node.id, { x: node.depth * (RESEARCH_NODE_SIZE.width + COLUMN_GAP), y });
    });
  }
  return positions;
}
