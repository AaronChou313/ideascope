import { describe, expect, it, vi } from "vitest";
import { AgentController, type AgentTools } from "../../src/agent/controller";
import type {
  ProviderAdapter,
  ProviderRequest,
} from "../../src/agent/provider-adapter";
import type { AgentRunContext } from "../../src/agent/types";
import { OpenAICompatibleAgentProvider } from "../../src/infrastructure/llm/agent-provider";

const context: AgentRunContext = {
  runId: "run-1",
  workspaceId: "ws-1",
  branchId: "b-1",
  baseRevision: 2,
  promptVersion: "0.1",
  userGoal: "解释已有概念",
  branchSummary: ["已有范围"],
  recentMessages: [{ role: "user", text: "这是什么？" }],
  availableEvidenceIds: ["e-1"],
};
const complete = {
  answer: "直接回答。",
  evidenceIds: ["e-1"],
  limitations: ["仅基于已有摘要"],
  nextQuestions: [],
  toolRequest: null,
};

function mockProvider(
  responses: unknown[],
  structuredOutput = true,
): ProviderAdapter & { requests: ProviderRequest[] } {
  const requests: ProviderRequest[] = [];
  return {
    structuredOutput,
    requests,
    generate: (request) => {
      requests.push(request);
      return Promise.resolve(responses.shift());
    },
  };
}
const emptyTools = (): AgentTools => ({ searchLiterature: vi.fn() });

describe("AgentController", () => {
  it("uses structured output and avoids an unnecessary tool", async () => {
    const provider = mockProvider([complete]);
    const result = await new AgentController(
      provider,
      emptyTools(),
      "system",
    ).run(context, new AbortController().signal);
    expect(result.state).toBe("completed");
    expect(result.usage).toMatchObject({ modelCalls: 1, toolCalls: 0 });
    expect(result.usage.tokens.source).toBe("unknown");
    expect(provider.requests[0]?.mode).toBe("structured");
  });

  it("uses strict JSON fallback with at most one repair", async () => {
    const provider = mockProvider(
      ["not json", JSON.stringify(complete)],
      false,
    );
    const result = await new AgentController(
      provider,
      emptyTools(),
      "system",
    ).run(context, new AbortController().signal);
    expect(result.state).toBe("completed");
    expect(provider.requests).toHaveLength(2);
    expect(provider.requests[1]?.repair).toBe(true);
  });

  it("validates and caps a search before synthesis", async () => {
    const request = {
      ...complete,
      evidenceIds: [],
      toolRequest: {
        name: "search_literature",
        arguments: { query: "reliability evidence", limit: 60 },
      },
    };
    const provider = mockProvider([request, complete]);
    const search = vi
      .fn<AgentTools["searchLiterature"]>()
      .mockResolvedValue({
        paperIds: ["p-1"],
        evidenceIds: [],
        summary: "untrusted",
      });
    const result = await new AgentController(
      provider,
      { searchLiterature: search },
      "system",
    ).run(context, new AbortController().signal);
    expect(search).toHaveBeenCalledWith(
      { query: "reliability evidence", limit: 60 },
      expect.any(AbortSignal),
    );
    expect(result).toMatchObject({
      state: "completed",
      usage: { modelCalls: 2, toolCalls: 1, candidates: 1 },
    });
  });

  it("rejects invalid tools and invented evidence IDs", async () => {
    const invalid = {
      ...complete,
      evidenceIds: ["invented"],
      toolRequest: {
        name: "search_literature",
        arguments: { query: "x", limit: 999 },
      },
    };
    const provider = mockProvider([invalid, invalid]);
    const search = vi.fn<AgentTools["searchLiterature"]>();
    const result = await new AgentController(
      provider,
      { searchLiterature: search },
      "system",
    ).run(context, new AbortController().signal);
    expect(result.state).toBe("failed");
    expect(search).not.toHaveBeenCalled();
  });
});

describe("OpenAI-compatible Agent Provider", () => {
  it("keeps the key in the Authorization header and requests strict output", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(complete) } }],
          usage: { prompt_tokens: 41, completion_tokens: 17 },
        }),
        { status: 200 },
      ),
    );
    const provider = new OpenAICompatibleAgentProvider(
      { baseUrl: "https://provider.example/v1", model: "test-model" },
      () => "secret-test-value",
      true,
      fetcher,
    );
    const output = await provider.generate({
      mode: "structured",
      messages: [{ role: "system", content: "system" }],
      schemaName: "agent_output",
      signal: new AbortController().signal,
    });
    expect(output).toMatchObject({
      value: JSON.stringify(complete),
      usage: { inputTokens: 41, outputTokens: 17, source: "reported" },
    });
    const [input, init] = fetcher.mock.calls[0] ?? [];
    expect(input).toBe("https://provider.example/v1/chat/completions");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer secret-test-value",
    );
    expect(init?.redirect).toBe("error");
    if (typeof init?.body !== "string") throw new Error("Expected JSON body");
    expect(init.body).toContain("json_schema");
  });
});
