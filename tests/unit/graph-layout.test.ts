import { describe, expect, it } from 'vitest';
import { layoutGraph } from '../../src/features/graph/layout';
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
});
