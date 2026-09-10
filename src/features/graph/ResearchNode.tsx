import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '../../../contracts/domain';
import styles from './ResearchMap.module.css';
const labels: Record<GraphNode['kind'], string> = { question:'研究问题',concept:'概念',approach:'已有路线',finding:'研究判断',debate:'争议',gap:'待调研问题',direction:'候选方向' };
export function ResearchNode({data,selected}:NodeProps){const node=data.node as GraphNode;return <article className={`${styles.node} ${styles[node.kind]} ${selected?styles.selected:''}`}><Handle type="target" position={Position.Left}/><div><span>{labels[node.kind]}</span>{node.kind==='gap'&&<small>待验证</small>}</div><h3>{node.title}</h3><p>{node.summary}</p><footer>{node.claimIds.length?`${node.claimIds.length} 条相关判断`:'探索起点'}</footer><Handle type="source" position={Position.Right}/></article>}
