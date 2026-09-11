import { Background, Controls, ReactFlow, type Edge, type Node, type ReactFlowInstance, type Viewport } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Branch, GraphNode } from "../../../contracts/domain";
import { ancestorsOf, relationToShortLabel } from "../../domain/graph/graph-structure";
import { Button } from "../../shared/ui";
import { ResearchNode } from "./ResearchNode";
import { layoutGraph, type PositionMap } from "./layout";
import styles from "./ResearchMap.module.css";
import { MAX_GRAPH_ZOOM, MIN_GRAPH_ZOOM, normalizeViewport, viewportShowsAnyNode } from "./viewport";
const nodeTypes = { research: ResearchNode };

export function ResearchMap({ branch, selectedId, contextNodeId, onSelect, onViewChange }: { branch: Branch; selectedId: string | null; contextNodeId: string | null; onSelect: (node: GraphNode) => void; onViewChange: (positions: PositionMap, viewport?: Viewport) => void }) {
  const [positions, setPositions] = useState<PositionMap>(() => new Map());
  const [arranging, setArranging] = useState(false);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef(positions);
  const viewRef = useRef(branch.view);
  const graphRef = useRef(branch.graph);
  const visibleIdsRef = useRef(new Set(branch.graph.nodes.map(({ id }) => id)));
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { viewRef.current = branch.view; }, [branch.view]);
  useEffect(() => { graphRef.current = branch.graph; }, [branch.graph]);
  const activeId = contextNodeId ?? selectedId;
  const highlighted = useMemo(() => {
    if (!activeId) return null;
    const result = ancestorsOf(branch.graph.nodes, activeId); result.add(activeId);
    for (const node of branch.graph.nodes) if (node.parentId === activeId) result.add(node.id);
    return result;
  }, [activeId, branch.graph.nodes]);
  useEffect(() => {
    let live = true;
    const view = viewRef.current, graph = graphRef.current;
    const added = graph.nodes.filter((node) => !visibleIdsRef.current.has(node.id));
    const shouldFit = Object.keys(view.positions).length === 0;
    void layoutGraph(graph.nodes, graph.edges, view).then((value) => {
      if (!live) return;
      setPositions(value);
      positionsRef.current = value;
      visibleIdsRef.current = new Set(graph.nodes.map(({ id }) => id));
      if (Object.keys(view.positions).length !== value.size) onViewChange(value);
      const newest = added.at(-1), point = newest ? value.get(newest.id) : undefined;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const instance = flowRef.current, map = mapRef.current;
        if (!instance || !map) return;
        if (point) {
          void instance.setCenter(point.x + 114, point.y + 74, { zoom: Math.max(instance.getZoom(), .55), duration: 320 });
          return;
        }
        const viewport = normalizeViewport(instance.getViewport());
        if (shouldFit || !viewport || !viewportShowsAnyNode(viewport, value, map.clientWidth, map.clientHeight)) {
          void instance.fitView({ padding: .22, duration: 220 }).then(() => {
            const recovered = normalizeViewport(instance.getViewport());
            if (recovered) onViewChange(value, recovered);
          });
        }
      }));
    });
    return () => { live = false; };
  }, [branch.id, branch.revision, onViewChange]);
  const nodes = useMemo<Node[]>(() => branch.graph.nodes.filter((node) => !node.archived).map((node) => ({ id: node.id, type: "research", position: positions.get(node.id) ?? { x: node.depth * 350, y: 0 }, data: { node, context: node.id === contextNodeId, dimmed: Boolean(highlighted && !highlighted.has(node.id)), root: node.depth === 0 }, selected: node.id === selectedId })), [branch.graph.nodes, positions, selectedId, contextNodeId, highlighted]);
  const edges = useMemo<Edge[]>(() => branch.graph.edges.map((edge) => {
    const related = Boolean(activeId && (highlighted?.has(edge.source) && highlighted.has(edge.target) || edge.source === activeId || edge.target === activeId));
    const showLabel = Boolean(activeId && (edge.source === activeId || edge.target === activeId));
    return { id: edge.id, source: edge.source, target: edge.target, label: showLabel ? relationToShortLabel(edge.relation) : undefined, type: "step", className: edge.role === "cross" ? styles.crossEdge : styles.primaryEdge, style: { stroke: related ? "#2563eb" : edge.role === "cross" ? "#aeb4be" : "#9ca3af", opacity: highlighted ? related ? 1 : edge.role === "cross" ? .08 : .18 : edge.role === "cross" ? .28 : .86, strokeDasharray: edge.role === "cross" ? "5 5" : undefined, strokeWidth: related ? 1.5 : 1.1 }, labelStyle: { fontSize: 10, fill: "#4b5563" } };
  }), [branch.graph.edges, activeId, highlighted]);
  async function recoverView(value = positionsRef.current) {
    const instance = flowRef.current;
    if (!instance || value.size === 0) return;
    await instance.fitView({ padding: .22, duration: 220 });
    const viewport = normalizeViewport(instance.getViewport());
    if (viewport) onViewChange(value, viewport);
  }
  async function arrange() { setArranging(true); const value = await layoutGraph(branch.graph.nodes, branch.graph.edges, viewRef.current, true); setPositions(value); positionsRef.current = value; onViewChange(value); await recoverView(value); setArranging(false); }
  const savedViewport = normalizeViewport(branch.view.viewport);
  const hasSavedViewport = Boolean(savedViewport && (savedViewport.zoom !== 1 || savedViewport.x !== 0 || savedViewport.y !== 0));
  return <div className={styles.map} ref={mapRef}>
    <div className={styles.mapMeta}>{branch.graph.nodes.length} 个研究节点 · {branch.graph.claims.filter((claim) => claim.epistemicStatus === "sourced").length} 条有来源判断</div>
    <div className={styles.mapActions}>
      <Button disabled={arranging} title="将全部研究节点重新放回可见区域" onClick={() => void recoverView()}>找回地图</Button>
      <Button disabled={arranging} title="重新整理当前研究地图" onClick={() => void arrange()}>{arranging ? "整理中…" : "整理布局"}</Button>
    </div>
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onInit={(instance) => { flowRef.current = instance; }} fitView={!hasSavedViewport} defaultViewport={savedViewport ?? { x: 0, y: 0, zoom: 1 }} fitViewOptions={{ padding: .22 }} minZoom={MIN_GRAPH_ZOOM} maxZoom={MAX_GRAPH_ZOOM} nodesDraggable={false} onNodeClick={(_, item) => onSelect(item.data.node as GraphNode)} onMoveEnd={(event, viewport) => { const safe = normalizeViewport(viewport); if (event && safe && positionsRef.current.size > 0) onViewChange(positionsRef.current, safe); }}><Background color="#d7d9dd" gap={20} size={.65}/><Controls showInteractive={false}/></ReactFlow>
  </div>;
}
