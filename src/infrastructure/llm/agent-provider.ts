import {
  classifyResponse,
  ConnectionError,
  normalizeConnectionError,
} from "../network/errors";
import { chatCompletionsUrl } from "./openai-compatible";
import type { ProviderConfig } from "./types";
import type {
  ProviderAdapter,
  ProviderRequest,
} from "../../agent/provider-adapter";

const outputJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    evidenceIds: { type: "array", items: { type: "string" }, maxItems: 20 },
    limitations: { type: "array", items: { type: "string" }, maxItems: 8 },
    nextQuestions: { type: "array", items: { type: "string" }, maxItems: 3 },
    toolRequest: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { const: "search_literature" },
            arguments: {
              type: "object",
              additionalProperties: false,
              properties: {
                query: { type: "string", minLength: 2, maxLength: 1000 },
                limit: { type: "integer", minimum: 1, maximum: 60 },
              },
              required: ["query", "limit"],
            },
          },
          required: ["name", "arguments"],
        },
      ],
    },
  },
  required: [
    "answer",
    "evidenceIds",
    "limitations",
    "nextQuestions",
    "toolRequest",
  ],
} as const;

export class OpenAICompatibleAgentProvider implements ProviderAdapter {
  constructor(
    private readonly config: ProviderConfig,
    private readonly getKey: () => string,
    readonly structuredOutput: boolean,
    private readonly fetcher: typeof fetch = (input, init) =>
      fetch(input, init),
  ) {}
  async generate(request: ProviderRequest): Promise<unknown> {
    const key = this.getKey();
    if (!key)
      throw new ConnectionError(
        "unauthorized",
        "API Key 仅保存在内存中，当前为空。",
      );
    const messages = request.repair
      ? [
          ...request.messages,
          {
            role: "user" as const,
            content:
              "上一次输出未通过严格校验。只返回符合给定结构的完整 JSON；不要添加 Markdown。",
          },
        ]
      : request.messages;
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      max_tokens: 1600,
      stream: false,
    };
    if (request.mode === "structured")
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: request.schemaName,
          strict: true,
          schema: outputJsonSchema,
        },
      };
    else
      messages[0] = {
        ...messages[0]!,
        content: `${messages[0]!.content}\n只返回符合 IdeaScope AgentOutput 契约的 JSON，不要 Markdown。`,
      };
    try {
      const response = await this.fetcher(
        chatCompletionsUrl(this.config.baseUrl),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(body),
          signal: request.signal,
        },
      );
      if (!response.ok) throw classifyResponse(response.status);
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string")
        throw new ConnectionError(
          "invalid_response",
          "Provider 未返回文本结构。",
        );
      return content;
    } catch (error) {
      throw normalizeConnectionError(error);
    }
  }
}
