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
});
