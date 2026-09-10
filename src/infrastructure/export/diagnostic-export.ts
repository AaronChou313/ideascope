import { IdeaScopeDatabase, ideaScopeDatabase } from "../storage/ideascope-database";

export class DiagnosticExporter {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}
  async collect() {
    const [searches, runs] = await Promise.all([this.db.searchRecords.toArray(), this.db.runExecutions.toArray()]);
    return {
      documentType: "ideascope.diagnostics",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      searches: searches.map(({ source, status, startedAt, endedAt, resultCount, diagnostic }) => ({ source, status, startedAt, endedAt, resultCount, diagnostic })),
      runs: runs.map(({ id, workspaceId, branchId, status, states, startedAt, endedAt, usage, error }) => ({ id, workspaceId, branchId, status, states, startedAt, endedAt, usage, error })),
      excluded: ["credentials", "authorization", "request URLs", "queries", "prompts", "responses", "messages"],
    };
  }
}
