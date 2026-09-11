import { describe, expect, it, vi } from "vitest";
import {
  chatCompletionsUrl,
  normalizeBaseUrl,
  probeProvider,
} from "../../src/infrastructure/llm/openai-compatible";
import { providerUrl } from "../../src/infrastructure/llm/provider-protocol";
import { probeOpenAlex } from "../../src/infrastructure/literature/openalex-probe";
import { ConnectionError } from "../../src/infrastructure/network/errors";

function streamResponse(body: string, contentType = "text/event-stream") {
  const bytes = new TextEncoder().encode(body);
  return new Response(new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }), { status: 200, headers: { "Content-Type": contentType } });
}

async function captureConnectionError(request: Promise<unknown>) {
  try { await request; } catch (error) {
    if (error instanceof ConnectionError) return error;
    throw error;
  }
  throw new Error("Expected ConnectionError");
}

describe("browser connection probes", () => {
  it("normalizes a user base URL without adding a duplicate v1", () => {
    expect(normalizeBaseUrl("https://gateway.example/v1/")).toBe(
      "https://gateway.example/v1",
    );
    expect(chatCompletionsUrl("https://gateway.example/v1")).toBe(
      "https://gateway.example/v1/chat/completions",
    );
    expect(() => normalizeBaseUrl("http://gateway.example/v1")).toThrow(
      "HTTPS",
    );
  });

  it("sends credentials only to the configured origin and reports usage", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "OK" } }],
            usage: { total_tokens: 2 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    });
    const result = await probeProvider(
      { baseUrl: "https://gateway.example/v1", model: "test-model" },
      "test-only-key",
      "completion",
      new AbortController().signal,
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://gateway.example/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-only-key",
    );
    expect(result).toMatchObject({
      state: "supported",
      usageReporting: "supported",
    });
  });

  it("keeps a reasoning-only token-exhausted completion unknown instead of unsupported", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "", reasoning_content: "checking" }, finish_reason: "length" }],
      usage: { prompt_tokens: 9, completion_tokens: 64 },
    }), { status: 200 }));
    const result = await probeProvider(
      { format: "openai-chat", baseUrl: "https://api.deepseek.com", model: "deepseek-reasoner" },
      "test-only-key", "completion", new AbortController().signal, fetcher,
    );
    expect(result.state).toBe("unknown");
    expect(result.detail).toContain("输出 token 用尽");
    const rawBody = fetcher.mock.calls[0]?.[1]?.body;
    if (typeof rawBody !== "string") throw new Error("Expected JSON body");
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    expect(body.max_tokens).toBe(64);
    expect(body.thinking).toEqual({ type: "disabled" });
  });

  it("marks HTTP 200 with empty final content as failed, not unsupported", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "" }, finish_reason: "stop" }] }), { status: 200 }));
    const result = await probeProvider({ baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "completion", new AbortController().signal, fetcher);
    expect(result.state).toBe("failed");
    expect(result.detail).toContain("最终文本为空");
  });

  it("parses a complete Chat SSE stream with a model delta and terminator", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(streamResponse([
      'data: {"choices":[{"delta":{"content":"OK"},"finish_reason":null}]}',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
      'data: [DONE]', '',
    ].join("\n\n")));
    const result = await probeProvider({ baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "streaming", new AbortController().signal, fetcher);
    expect(result.state).toBe("supported");
    expect(result.detail).toContain("合法终止事件");
  });

  it("rejects a non-stream body and a stream without model output events", async () => {
    const plain = vi.fn<typeof fetch>().mockResolvedValue(streamResponse('{"choices":[]}', "application/json"));
    await expect(probeProvider({ baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "streaming", new AbortController().signal, plain)).rejects.toMatchObject({ code: "invalid_response" });
    const noOutput = vi.fn<typeof fetch>().mockResolvedValue(streamResponse('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'));
    await expect(probeProvider({ baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "streaming", new AbortController().signal, noOutput)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("uses json_object rather than forcing json_schema for compatible Chat providers", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }] }), { status: 200 }));
    await probeProvider({ format: "openai-chat", baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "structuredOutput", new AbortController().signal, fetcher);
    const rawBody = fetcher.mock.calls[0]?.[1]?.body;
    if (typeof rawBody !== "string") throw new Error("Expected JSON body");
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it.each([
    ["not json", "JSON 解析失败"],
    ['{"ok":false}', "schema 校验失败"],
    ['{"ok":true,"extra":1}', "additionalProperties 校验失败"],
  ])("does not support malformed structured output: %s (%s)", async (content) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: "stop" }] }), { status: 200 }));
    await expect(probeProvider({ baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "structuredOutput", new AbortController().signal, fetcher)).resolves.toMatchObject({ state: "unsupported" });
  });

  it("validates the expected tool name and JSON arguments", async () => {
    const valid = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ type: "function", function: { name: "probe_ok", arguments: "{}" } }] }, finish_reason: "tool_calls" }] }), { status: 200 }));
    await expect(probeProvider({ baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "toolCalling", new AbortController().signal, valid)).resolves.toMatchObject({ state: "supported" });
    const invalid = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ type: "function", function: { name: "wrong_tool", arguments: "not-json" } }] }, finish_reason: "tool_calls" }] }), { status: 200 }));
    await expect(probeProvider({ baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "toolCalling", new AbortController().signal, invalid)).resolves.toMatchObject({ state: "unsupported" });
  });

  it("builds and parses an OpenAI Responses API probe", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "OK" }] }], usage: { input_tokens: 2, output_tokens: 1 } }), { status: 200 }));
    const result = await probeProvider({ format: "openai-responses", baseUrl: "https://api.openai.com/v1", model: "gpt-test" }, "test-only-key", "completion", new AbortController().signal, fetcher);
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/responses");
    expect(result.state).toBe("supported");
  });

  it("builds and parses an Anthropic Messages tool probe", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "tool_use", name: "probe_ok", input: {} }], stop_reason: "tool_use", usage: { input_tokens: 3, output_tokens: 2 } }), { status: 200 }));
    const result = await probeProvider({ format: "anthropic-messages", baseUrl: "https://api.anthropic.com", model: "claude-test" }, "test-only-key", "toolCalling", new AbortController().signal, fetcher);
    const init = fetcher.mock.calls[0]?.[1];
    expect(providerUrl({ format: "anthropic-messages", baseUrl: "https://api.anthropic.com", model: "x" })).toBe("https://api.anthropic.com/v1/messages");
    expect(new Headers(init?.headers).get("x-api-key")).toBe("test-only-key");
    expect(new Headers(init?.headers).get("Authorization")).toBeNull();
    expect(result.state).toBe("supported");
  });

  it.each([[404, "not_found"], [400, "incompatible_request"]] as const)("classifies provider HTTP %s details", async (status, code) => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: { message: "bad request" } }), { status })));
    await expect(probeProvider({ format: "openai-responses", baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "completion", new AbortController().signal, fetcher)).rejects.toMatchObject({ code, status });
  });

  it("keeps an HTTP 400 capability request as failed and exposes redacted diagnostics", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: { message: "response_format is unsupported" } }), { status: 400 }));
    const error = await captureConnectionError(probeProvider({ format: "openai-responses", baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "structuredOutput", new AbortController().signal, fetcher));
    expect(error.code).toBe("incompatible_request");
    expect(error.message).toContain("HTTP 400");
  });

  it("extracts safe type/code/message for an HTTP 400 tool parameter error", async () => {
    const sensitive = "sk-" + "secretshouldberemoved";
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: { type: "invalid_request_error", code: "unsupported_parameter", message: `Unsupported parameter: tool_choice; ${sensitive}` } }), { status: 400 }));
    const error = await captureConnectionError(probeProvider({ format: "openai-responses", baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "toolCalling", new AbortController().signal, fetcher));
    expect(error.code).toBe("unsupported_parameter");
    expect(error.message).toContain("invalid_request_error");
    expect(error.message).not.toContain(sensitive);
  });

  it("distinguishes a missing model from a missing endpoint", async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: { message: "Model does not exist" } }), { status: 404 })));
    await expect(probeProvider({ baseUrl: "https://gateway.example/v1", model: "missing" }, "test-only-key", "completion", new AbortController().signal, fetcher)).rejects.toMatchObject({ code: "model_not_found" });
  });

  it("classifies 401 without exposing response content", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response("secret response", { status: 401 })),
    );
    await expect(
      probeProvider(
        { baseUrl: "https://gateway.example/v1", model: "test" },
        "test-only-key",
        "completion",
        new AbortController().signal,
        fetcher,
      ),
    ).rejects.toMatchObject({ code: "unauthorized", status: 401 });
  });

  it.each([
    [403, "forbidden"],
    [429, "rate_limited"],
  ] as const)("classifies HTTP %s", async (status, code) => {
    const fetcher = vi.fn(() => Promise.resolve(new Response("", { status })));
    await expect(
      probeProvider(
        { baseUrl: "https://gateway.example/v1", model: "test" },
        "test-only-key",
        "completion",
        new AbortController().signal,
        fetcher,
      ),
    ).rejects.toMatchObject({ code, status });
  });

  it("normalizes an OpenAlex response", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            meta: { count: 42 },
            results: [{ title: "A Paper" }],
          }),
          { status: 200 },
        ),
      ),
    );
    await expect(
      probeOpenAlex(new AbortController().signal, fetcher),
    ).resolves.toMatchObject({ count: 42, firstTitle: "A Paper" });
  });

  it("rejects a missing key before a request is sent", async () => {
    const fetcher = vi.fn();
    await expect(
      probeProvider(
        { baseUrl: "https://gateway.example/v1", model: "test" },
        "",
        "completion",
        new AbortController().signal,
        fetcher,
      ),
    ).rejects.toBeInstanceOf(ConnectionError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("preserves cancellation as a distinct outcome", async () => {
    const fetcher = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const controller = new AbortController();
    const request = probeProvider(
      { baseUrl: "https://gateway.example/v1", model: "test" },
      "test-only-key",
      "completion",
      controller.signal,
      fetcher,
    );
    controller.abort();
    await expect(request).rejects.toMatchObject({ code: "cancelled" });
  });

});
