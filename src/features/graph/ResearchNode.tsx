import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { GraphNode } from "../../../contracts/domain";
import styles from "./ResearchMap.module.css";
const labels: Record<GraphNode["kind"], string> = { question: "研究问题", concept: "概念", approach: "研究路线", finding: "研究判断", debate: "争议", gap: "待调研问题", direction: "候选方向" };
export function ResearchNode({ data, selected }: NodeProps) {
  const node = data.node as GraphNode, context = Boolean(data.context), dimmed = Boolean(data.dimmed), root = Boolean(data.root);
  return <article className={`${styles.node} ${styles[node.kind]} ${selected ? styles.selected : ""} ${context ? styles.context : ""} ${dimmed ? styles.dimmed : ""} ${root ? styles.root : ""}`}>
    <Handle type="target" position={Position.Left}/><div><span>{root ? "核心问题" : labels[node.kind]}</span>{context ? <small>当前上下文</small> : node.kind === "gap" ? <small>待验证</small> : null}</div>
    <h3>{node.title}</h3><p>{node.summary}</p><footer>{node.claimIds.length ? `${node.claimIds.length} 条相关判断` : "探索起点"}<span>第 {node.depth} 层</span></footer><Handle type="source" position={Position.Right}/>
  </article>;
}
