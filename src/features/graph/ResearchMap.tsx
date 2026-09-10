import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useMemo, useState } from 'react';
import type { Branch, GraphNode } from '../../../contracts/domain';
import { ResearchNode } from './ResearchNode';
import styles from './ResearchMap.module.css';
const nodeTypes={research:ResearchNode};
export function ResearchMap({branch,selectedId,onSelect}:{branch:Branch;selectedId:string|null;onSelect:(node:GraphNode)=>void}){const[nodes,setNodes]=useState<Node[]>([]);const edges=useMemo<Edge[]>(()=>branch.graph.edges.map(edge=>({id:edge.id,source:edge.source,target:edge.target,label:edge.label,type:'smoothstep',style:{stroke:'#b9bdc5'},labelStyle:{fontSize:10,fill:'#6b7280'}})),[branch]);useEffect(()=>{let active=true;void import('./layout').then(({layoutGraph})=>layoutGraph(branch.graph.nodes,branch.graph.edges)).then(positions=>{if(active)setNodes(branch.graph.nodes.map(node=>({id:node.id,type:'research',position:positions.get(node.id)??{x:0,y:0},data:{node},selected:node.id===selectedId}))) });return()=>{active=false}},[branch,selectedId]);return <div className={styles.map}><div className={styles.notice}>示例整理 · 7 个语义节点 · 非完整调研</div><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{padding:.18}} minZoom={.45} maxZoom={1.4} nodesDraggable={false} onNodeClick={(_,item)=>onSelect(item.data.node as GraphNode)}><Background color="#d7d9dd" gap={20} size={.7}/><Controls showInteractive={false}/></ReactFlow></div>}
