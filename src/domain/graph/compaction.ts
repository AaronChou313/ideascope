import type { Branch, GraphNode } from "../../../contracts/domain";

export interface MergeSuggestion { sourceId: string; targetId: string; reason: string }
export interface CompactionPlan { visibleIds: string[]; collapsedIds: string[]; mergeSuggestions: MergeSuggestion[] }

function terms(node: GraphNode) {
  return [node.title, ...node.aliases].map((value) => value.trim().toLocaleLowerCase()).filter(Boolean);
}

export function planCompaction(branch: Branch, maxVisible = 30): CompactionPlan {
  if (maxVisible < 1) throw new Error("可见节点上限至少为 1。");
  const active = branch.graph.nodes.filter(({ archived }) => !archived);
  const adjacent = new Map<string, Set<string>>();
  for (const edge of branch.graph.edges) {
    if (!adjacent.has(edge.source)) adjacent.set(edge.source, new Set());
    if (!adjacent.has(edge.target)) adjacent.set(edge.target, new Set());
    adjacent.get(edge.source)!.add(edge.target);
    adjacent.get(edge.target)!.add(edge.source);
  }
  const ordered: string[] = [];
  const queue = branch.focusNodeId ? [branch.focusNodeId] : [];
  const available = new Set(active.map(({ id }) => id));
  while (queue.length) {
    const id = queue.shift()!;
    if (!available.has(id) || ordered.includes(id)) continue;
    ordered.push(id);
    queue.push(...(adjacent.get(id) ?? []));
  }
  for (const node of active) if (!ordered.includes(node.id)) ordered.push(node.id);
  const visibleIds = ordered.slice(0, maxVisible);
  const collapsedIds = ordered.slice(maxVisible);
  const mergeSuggestions: MergeSuggestion[] = [];
  for (let left = 0; left < active.length; left += 1) {
    for (let right = left + 1; right < active.length; right += 1) {
      const a = active[left]!;
      const b = active[right]!;
      if (terms(a).some((term) => terms(b).includes(term))) mergeSuggestions.push({ sourceId: b.id, targetId: a.id, reason: "标题或显式别名相同；需用户确认，不会自动合并。" });
    }
  }
  return { visibleIds, collapsedIds, mergeSuggestions };
}
