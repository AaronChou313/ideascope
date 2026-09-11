import { classifyProviderResponse, ConnectionError, normalizeConnectionError } from '../network/errors';
import type { ProviderAdapter, ProviderRequest } from '../../agent/provider-adapter';
import { providerHeaders, providerUrl } from './provider-protocol';
import type { ProviderConfig, ProviderFormat } from './types';

const outputJsonSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    answer: { type: 'string' }, evidenceIds: { type: 'array', items: { type: 'string' }, maxItems: 20 },
    limitations: { type: 'array', items: { type: 'string' }, maxItems: 8 }, nextQuestions: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    toolRequest: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, properties: { name: { const: 'search_literature' }, arguments: { type: 'object', additionalProperties: false, properties: { query: { type: 'string', minLength: 2, maxLength: 1000 }, limit: { type: 'integer', minimum: 1, maximum: 60 } }, required: ['query', 'limit'] } }, required: ['name', 'arguments'] }] },
  }, required: ['answer', 'evidenceIds', 'limitations', 'nextQuestions', 'toolRequest'],
} as const;

function withJsonInstruction(messages: ProviderRequest['messages'], repair?: boolean, custom?: string) {
  const instruction = repair
    ? '上一次输出未通过严格校验。只返回符合给定结构的完整 JSON；不要添加 Markdown。'
    : custom ?? '只返回符合 IdeaScope AgentOutput 契约的 JSON，不要 Markdown。';
  return [...messages, { role: 'user' as const, content: instruction }];
}

function usage(data: Record<string, unknown>, format: ProviderFormat) {
  const raw = data.usage as Record<string, unknown> | undefined;
  const input = format === 'anthropic-messages' ? raw?.input_tokens : raw?.input_tokens ?? raw?.prompt_tokens;
  const output = format === 'anthropic-messages' ? raw?.output_tokens : raw?.output_tokens ?? raw?.completion_tokens;
  const reported = typeof input === 'number' && typeof output === 'number';
  return { inputTokens: reported ? input : null, outputTokens: reported ? output : null, source: reported ? 'reported' as const : 'unknown' as const };
}

function responseText(data: Record<string, unknown>, format: ProviderFormat): string {
  if (format === 'openai-chat') {
    const choices = data.choices as Array<{ message?: { content?: unknown } }> | undefined;
    const value = choices?.[0]?.message?.content;
    if (typeof value === 'string') return value;
  } else if (format === 'openai-responses') {
    if (typeof data.output_text === 'string') return data.output_text;
    const output = data.output as Array<{ type?: string; content?: Array<{ type?: string; text?: unknown }> }> | undefined;
    const value = output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text;
    if (typeof value === 'string') return value;
  } else {
    const content = data.content as Array<{ type?: string; text?: unknown }> | undefined;
    const value = content?.find((item) => item.type === 'text')?.text;
    if (typeof value === 'string') return value;
  }
  throw new ConnectionError('invalid_response', 'Provider 返回格式异常：未找到文本输出。');
}

abstract class ProtocolAgentProvider implements ProviderAdapter {
  abstract readonly format: ProviderFormat;
  constructor(
    protected readonly config: ProviderConfig,
    private readonly getKey: () => string,
    readonly structuredOutput: boolean,
    private readonly fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {}
  protected abstract body(request: ProviderRequest): Record<string, unknown>;
  async generate(request: ProviderRequest): Promise<unknown> {
    const key = this.getKey();
    if (!key) throw new ConnectionError('unauthorized', 'API Key 仅保存在内存中，当前为空。');
    const config = { ...this.config, format: this.format };
    try {
      const response = await this.fetcher(providerUrl(config), {
        method: 'POST', headers: providerHeaders(this.format, key), body: JSON.stringify(this.body(request)),
        signal: request.signal, redirect: 'error',
      });
      if (!response.ok) throw await classifyProviderResponse(response);
      const data = await response.json() as Record<string, unknown>;
      return { value: responseText(data, this.format), usage: usage(data, this.format) };
    } catch (error) { throw normalizeConnectionError(error); }
  }
}

export class OpenAIChatCompletionsProvider extends ProtocolAgentProvider {
  readonly format = 'openai-chat' as const;
  protected body(request: ProviderRequest) {
    const messages = withJsonInstruction(request.messages, request.repair, request.jsonInstruction);
    const body: Record<string, unknown> = { model: this.config.model, messages, max_tokens: 1600, stream: false };
    // JSON object is the broadly compatible Chat Completions mode. Strict schema
    // support is not assumed for DeepSeek or arbitrary compatible providers.
    if (request.mode === 'structured') body.response_format = { type: 'json_object' };
    return body;
  }
}

export class OpenAIResponsesProvider extends ProtocolAgentProvider {
  readonly format = 'openai-responses' as const;
  protected body(request: ProviderRequest) {
    const messages = withJsonInstruction(request.messages, request.repair, request.jsonInstruction);
    const body: Record<string, unknown> = { model: this.config.model, input: messages, max_output_tokens: 1600 };
    if (request.mode === 'structured') body.text = { format: { type: 'json_schema', name: request.schemaName, strict: true, schema: request.outputSchema ?? outputJsonSchema } };
    return body;
  }
}

export class AnthropicMessagesProvider extends ProtocolAgentProvider {
  readonly format = 'anthropic-messages' as const;
  protected body(request: ProviderRequest) {
    const all = withJsonInstruction(request.messages, request.repair, request.jsonInstruction);
    const system = all.filter((item) => item.role === 'system').map((item) => item.content).join('\n');
    const messages = all.filter((item) => item.role !== 'system');
    return { model: this.config.model, ...(system ? { system } : {}), messages, max_tokens: 1600 };
  }
}

export function createAgentProvider(config: ProviderConfig, getKey: () => string, structuredOutput: boolean, fetcher?: typeof fetch): ProviderAdapter {
  if (config.format === 'openai-responses') return new OpenAIResponsesProvider(config, getKey, structuredOutput, fetcher);
  if (config.format === 'anthropic-messages') return new AnthropicMessagesProvider(config, getKey, structuredOutput, fetcher);
  return new OpenAIChatCompletionsProvider(config, getKey, structuredOutput, fetcher);
}

/** @deprecated Use OpenAIChatCompletionsProvider. */
export class OpenAICompatibleAgentProvider extends OpenAIChatCompletionsProvider {}
