import type { SourceInstallation } from "../../domain/literature-source/literature-source";
import { BUILTIN_LITERATURE_SOURCE_MANIFESTS } from "../literature/builtin-source-registry";
import { IdeaScopeDatabase, ideaScopeDatabase } from "./ideascope-database";

export class SourceInstallationRepository {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}

  async list() {
    const stored = new Map(
      (await this.db.sourceInstallations.toArray()).map((item) => [item.sourceId, item]),
    );
    return BUILTIN_LITERATURE_SOURCE_MANIFESTS.map(
      (manifest) => stored.get(manifest.id) ?? defaultInstallation(manifest.id),
    );
  }

  async setEnabled(sourceId: string, enabled: boolean) {
    if (!BUILTIN_LITERATURE_SOURCE_MANIFESTS.some((manifest) => manifest.id === sourceId))
      throw new Error("未知文献来源。");
    const current = await this.db.sourceInstallations.get(sourceId);
    const now = new Date().toISOString();
    const installation: SourceInstallation = {
      sourceId,
      enabled,
      installedAt: current?.installedAt ?? now,
      updatedAt: now,
      credentialSlot: current?.credentialSlot ??
        (sourceId === "ieee-xplore" ? "ieee-xplore.api-key" : null),
    };
    await this.db.sourceInstallations.put(installation);
    return installation;
  }
}

function defaultInstallation(sourceId: string): SourceInstallation {
  const now = new Date(0).toISOString();
  return {
    sourceId,
    enabled: sourceId !== "ieee-xplore",
    installedAt: now,
    updatedAt: now,
    credentialSlot: sourceId === "ieee-xplore" ? "ieee-xplore.api-key" : null,
  };
}
