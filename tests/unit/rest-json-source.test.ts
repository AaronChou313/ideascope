import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import type { LiteratureSourceManifest } from "../../src/domain/literature-source/literature-source";
import { RestJsonLiteratureAdapter, validateRestJsonManifest } from "../../src/infrastructure/literature/rest-json";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { SourceManifestRepository } from "../../src/infrastructure/storage/source-manifest-repository";
import { SourceInstallationRepository } from "../../src/infrastructure/storage/source-installation-repository";

const manifest: LiteratureSourceManifest = {
  documentType: "ideascope.literature-source", manifestVersion: 1, id: "custom-papers", name: "Custom Papers", description: "test",
  adapter: { kind: "rest-json", baseUrl: "https://papers.example.test", search: { path: "/api/search", method: "GET", queryParameter: "query", itemsPath: "data.items", fields: { externalId: "id", title: "title", authors: "authors", abstract: "summary", year: "year", venue: "journal", doi: "doi", url: "url" } } },
  auth: { kind: "api-key-header", credentialSlot: "custom-papers.api-key", headerName: "X-API-Key" },
  capabilities: { search: "supported", abstract: "supported", citations: "unsupported", references: "unsupported", venueFilter: "unsupported", yearFilter: "unsupported", authorFilter: "unsupported", fullText: "unsupported", directLookup: "unsupported" },
  metadata: { homepage: "https://papers.example.test" },
};
const query = { originalIdea: "机器人定位", keywords: "robot localization", language: "en", rationale: "translated query" };
const searchOptions = { limit: 5, maxPages: 1, fields: [] };

describe("Custom REST JSON Source", () => {
  it("maps declared fields and sends credentials only to the configured origin", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: { items: [{ id: "p1", title: "Robot Localization", authors: ["A"], summary: "Abstract", year: 2025, journal: "RA-L", doi: "10.1000/test", url: "https://paper.test" }] } }), { status: 200 }));
    const adapter = new RestJsonLiteratureAdapter(manifest, { fetcher, getCredential: () => "test-secret" });
    const result = await adapter.search(query, searchOptions, new AbortController().signal);
    expect(result.record.status).toBe("completed");
    expect(result.papers[0]).toMatchObject({ title: "Robot Localization", venue: "RA-L", externalIds: { doi: "10.1000/test" } });
    const [input, init] = fetcher.mock.calls[0]!;
    const requested = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    expect(new URL(requested).origin).toBe("https://papers.example.test");
    expect(new Headers(init?.headers).get("X-API-Key")).toBe("test-secret");
    expect(result.record.diagnostic.endpoint).toBe("https://papers.example.test/api/search");
  });

  it("rejects unsafe URLs, traversal, field expressions and forbidden headers", () => {
    if (manifest.adapter.kind !== "rest-json") throw new Error("test manifest mismatch");
    const adapter = manifest.adapter;
    expect(() => validateRestJsonManifest({ ...manifest, adapter: { ...adapter, baseUrl: "http://private.example.test" } })).toThrow("HTTPS");
    expect(() => validateRestJsonManifest({ ...manifest, adapter: { ...adapter, search: { ...adapter.search, path: "/../secret" } } })).toThrow("Search path");
    expect(() => validateRestJsonManifest({ ...manifest, adapter: { ...adapter, search: { ...adapter.search, fields: { ...adapter.search.fields, title: "constructor.value" } } } })).toThrow("不安全路径");
    expect(() => validateRestJsonManifest({ ...manifest, auth: { kind: "api-key-header", credentialSlot: "slot", headerName: "Cookie" } })).toThrow("Header");
  });

  it("persists imported manifests disabled and rejects collisions", async () => {
    const db = new IdeaScopeDatabase(`custom-source-${crypto.randomUUID()}`);
    const manifests = new SourceManifestRepository(db);
    await manifests.install(manifest);
    const installations = new SourceInstallationRepository(db);
    expect((await installations.list()).find((item) => item.sourceId === manifest.id)?.enabled).toBe(false);
    await expect(manifests.install({ ...manifest, name: "Changed" })).rejects.toThrow("内容不同");
    await db.delete();
  });
});
