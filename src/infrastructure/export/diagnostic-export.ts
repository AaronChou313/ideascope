import { IdeaScopeDatabase, ideaScopeDatabase } from "../storage/ideascope-database";
import { ProviderProfileRepository } from "../storage/provider-profile-repository";

export class DiagnosticExporter {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}
  async collect() {
    const [searches, runs, workspaces, provider] = await Promise.all([this.db.searchRecords.toArray(), this.db.runExecutions.toArray(), this.db.workspaces.count(), new ProviderProfileRepository(this.db).getActive()]);
    const recentError = [...runs].reverse().map((run) => run.error).find((error): error is string => typeof error === "string") ?? null;
    return {
      documentType: "ideascope.diagnostics",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: "0.6.4",
      browser: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
      storage: { indexedDb: typeof indexedDB !== "undefined", workspaceCount: workspaces },
      provider: provider ? { providerType: provider.providerType, format: provider.format, modelConfigured: Boolean(provider.model), lastTestState: provider.lastTestState } : null,
      literature: { openAlex: searches.length ? "used" : "not_tested", lastStatus: searches.at(-1)?.status ?? null },
      recentError: recentError?.slice(0, 240) ?? null,
      excluded: ["credentials", "authorization", "request URLs", "queries", "prompts", "responses", "messages"],
    };
  }
}
