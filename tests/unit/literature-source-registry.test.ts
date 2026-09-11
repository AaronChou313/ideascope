import { describe, expect, it, vi } from "vitest";
import { SourceRegistry } from "../../src/application/literature/literature-source-registry";
import type { LiteratureAdapter } from "../../src/domain/search/literature";
import { BUILTIN_LITERATURE_SOURCE_MANIFESTS, createBuiltInSourceRegistry } from "../../src/infrastructure/literature/builtin-source-registry";

describe("literature source registry", () => {
  it("lists all built-in and external sources without credentials", () => {
    const entries = createBuiltInSourceRegistry().list();
    expect(entries.map((entry) => entry.manifest.id)).toEqual([
      "openalex",
      "crossref",
      "semantic-scholar",
      "arxiv",
      "ieee-xplore",
      "google-scholar",
    ]);
    const serialized = JSON.stringify(entries);
    expect(serialized).not.toMatch(/authorization|secret-value|sk-[a-z0-9]/i);
  });

  it("routes capability checks and excludes disabled sources", () => {
    const registry = createBuiltInSourceRegistry({
      disabledSourceIds: ["semantic-scholar"],
    });
    expect(registry.supports("openalex", "search")).toBe("supported");
    expect(registry.supports("missing", "search")).toBe("unknown");
    expect(registry.getAdapter("semantic-scholar")).toBeNull();
    expect(registry.enabledAdapters().map((adapter) => adapter.source)).toEqual([
      "openalex",
      "crossref",
      "arxiv",
    ]);
  });

  it("never creates or executes an adapter for a disabled installation", () => {
    const createAdapter = vi.fn<() => LiteratureAdapter>();
    const manifest = BUILTIN_LITERATURE_SOURCE_MANIFESTS[0];
    const registry = new SourceRegistry().register({
      manifest,
      installation: {
        sourceId: manifest.id,
        enabled: false,
        installedAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        credentialSlot: null,
      },
      createAdapter,
    });
    expect(registry.enabledAdapters()).toEqual([]);
    expect(createAdapter).not.toHaveBeenCalled();
  });
});
