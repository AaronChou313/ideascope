import ELK from "elkjs/lib/elk.bundled.js";
import type { GraphEdge, GraphNode } from "../../../contracts/domain";

export const RESEARCH_NODE_SIZE = { width: 232, height: 214 } as const;
const NODE_GAP = 38;
const elk = new ELK();

export async function layoutGraph(nodes: GraphNode[], edges: GraphEdge[]) {
  const graph = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "38",
      "elk.spacing.edgeNode": "26",
      "elk.spacing.edgeEdge": "14",
      "elk.layered.spacing.nodeNodeBetweenLayers": "112",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children: nodes.map((node) => ({ id: node.id, ...RESEARCH_NODE_SIZE })),
    edges: edges.map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
  });
  return resolveCollisions(new Map(graph.children?.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]) ?? []));
}

function resolveCollisions(positions: Map<string, { x: number; y: number }>) {
  const placed: Array<{ id: string; x: number; y: number }> = [];
  const ordered = [...positions].map(([id, point]) => ({ id, ...point })).sort((a, b) => a.x - b.x || a.y - b.y);
  for (const current of ordered) {
    let moved = true;
    while (moved) {
      moved = false;
      for (const previous of placed) {
        const horizontalOverlap = current.x < previous.x + RESEARCH_NODE_SIZE.width + NODE_GAP && current.x + RESEARCH_NODE_SIZE.width + NODE_GAP > previous.x;
        const verticalOverlap = current.y < previous.y + RESEARCH_NODE_SIZE.height + NODE_GAP && current.y + RESEARCH_NODE_SIZE.height + NODE_GAP > previous.y;
        if (horizontalOverlap && verticalOverlap) {
          current.y = previous.y + RESEARCH_NODE_SIZE.height + NODE_GAP;
          moved = true;
        }
      }
    }
    placed.push(current);
  }
  return new Map(placed.map(({ id, x, y }) => [id, { x, y }]));
}
