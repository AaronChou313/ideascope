import { describe, expect, it } from 'vitest';
import type { GraphPatch, WorkspaceExport } from '../../contracts/domain';
import patchJson from '../../examples/patch.demo.json';
import scenariosJson from '../../examples/scenarios.json';
import workspaceJson from '../../examples/workspace.demo.json';

const workspace = workspaceJson as WorkspaceExport;
const patch = patchJson as GraphPatch;

function expectUnique(ids: string[], label: string) {
  expect(new Set(ids).size, `${label} IDs must be unique`).toBe(ids.length);
}

describe('example reference integrity', () => {
  it('keeps workspace IDs unique and all cross-record references resolvable', () => {
    const data = workspace.workspace;
    const branchIds = data.branches.map(({ id }) => id);
    const paperIds = data.papers.map(({ id }) => id);
    const evidenceIds = data.evidence.map(({ id }) => id);
    const messageIds = data.messages.map(({ id }) => id);
    const runIds = data.runs.map(({ id }) => id);

    expectUnique(branchIds, 'branch');
    expectUnique(paperIds, 'paper');
    expectUnique(evidenceIds, 'evidence');
    expectUnique(messageIds, 'message');
    expectUnique(runIds, 'run');
    expect(branchIds).toContain(data.activeBranchId);

    for (const evidence of data.evidence) expect(paperIds).toContain(evidence.paperId);
    for (const message of data.messages) {
      expect(branchIds).toContain(message.branchId);
      for (const evidenceId of message.evidenceIds) expect(evidenceIds).toContain(evidenceId);
    }
    for (const run of data.runs) expect(branchIds).toContain(run.branchId);

    for (const branch of data.branches) {
      const nodeIds = branch.graph.nodes.map(({ id }) => id);
      const claimIds = branch.graph.claims.map(({ id }) => id);
      expectUnique(nodeIds, `node in ${branch.id}`);
      expectUnique(claimIds, `claim in ${branch.id}`);
      expect(Object.keys(branch.view.positions).sort()).toEqual([...nodeIds].sort());
      if (branch.parentBranchId) expect(branchIds).toContain(branch.parentBranchId);
      if (branch.focusNodeId) expect(nodeIds).toContain(branch.focusNodeId);
      for (const node of branch.graph.nodes) {
        for (const claimId of node.claimIds) expect(claimIds).toContain(claimId);
        if (node.mergedInto) expect(nodeIds).toContain(node.mergedInto);
      }
      for (const edge of branch.graph.edges) {
        expect(nodeIds).toContain(edge.source);
        expect(nodeIds).toContain(edge.target);
        for (const claimId of edge.claimIds) expect(claimIds).toContain(claimId);
      }
      for (const claim of branch.graph.claims) {
        for (const link of claim.evidenceLinks) expect(evidenceIds).toContain(link.evidenceId);
        if (claim.epistemicStatus === 'sourced') expect(claim.evidenceLinks.length).toBeGreaterThan(0);
      }
      for (const direction of branch.directions) {
        for (const claimId of direction.claimIds) expect(claimIds).toContain(claimId);
      }
    }
  });

  it('anchors the patch to the demo workspace and its base revision', () => {
    const branch = workspace.workspace.branches.find(({ id }) => id === patch.branchId);
    expect(patch.workspaceId).toBe(workspace.workspace.id);
    expect(branch).toBeDefined();
    expect(patch.baseRevision).toBe(branch?.revision);
  });

  it('keeps the scenario collection parseable and non-empty', () => {
    expect(Array.isArray(scenariosJson)).toBe(true);
    expect(scenariosJson.length).toBeGreaterThan(0);
  });
});
