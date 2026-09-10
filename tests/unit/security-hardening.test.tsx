import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import attacks from "../../examples/security-attacks.fixture.json";
import { DiagnosticExporter } from "../../src/infrastructure/export/diagnostic-export";
import { normalizeBaseUrl } from "../../src/infrastructure/llm/openai-compatible";
import { memoryKeyStore } from "../../src/infrastructure/secrets/memory-key-store";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { LocalDataService } from "../../src/infrastructure/storage/local-data-service";
import { SafeRichText } from "../../src/shared/ui/SafeRichText";

const databases: IdeaScopeDatabase[] = [];
function database() { const db = new IdeaScopeDatabase(`security-${crypto.randomUUID()}`); databases.push(db); return db; }
afterEach(async () => Promise.all(databases.splice(0).map((db) => db.delete())));

describe("untrusted rendering and endpoints", () => {
  it("renders HTML, markdown images and javascript links as inert text", () => {
    const text = `${attacks.html} ${attacks.markdownImage} ${attacks.javascriptLink}`;
    const { container } = render(<SafeRichText text={text} />);
    expect(container.querySelector("script,img")).toBeNull();
    expect(screen.getByText(/globalThis.pwned/)).toBeVisible();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(container.querySelector('img[src^="https:"]')).toBeNull();
  });
  it("requires HTTPS remotely and forbids credentials embedded in Provider URLs", () => {
    expect(() => normalizeBaseUrl("http://provider.example/v1")).toThrow(/HTTPS/);
    expect(() => normalizeBaseUrl("https://user:pass@provider.example/v1")).toThrow(/凭证/);
    expect(normalizeBaseUrl("http://localhost:1234/v1?key=no#x")).toBe("http://localhost:1234/v1");
  });
});

describe("diagnostics and destructive local cleanup", () => {
  it("exports only redacted diagnostic fields", async () => {
    const db = database();
    await db.searchRecords.add({ id: "s", source: "openalex", status: "completed", startedAt: "a", endedAt: "b", query: { originalIdea: "private query", keywords: "private query", language: "en", rationale: "private" }, cacheKey: "private-cache", resultCount: 0, totalAvailable: 0, pagesFetched: 1, diagnostic: { endpoint: "https://api.openalex.org/works", httpStatus: 200, rateLimitRemaining: null, rateLimitResetSeconds: null, requestCostUsd: null, errorCode: null } });
    const json = JSON.stringify(await new DiagnosticExporter(db).collect());
    expect(json).not.toContain("private query");
    expect(json).not.toContain("private-cache");
    expect(json).toContain("api.openalex.org/works");
  });
  it("requires exact confirmation and clears tables plus the memory key", async () => {
    const db = database();
    await db.workspaces.add({ id: "ws", title: "x", seedIdea: "x", activeBranchId: "b", branchIds: [], paperIds: [], evidenceIds: [], messageIds: [], runIds: [], isDemo: false, createdAt: "a", updatedAt: "a", archivedAt: null });
    memoryKeyStore.set("temporary-secret");
    const service = new LocalDataService(db);
    await expect(service.clearAll("wrong")).rejects.toThrow(/确认/);
    expect(await db.workspaces.count()).toBe(1);
    await service.clearAll("清除全部数据");
    expect(await db.workspaces.count()).toBe(0);
    expect(memoryKeyStore.get()).toBe("");
  });
});
