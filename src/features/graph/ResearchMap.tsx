import { Background, Controls, ReactFlow, type Edge, type Node, type ReactFlowInstance, type Viewport } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Branch, GraphNode } from "../../../contracts/domain";
import { ancestorsOf, relationToShortLabel } from "../../domain/graph/graph-structure";
import { Button } from "../../shared/ui";
import { ResearchNode } from "./ResearchNode";
import { layoutGraph, type PositionMap } from "./layout";
import styles from "./ResearchMap.module.css";
const nodeTypes = { research: ResearchNode };

export function ResearchMap({ branch, selectedId, contextNodeId, onSelect, onViewChange }: { branch: Branch; selectedId: string | null; contextNodeId: string | null; onSelect: (node: GraphNode) => void; onViewChange: (positions: PositionMap, viewport?: Viewport) => void }) {
  const [positions, setPositions] = useState<PositionMap>(() => new Map());
  const [arranging, setArranging] = useState(false);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const visibleIdsRef = useRef(new Set(branch.graph.nodes.map(({ id }) => id)));
  const activeId = contextNodeId ?? selectedId;
  const highlighted = useMemo(() => {
    if (!activeId) return null;
    const result = ancestorsOf(branch.graph.nodes, activeId); result.add(activeId);
    for (const node of branch.graph.nodes) if (node.parentId === activeId) result.add(node.id);
    return result;
  }, [activeId, branch.graph.nodes]);
  useEffect(() => { let live = true; const added = branch.graph.nodes.filter((node) => !visibleIdsRef.current.has(node.id)), shouldFit = Object.keys(branch.view.positions).length === 0; void layoutGraph(branch.graph.nodes, branch.graph.edges, branch.view).then((value) => { if (!live) return; setPositions(value); visibleIdsRef.current = new Set(branch.graph.nodes.map(({ id }) => id)); if (Object.keys(branch.view.positions).length !== value.size) onViewChange(value); const newest = added.at(-1), point = newest ? value.get(newest.id) : undefined; if (point) requestAnimationFrame(() => void flowRef.current?.setCenter(point.x + 114, point.y + 74, { zoom: Math.max(flowRef.current?.getZoom() ?? .7, .55), duration: 320 })); else if (shouldFit) requestAnimationFrame(() => requestAnimationFrame(() => void flowRef.current?.fitView({ padding: .22, duration: 220 }))); }); return () => { live = false; }; }, [branch.graph.nodes, branch.graph.edges, branch.view, onViewChange]);
  const nodes = useMemo<Node[]>(() => branch.graph.nodes.filter((node) => !node.archived).map((node) => ({ id: node.id, type: "research", position: positions.get(node.id) ?? { x: node.depth * 350, y: 0 }, data: { node, context: node.id === contextNodeId, dimmed: Boolean(highlighted && !highlighted.has(node.id)), root: node.depth === 0 }, selected: node.id === selectedId })), [branch.graph.nodes, positions, selectedId, contextNodeId, highlighted]);
  const edges = useMemo<Edge[]>(() => branch.graph.edges.map((edge) => {
    const related = Boolean(activeId && (highlighted?.has(edge.source) && highlighted.has(edge.target) || edge.source === activeId || edge.target === activeId));
    const showLabel = Boolean(activeId && (edge.source === activeId || edge.target === activeId));
    return { id: edge.id, source: edge.source, target: edge.target, label: showLabel ? relationToShortLabel(edge.relation) : undefined, type: "step", className: edge.role === "cross" ? styles.crossEdge : styles.primaryEdge, style: { stroke: related ? "#2563eb" : edge.role === "cross" ? "#aeb4be" : "#9ca3af", opacity: highlighted ? related ? 1 : edge.role === "cross" ? .08 : .18 : edge.role === "cross" ? .28 : .86, strokeDasharray: edge.role === "cross" ? "5 5" : undefined, strokeWidth: related ? 1.5 : 1.1 }, labelStyle: { fontSize: 10, fill: "#4b5563" } };
  }), [branch.graph.edges, activeId, highlighted]);
  async function arrange() { setArranging(true); const value = await layoutGraph(branch.graph.nodes, branch.graph.edges, branch.view, true); setPositions(value); onViewChange(value); setArranging(false); }
  const hasSavedViewport = branch.view.viewport.zoom !== 1 || branch.view.viewport.x !== 0 || branch.view.viewport.y !== 0;
  return <div className={styles.map}>
    <div className={styles.mapMeta}>{branch.graph.nodes.length} 个研究节点 · {branch.graph.claims.filter((claim) => claim.epistemicStatus === "sourced").length} 条有来源判断</div>
    <Button className={styles.arrange} style={{ right: 58 }} disabled={arranging} title="重新整理当前研究地图" onClick={() => void arrange()}>{arranging ? "整理中…" : "整理布局"}</Button>
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onInit={(instance) => { flowRef.current = instance; }} fitView={!hasSavedViewport} defaultViewport={branch.view.viewport} fitViewOptions={{ padding: .22 }} minZoom={.28} maxZoom={1.7} nodesDraggable={false} onNodeClick={(_, item) => onSelect(item.data.node as GraphNode)} onMoveEnd={(_, viewport) => onViewChange(positions, viewport)}><Background color="#d7d9dd" gap={20} size={.65}/><Controls showInteractive={false}/></ReactFlow>
  </div>;
}
