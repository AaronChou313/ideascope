import { describe, expect, it } from 'vitest';
import { layoutGraph, RESEARCH_NODE_SIZE } from '../../src/features/graph/layout';
import { loadDemoWorkspace } from '../../src/infrastructure/demo/workspace-demo';

describe('demo graph adapter and ELK layout', () => {
  it('returns isolated demo copies', () => {
    const first = loadDemoWorkspace();
    const second = loadDemoWorkspace();
    first.workspace.title = 'changed';
    expect(second.workspace.title).not.toBe('changed');
    expect(second.isDemo).toBe(true);
  });

  it('lays out every semantic node at a finite position', async () => {
    const branch = loadDemoWorkspace().workspace.branches[0];
    if (!branch) throw new Error('Fixture has no branch');
    const positions = await layoutGraph(branch.graph.nodes, branch.graph.edges);
    expect(positions.size).toBe(branch.graph.nodes.length);
    for (const position of positions.values()) {
      expect(Number.isFinite(position.x)).toBe(true);
      expect(Number.isFinite(position.y)).toBe(true);
    }
  });

  it('reserves the rendered card size so node rectangles never overlap', async () => {
    const branch = loadDemoWorkspace().workspace.branches[0];
    if (!branch) throw new Error('Fixture has no branch');
    const positions = await layoutGraph(branch.graph.nodes, branch.graph.edges);
    const entries = [...positions.entries()];
    for (let left = 0; left < entries.length; left += 1) {
      for (let right = left + 1; right < entries.length; right += 1) {
        const a = entries[left]![1];
        const b = entries[right]![1];
        const separated = a.x + RESEARCH_NODE_SIZE.width <= b.x || b.x + RESEARCH_NODE_SIZE.width <= a.x || a.y + RESEARCH_NODE_SIZE.height <= b.y || b.y + RESEARCH_NODE_SIZE.height <= a.y;
        expect(separated).toBe(true);
      }
    }
  });

  it('packs disconnected nodes without collisions', async () => {
    const branch = loadDemoWorkspace().workspace.branches[0];
    if (!branch) throw new Error('Fixture has no branch');
    const nodes = Array.from({ length: 20 }, (_, index) => ({ ...branch.graph.nodes[0]!, id: `isolated-${index}` }));
    const positions = await layoutGraph(nodes, []);
    const entries = [...positions.values()];
    for (let left = 0; left < entries.length; left += 1) for (let right = left + 1; right < entries.length; right += 1) {
      const a = entries[left]!; const b = entries[right]!;
      expect(a.x + RESEARCH_NODE_SIZE.width <= b.x || b.x + RESEARCH_NODE_SIZE.width <= a.x || a.y + RESEARCH_NODE_SIZE.height <= b.y || b.y + RESEARCH_NODE_SIZE.height <= a.y).toBe(true);
    }
  });

  it('uses depth as the column and ignores cross links for hierarchy', async () => {
    const branch = loadDemoWorkspace().workspace.branches[0]!;
    const positions = await layoutGraph(branch.graph.nodes, branch.graph.edges, undefined, true);
    for (const node of branch.graph.nodes) expect(positions.get(node.id)?.x).toBe(node.depth * 350);
    const cross = branch.graph.edges.find((edge) => edge.role === 'cross');
    if (cross) expect(branch.graph.nodes.find((node) => node.id === cross.target)?.parentId).not.toBe(cross.source);
  });

  it('preserves existing positions while placing a new child to the right', async () => {
    const branch = loadDemoWorkspace().workspace.branches[0]!;
    const initial = await layoutGraph(branch.graph.nodes, branch.graph.edges, undefined, true);
    branch.view.positions = Object.fromEntries([...initial].map(([id, value]) => [id, { ...value, pinned: false }]));
    const parent = branch.graph.nodes[1]!;
    branch.graph.nodes.push({ ...parent, id: 'new-child', title: '新增局部节点', parentId: parent.id, depth: parent.depth + 1 });
    const next = await layoutGraph(branch.graph.nodes, branch.graph.edges, branch.view);
    for (const [id, position] of initial) expect(next.get(id)).toEqual(position);
    expect(next.get('new-child')!.x).toBeGreaterThan(next.get(parent.id)!.x);
  });
});
