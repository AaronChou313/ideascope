import type { WorkspaceExport } from "../../../contracts/domain";
import type { LiteratureSourceManifest, SourceInstallation } from "../literature-source/literature-source";
import type { ResearchProfile } from "../research-profile/research-profile";
import type { SearchRecord } from "../search/literature";
import type { RunExecution, RunSummary } from "../../infrastructure/storage/ideascope-database";

export interface WorkspaceArchive {
  documentType: "ideascope.workspace-archive";
  archiveVersion: 1;
  createdWith: string;
  exportedAt: string;
  workspace: WorkspaceExport;
  searchRecords: SearchRecord[];
  runs: { executions: RunExecution[]; summaries: RunSummary[] };
  sessionProfile: ResearchProfile | null;
  baseProfileSnapshots: ResearchProfile[];
  sourceSnapshots: LiteratureSourceManifest[];
  sourceInstallations: SourceInstallation[];
  provenance: { originalWorkspaceId: string; importedAt: string | null };
}
