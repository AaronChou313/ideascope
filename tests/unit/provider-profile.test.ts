import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { ProviderProfileRepository } from "../../src/infrastructure/storage/provider-profile-repository";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { memoryKeyStore } from "../../src/infrastructure/secrets/memory-key-store";

const draft = {
  name: "Custom",
  providerType: "custom" as const,
  format: "openai-chat" as const,
  baseUrl: "https://provider.example/v1",
  model: "model-1",
};

afterEach(() => memoryKeyStore.clear());

describe("saved active provider", () => {
  it("keeps the API key in session storage so a page refresh can restore it", () => {
    memoryKeyStore.set("session-only-secret");
    expect(sessionStorage.getItem("ideascope.provider.api-key")).toBe(
      "session-only-secret",
    );
    memoryKeyStore.clear();
    expect(sessionStorage.getItem("ideascope.provider.api-key")).toBeNull();
  });
  it("persists only non-sensitive configuration and restores the active profile", async () => {
    const db = new IdeaScopeDatabase(`provider-${crypto.randomUUID()}`);
    const repository = new ProviderProfileRepository(db);
    await repository.saveActive(draft, {
      state: "supported",
      testedAt: "2026-09-11T00:00:00.000Z",
    });
    const restored = await repository.getActive();
    expect(restored).toMatchObject({
      ...draft,
      active: true,
      lastTestState: "supported",
    });
    expect(JSON.stringify(restored)).not.toContain("apiKey");
    await db.delete();
  });

  it("stores multiple profiles while enforcing a single active provider", async () => {
    const db = new IdeaScopeDatabase(`provider-list-${crypto.randomUUID()}`);
    const repository = new ProviderProfileRepository(db);
    const first = await repository.saveProfile(draft, { activate: true });
    const second = await repository.saveProfile({ ...draft, name: "Second", model: "model-2" });
    expect(await repository.list()).toHaveLength(2);
    expect((await repository.getActive())?.id).toBe(first.id);
    await repository.setActive(second.id);
    const profiles = await repository.list();
    expect(profiles.filter((profile) => profile.active)).toHaveLength(1);
    expect((await repository.getActive())?.id).toBe(second.id);
    await db.delete();
  });

  it("keeps session keys isolated by provider profile", () => {
    memoryKeyStore.set("key-a", "provider-a");
    memoryKeyStore.set("key-b", "provider-b");
    memoryKeyStore.activate("provider-b");
    expect(memoryKeyStore.get("provider-a")).toBe("key-a");
    expect(memoryKeyStore.get()).toBe("key-b");
  });
});
