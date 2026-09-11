import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { SourceInstallationRepository } from "../../src/infrastructure/storage/source-installation-repository";
import { sourceCredentialStore } from "../../src/infrastructure/secrets/source-credential-store";
import { createBuiltInSourceRegistry } from "../../src/infrastructure/literature/builtin-source-registry";
import { probeLiteratureSource } from "../../src/infrastructure/literature/source-health";
import { BUILTIN_LITERATURE_SOURCE_MANIFESTS } from "../../src/infrastructure/literature/builtin-source-registry";

describe("literature source settings", () => {
  let db: IdeaScopeDatabase;
  beforeEach(() => {
    db = new IdeaScopeDatabase(`source-settings-${crypto.randomUUID()}`);
    sourceCredentialStore.clear();
  });

  it("persists non-secret enabled state and keeps IEEE disabled by default", async () => {
    const repository = new SourceInstallationRepository(db);
    const defaults = await repository.list();
    expect(defaults.find((item) => item.sourceId === "openalex")?.enabled).toBe(true);
    expect(defaults.find((item) => item.sourceId === "ieee-xplore")?.enabled).toBe(false);
    await repository.setEnabled("crossref", false);
    expect((await repository.list()).find((item) => item.sourceId === "crossref")?.enabled).toBe(false);
  });

  it("keeps source credentials out of installations and enables IEEE only at runtime", () => {
    sourceCredentialStore.set("ieee-xplore.api-key", "temporary-source-secret");
    const registry = createBuiltInSourceRegistry({
      getCredential: (slot) => sourceCredentialStore.get(slot),
    });
    expect(registry.getAdapter("ieee-xplore")?.source).toBe("ieee-xplore");
    expect(JSON.stringify(registry.list())).not.toContain("temporary-source-secret");
  });

  it("reports external and unconfigured health without network requests", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const google = BUILTIN_LITERATURE_SOURCE_MANIFESTS.find((item) => item.id === "google-scholar")!;
    const ieee = BUILTIN_LITERATURE_SOURCE_MANIFESTS.find((item) => item.id === "ieee-xplore")!;
    await expect(probeLiteratureSource(google, new AbortController().signal, { fetcher })).resolves.toBe("external");
    await expect(probeLiteratureSource(ieee, new AbortController().signal, { fetcher })).resolves.toBe("unconfigured");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
