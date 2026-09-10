import ELK from 'elkjs/lib/elk.bundled.js';
import type { GraphEdge, GraphNode } from '../../../contracts/domain';

const elk = new ELK();
export async function layoutGraph(nodes: GraphNode[], edges: GraphEdge[]) {
  const graph = await elk.layout({ id: 'root', layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'RIGHT', 'elk.spacing.nodeNode': '45', 'elk.layered.spacing.nodeNodeBetweenLayers': '80' }, children: nodes.map(node => ({ id: node.id, width: 220, height: 132 })), edges: edges.map(edge => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })) });
  return new Map(graph.children?.map(node => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]) ?? []);
}
