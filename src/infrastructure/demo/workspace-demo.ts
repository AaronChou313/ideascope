import type { WorkspaceExport } from '../../../contracts/domain';
import workspaceJson from '../../../examples/workspace.demo.json';

const fixture = workspaceJson as WorkspaceExport;
export function loadDemoWorkspace(): WorkspaceExport {
  return structuredClone(fixture);
}
