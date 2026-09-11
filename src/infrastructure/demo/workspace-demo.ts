import type { WorkspaceExport } from '../../../contracts/domain';
import workspaceJson from '../../../examples/workspace.demo.json';
import { migrateWorkspaceExport } from '../../domain/workspace/migrate-workspace';

const fixture: WorkspaceExport = migrateWorkspaceExport(workspaceJson);
export function loadDemoWorkspace(): WorkspaceExport {
  return structuredClone(fixture);
}
