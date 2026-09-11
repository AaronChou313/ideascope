import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectionLab } from "../../src/features/provider-settings/ConnectionLab";
import { memoryKeyStore } from "../../src/infrastructure/secrets/memory-key-store";

afterEach(() => {
  cleanup();
  memoryKeyStore.clear();
  vi.unstubAllGlobals();
});

describe("ConnectionLab capability status", () => {
  it("does not overwrite common draft fields when switching protocols", () => {
    render(<ConnectionLab />);
    fireEvent.change(screen.getByLabelText("Base URL"), { target: { value: "https://custom.example/api" } });
    fireEvent.change(screen.getByLabelText("Model ID"), { target: { value: "custom-model" } });
    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "test-only-key" } });
    fireEvent.change(screen.getByLabelText("Provider Format"), { target: { value: "openai-responses" } });
    fireEvent.change(screen.getByLabelText("Provider Format"), { target: { value: "openai-chat" } });
    expect(screen.getByLabelText("Base URL")).toHaveValue("https://custom.example/api");
    expect(screen.getByLabelText("Model ID")).toHaveValue("custom-model");
    expect(screen.getByLabelText("API Key")).toHaveValue("test-only-key");
  });
  it("shows failed after a request error instead of leaving the capability pending", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: { type: "invalid_request_error", message: "bad input" } }), { status: 400 })));
    render(<ConnectionLab />);
    fireEvent.change(screen.getByLabelText("Model ID"), { target: { value: "test-model" } });
    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "test-only-key" } });
    fireEvent.click(screen.getByRole("button", { name: /普通完成/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /普通完成/ })).toHaveTextContent("测试失败"));
  });

  it("runs all four probes sequentially from the one-click action", async () => {
    const sse = new Response(new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"OK"},"finish_reason":null}]}\n\ndata: [DONE]\n\n'));
      controller.close();
    } }), { status: 200, headers: { "Content-Type": "text/event-stream" } });
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "OK" }, finish_reason: "stop" }] }), { status: 200 }))
      .mockResolvedValueOnce(sse)
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ type: "function", function: { name: "probe_ok", arguments: "{}" } }] }, finish_reason: "tool_calls" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    render(<ConnectionLab />);
    fireEvent.change(screen.getByLabelText("Model ID"), { target: { value: "test-model" } });
    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "test-only-key" } });
    fireEvent.click(screen.getByRole("button", { name: "一键测试四项能力" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("四项能力测试已完成"));
    expect(fetcher).toHaveBeenCalledTimes(4);
    for (const label of ["普通完成", "流式响应", "结构化输出", "工具调用"])
      expect(screen.getByRole("button", { name: new RegExp(label) })).toHaveTextContent("支持");
  });
});
