import { describe, expect, it, vi } from "vitest";
import type { ProviderAdapter } from "../../src/agent/provider-adapter";
import { proposeSourceConfiguration } from "../../src/application/literature/propose-source-configuration";
import { BUILTIN_LITERATURE_SOURCE_MANIFESTS } from "../../src/infrastructure/literature/builtin-source-registry";

describe("Source Assistant", () => {
  it("accepts a valid built-in-only proposal", async () => {
    const provider: ProviderAdapter = { structuredOutput: false, generate: vi.fn(() => Promise.resolve(JSON.stringify({
      proposalVersion: 1, requestSummary: "机器人定位", recommendations: [
        { action: "use_builtin", sourceId: "openalex", reason: "跨学科覆盖", missingInputs: [] },
        { action: "configure_builtin", sourceId: "ieee-xplore", reason: "覆盖 IEEE venue", missingInputs: ["IEEE Xplore API Key"] },
      ], warnings: ["IEEE 需要用户凭证"],
    }))) };
    const proposal = await proposeSourceConfiguration({ requirement: "我做机器人定位", manifests: BUILTIN_LITERATURE_SOURCE_MANIFESTS, provider, signal: new AbortController().signal });
    expect(proposal.recommendations.map((item) => item.sourceId)).toEqual(["openalex", "ieee-xplore"]);
  });

  it("rejects invented source IDs after one repair attempt", async () => {
    const generate = vi.fn(() => Promise.resolve(JSON.stringify({
      proposalVersion: 1, requestSummary: "需求", recommendations: [{ action: "propose_custom_manifest", sourceId: "invented", reason: "猜测", missingInputs: [] }], warnings: [],
    })));
    const provider: ProviderAdapter = { structuredOutput: false, generate };
    await expect(proposeSourceConfiguration({ requirement: "需求", manifests: BUILTIN_LITERATURE_SOURCE_MANIFESTS, provider, signal: new AbortController().signal })).rejects.toThrow("未通过安全校验");
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
