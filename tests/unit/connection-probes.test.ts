import { describe, expect, it, vi } from "vitest";
import {
  chatCompletionsUrl,
  normalizeBaseUrl,
  probeProvider,
} from "../../src/infrastructure/llm/openai-compatible";
import { providerUrl } from "../../src/infrastructure/llm/provider-protocol";
import { probeOpenAlex } from "../../src/infrastructure/literature/openalex-probe";
import { ConnectionError } from "../../src/infrastructure/network/errors";

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

  it("accepts a DeepSeek reasoning-only completion without the old four-token false failure", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "", reasoning_content: "checking" }, finish_reason: "length" }],
      usage: { prompt_tokens: 9, completion_tokens: 64 },
    }), { status: 200 }));
    const result = await probeProvider(
      { format: "openai-chat", baseUrl: "https://api.deepseek.com", model: "deepseek-reasoner" },
      "test-only-key", "completion", new AbortController().signal, fetcher,
    );
    expect(result.state).toBe("supported");
    expect(result.detail).toContain("reasoning_content");
    const rawBody = fetcher.mock.calls[0]?.[1]?.body;
    if (typeof rawBody !== "string") throw new Error("Expected JSON body");
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    expect(body.max_tokens).toBe(64);
    expect(body.thinking).toEqual({ type: "disabled" });
  });

  it("uses json_object rather than forcing json_schema for compatible Chat providers", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }] }), { status: 200 }));
    await probeProvider({ format: "openai-chat", baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "structuredOutput", new AbortController().signal, fetcher);
    const rawBody = fetcher.mock.calls[0]?.[1]?.body;
    if (typeof rawBody !== "string") throw new Error("Expected JSON body");
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    expect(body.response_format).toEqual({ type: "json_object" });
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

  it("reports a rejected optional capability as unsupported rather than a connection failure", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: { message: "response_format is unsupported" } }), { status: 400 }));
    await expect(probeProvider({ format: "openai-responses", baseUrl: "https://gateway.example/v1", model: "test" }, "test-only-key", "structuredOutput", new AbortController().signal, fetcher)).resolves.toMatchObject({ state: "unsupported" });
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
