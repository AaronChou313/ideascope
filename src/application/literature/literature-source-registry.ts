import type { LiteratureAdapter } from "../../domain/search/literature";
import {
  literatureSourceManifestSchema,
  type LiteratureSourceManifest,
  type SourceCapabilities,
  type SourceInstallation,
} from "../../domain/literature-source/literature-source";

export type LiteratureSourceRegistration = {
  manifest: LiteratureSourceManifest;
  installation: SourceInstallation;
  createAdapter?: () => LiteratureAdapter;
};

export class SourceRegistry {
  private readonly registrations = new Map<string, LiteratureSourceRegistration>();

  register(registration: LiteratureSourceRegistration) {
    const manifest = literatureSourceManifestSchema.parse(registration.manifest);
    if (manifest.id !== registration.installation.sourceId)
      throw new Error("文献来源安装记录与清单 ID 不一致。");
    if (this.registrations.has(manifest.id))
      throw new Error(`文献来源 ${manifest.id} 已注册。`);
    this.registrations.set(manifest.id, { ...registration, manifest });
    return this;
  }

  list() {
    return [...this.registrations.values()].map(({ manifest, installation }) => ({
      manifest,
      installation,
    }));
  }

  supports(sourceId: string, capability: keyof SourceCapabilities) {
    return this.registrations.get(sourceId)?.manifest.capabilities[capability] ?? "unknown";
  }

  getAdapter(sourceId: string) {
    const registration = this.registrations.get(sourceId);
    if (!registration?.installation.enabled || !registration.createAdapter)
      return null;
    return registration.createAdapter();
  }

  enabledAdapters(sourceIds?: readonly string[]) {
    const ids = sourceIds ?? [...this.registrations.keys()];
    return ids.flatMap((id) => {
      const adapter = this.getAdapter(id);
      return adapter ? [adapter] : [];
    });
  }
}
