import type {
  Branch,
  Claim,
  GraphEdge,
  GraphPatch,
  GraphNode,
} from "../../../contracts/domain";

export class GraphPatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphPatchError";
  }
}

export interface GraphPatchContext {
  workspaceId: string;
  branch: Branch;
  evidenceIds: ReadonlySet<string>;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new GraphPatchError(message);
}

function validateClaim(claim: Claim, evidenceIds: ReadonlySet<string>) {
  assert(claim.text.trim(), `判断 ${claim.id} 的文本不能为空。`);
  const linked = new Set<string>();
  for (const link of claim.evidenceLinks) {
    assert(!linked.has(link.evidenceId), `判断 ${claim.id} 重复引用证据 ${link.evidenceId}。`);
    linked.add(link.evidenceId);
    assert(evidenceIds.has(link.evidenceId), `判断 ${claim.id} 引用了不存在的证据 ${link.evidenceId}。`);
  }
  assert(
    claim.epistemicStatus !== "sourced" || claim.evidenceLinks.length > 0,
    `有来源判断 ${claim.id} 必须引用证据。`,
  );
}

function validateGraph(nodes: GraphNode[], edges: GraphEdge[], claims: Claim[]) {
  const nodeIds = new Set(nodes.map(({ id }) => id));
  const claimIds = new Set(claims.map(({ id }) => id));
  assert(nodeIds.size === nodes.length, "图中存在重复节点 ID。");
  assert(claimIds.size === claims.length, "图中存在重复判断 ID。");
  assert(new Set(edges.map(({ id }) => id)).size === edges.length, "图中存在重复关系 ID。");
  for (const node of nodes) {
    for (const id of node.claimIds) assert(claimIds.has(id), `节点 ${node.id} 引用了不存在的判断 ${id}。`);
  }
  for (const edge of edges) {
    assert(edge.source !== edge.target, `关系 ${edge.id} 不能自连接。`);
    assert(nodeIds.has(edge.source) && nodeIds.has(edge.target), `关系 ${edge.id} 的端点不存在。`);
    for (const id of edge.claimIds) assert(claimIds.has(id), `关系 ${edge.id} 引用了不存在的判断 ${id}。`);
  }
}

export function applyGraphPatch(patch: GraphPatch, context: GraphPatchContext): Branch {
  assert(patch.protocolVersion === "0.1", "不支持的图补丁协议版本。");
  assert(patch.workspaceId === context.workspaceId, "补丁 workspace 不匹配。");
  assert(patch.branchId === context.branch.id, "补丁 branch 不匹配。");
  assert(patch.baseRevision === context.branch.revision, "补丁基线 revision 已过期。");

  const next = structuredClone(context.branch);
  const { nodes, edges, claims } = next.graph;
  const findNode = (id: string) => nodes.find((item) => item.id === id);
  const findClaim = (id: string) => claims.find((item) => item.id === id);
  const findEdge = (id: string) => edges.find((item) => item.id === id);

  for (const operation of patch.operations) {
    switch (operation.op) {
      case "ADD_CLAIM":
        assert(!findClaim(operation.claim.id), `判断 ${operation.claim.id} 已存在。`);
        validateClaim(operation.claim, context.evidenceIds);
        claims.push(structuredClone(operation.claim));
        break;
      case "UPDATE_CLAIM": { 
        const claim = findClaim(operation.claimId);
        assert(claim, `判断 ${operation.claimId} 不存在。`);
        const changed = { ...claim, ...structuredClone(operation.changes) };
        validateClaim(changed, context.evidenceIds);
        Object.assign(claim, changed);
        break;
      }
      case "ADD_NODE":
        assert(!findNode(operation.node.id), `节点 ${operation.node.id} 已存在。`);
        nodes.push({ ...structuredClone(operation.node), locked: false, archived: false, mergedInto: null });
        break;
      case "UPDATE_NODE": { 
        const node = findNode(operation.nodeId);
        assert(node, `节点 ${operation.nodeId} 不存在。`);
        assert(!node.locked, `节点 ${operation.nodeId} 已锁定。`);
        Object.assign(node, structuredClone(operation.changes));
        break;
      }
      case "ADD_EDGE":
        assert(!findEdge(operation.edge.id), `关系 ${operation.edge.id} 已存在。`);
        edges.push(structuredClone(operation.edge));
        break;
      case "UPDATE_EDGE": { 
        const edge = findEdge(operation.edgeId);
        assert(edge, `关系 ${operation.edgeId} 不存在。`);
        Object.assign(edge, structuredClone(operation.changes));
        break;
      }
      case "ARCHIVE_NODE": { 
        const node = findNode(operation.nodeId);
        assert(node, `节点 ${operation.nodeId} 不存在。`);
        assert(!node.locked, `节点 ${operation.nodeId} 已锁定。`);
        assert(operation.reason.trim(), "归档原因不能为空。");
        node.archived = true;
        break;
      }
      case "MERGE_NODES": { 
        const target = findNode(operation.targetId);
        assert(target && !target.archived, `合并目标 ${operation.targetId} 不存在或已归档。`);
        assert(operation.reason.trim(), "合并原因不能为空。");
        assert(new Set(operation.sourceIds).size === operation.sourceIds.length, "合并来源不能重复。");
        for (const sourceId of operation.sourceIds) {
          assert(sourceId !== operation.targetId, "合并来源不能包含目标节点。");
          const source = findNode(sourceId);
          assert(source && !source.archived, `合并来源 ${sourceId} 不存在或已归档。`);
          assert(!source.locked, `节点 ${sourceId} 已锁定。`);
          source.archived = true;
          source.mergedInto = operation.targetId;
          target.claimIds = [...new Set([...target.claimIds, ...source.claimIds])];
          for (const edge of edges) {
            if (edge.source === sourceId) edge.source = operation.targetId;
            if (edge.target === sourceId) edge.target = operation.targetId;
          }
        }
        next.focusNodeId = operation.sourceIds.includes(next.focusNodeId ?? "") ? operation.targetId : next.focusNodeId;
        break;
      }
    }
  }
  for (const claim of claims) validateClaim(claim, context.evidenceIds);
  validateGraph(nodes, edges, claims);
  next.revision += 1;
  return next;
}
