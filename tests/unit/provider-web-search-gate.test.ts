import { describe, expect, it } from "vitest";
import { providerWebSearchGate, type SavedProviderProfile } from "../../src/domain/provider/provider-profile";

const profile = (webSearchState?: SavedProviderProfile["webSearchState"]): SavedProviderProfile => ({
  id: "active", active: true, name: "DeepSeek", providerType: "deepseek", format: "openai-chat",
  baseUrl: "https://api.deepseek.com/v1", model: "deepseek-web-search", lastTestState: "supported", lastTestedAt: null,
  updatedAt: "2026-01-01T00:00:00.000Z", ...(webSearchState ? { webSearchState } : {}),
});

describe("Provider Web Search gate", () => {
  it("does not infer capability from provider or model names", () => {
    expect(providerWebSearchGate(profile()).allowed).toBe(false);
    expect(providerWebSearchGate(profile("unknown")).allowed).toBe(false);
  });

  it("opens only for an explicitly supported provider or independent source", () => {
    expect(providerWebSearchGate(profile("supported"))).toMatchObject({ allowed: true });
    expect(providerWebSearchGate(null, true)).toMatchObject({ allowed: true });
  });
});
