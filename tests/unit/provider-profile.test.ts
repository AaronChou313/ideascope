import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { startExploration } from "../../src/application/exploration/start-exploration";
import { ProviderProfileRepository } from "../../src/infrastructure/storage/provider-profile-repository";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { memoryKeyStore } from "../../src/infrastructure/secrets/memory-key-store";

const draft = { name: "Custom", providerType: "custom" as const, format: "openai-chat" as const, baseUrl: "https://provider.example/v1", model: "model-1" };

afterEach(() => memoryKeyStore.clear());

describe("saved active provider", () => {
  it("persists only non-sensitive configuration and restores the active profile", async () => {
    const db = new IdeaScopeDatabase(`provider-${crypto.randomUUID()}`);
    const repository = new ProviderProfileRepository(db);
    await repository.saveActive(draft, { state: "supported", testedAt: "2026-09-11T00:00:00.000Z" });
    const restored = await repository.getActive();
    expect(restored).toMatchObject({ ...draft, active: true, lastTestState: "supported" });
    expect(JSON.stringify(restored)).not.toContain("apiKey");
    await db.delete();
  });

  it("requires both a saved profile and the current in-memory key before creating", async () => {
    const provider = { getActive: () => Promise.resolve(undefined) };
    const save = () => Promise.resolve({ status: "saved" as const, updatedAt: "now" });
    await expect(startExploration("idea", provider, { save })).resolves.toEqual({ status: "needs_provider", reason: "missing_profile" });
    const active = { id: "active", active: true, lastTestState: "unknown" as const, lastTestedAt: null, updatedAt: "now", ...draft };
    await expect(startExploration("idea", { getActive: () => Promise.resolve(active) }, { save })).resolves.toEqual({ status: "needs_provider", reason: "missing_session_key" });
    memoryKeyStore.set("test-only-key");
    await expect(startExploration("idea", { getActive: () => Promise.resolve(active) }, { save })).resolves.toMatchObject({ status: "started" });
  });
});
