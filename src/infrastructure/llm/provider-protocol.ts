import { ConnectionError } from '../network/errors';
import type { ProbeCapability, ProviderConfig, ProviderFormat } from './types';

export const probeSchema = {
  type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false,
} as const;

export function normalizeBaseUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.username || url.password) throw new ConnectionError('invalid_response', 'Provider URL 不能包含凭证。');
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1')
    throw new ConnectionError('invalid_response', '远程 Provider 必须使用 HTTPS。');
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/$/, '');
}

function appendEndpoint(baseUrl: string, suffix: string) {
  const base = normalizeBaseUrl(baseUrl);
  return base.endsWith(suffix) ? base : `${base}${suffix}`;
}

export function providerUrl(config: ProviderConfig): string {
  const format = config.format ?? 'openai-chat';
  if (format === 'openai-responses') return appendEndpoint(config.baseUrl, '/responses');
  if (format === 'anthropic-messages') {
    const base = normalizeBaseUrl(config.baseUrl);
    return base.endsWith('/v1/messages') ? base : `${base}${base.endsWith('/v1') ? '' : '/v1'}/messages`;
  }
  return appendEndpoint(config.baseUrl, '/chat/completions');
}

export function providerHeaders(format: ProviderFormat, key: string): Record<string, string> {
  return format === 'anthropic-messages'
    ? { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }
    : { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
}

const probeTool = { name: 'probe_ok', description: 'Connection probe only', input_schema: { type: 'object', properties: {}, additionalProperties: false } };

export function probeRequestBody(config: ProviderConfig, capability: ProbeCapability, disableThinking = true): Record<string, unknown> {
  const format = config.format ?? 'openai-chat';
  const prompt = capability === 'structuredOutput' ? 'Return JSON with ok=true.' : 'Reply only with OK. This is a minimal connection probe.';
  if (format === 'openai-responses') {
    const body: Record<string, unknown> = { model: config.model, input: prompt, max_output_tokens: 64, stream: capability === 'streaming' };
    if (capability === 'structuredOutput') body.text = { format: { type: 'json_schema', name: 'probe', strict: true, schema: probeSchema } };
    if (capability === 'toolCalling') {
      body.tools = [{ type: 'function', name: probeTool.name, description: probeTool.description, parameters: probeTool.input_schema, strict: true }];
      body.tool_choice = { type: 'function', name: probeTool.name };
    }
    return body;
  }
  if (format === 'anthropic-messages') {
    const body: Record<string, unknown> = { model: config.model, messages: [{ role: 'user', content: prompt }], max_tokens: 64, stream: capability === 'streaming' };
    if (capability === 'structuredOutput') body.messages = [{ role: 'user', content: `${prompt} Return only valid JSON and no Markdown.` }];
    if (capability === 'toolCalling') {
      body.tools = [probeTool];
      body.tool_choice = { type: 'tool', name: probeTool.name };
    }
    return body;
  }
  const body: Record<string, unknown> = { model: config.model, messages: [{ role: 'user', content: prompt }], max_tokens: 64, stream: capability === 'streaming' };
  if (disableThinking) body.thinking = { type: 'disabled' };
  if (capability === 'structuredOutput') {
    body.response_format = { type: 'json_object' };
    body.messages = [{ role: 'user', content: `${prompt} Return only valid JSON and no Markdown.` }];
  }
  if (capability === 'toolCalling') {
    body.tools = [{ type: 'function', function: { name: probeTool.name, description: probeTool.description, parameters: probeTool.input_schema } }];
    body.tool_choice = { type: 'function', function: { name: probeTool.name } };
  }
  return body;
}

type ProbeShape = { supported: boolean; detail: string; usage: boolean };

function isProbeJson(value: unknown) {
  if (typeof value !== 'string') return false;
  try { return (JSON.parse(value) as { ok?: unknown }).ok === true; } catch { return false; }
}

export function parseProbeResponse(format: ProviderFormat, capability: ProbeCapability, data: unknown): ProbeShape {
  if (!data || typeof data !== 'object') throw new ConnectionError('invalid_response', 'Provider 返回格式异常。');
  const record = data as Record<string, unknown>;
  const usage = Boolean(record.usage);
  if (format === 'openai-chat') {
    const choice = Array.isArray(record.choices) ? record.choices[0] as Record<string, unknown> | undefined : undefined;
    const message = choice?.message as Record<string, unknown> | undefined;
    if (!choice || !message) throw new ConnectionError('invalid_response', 'Provider 返回格式异常：缺少 choices/message。');
    const content = typeof message.content === 'string' && message.content.length > 0;
    const reasoning = typeof message.reasoning_content === 'string' && message.reasoning_content.length > 0;
    const tools = Array.isArray(message.tool_calls) && message.tool_calls.length > 0;
    const finished = typeof choice.finish_reason === 'string' && choice.finish_reason.length > 0;
    const supported = capability === 'toolCalling' ? tools : capability === 'structuredOutput' ? isProbeJson(message.content) : content || reasoning || tools || finished;
    const detail = content ? '收到文本响应。' : reasoning ? '收到 reasoning_content；连接正常，模型未返回最终文本。' : tools ? '收到工具调用响应。' : finished ? `请求已正常结束（finish_reason: ${String(choice.finish_reason)}）。` : '请求成功，但响应未体现该能力。';
    return { supported, detail: capability === 'structuredOutput' && supported ? '收到有效 JSON object。' : detail, usage };
  }
  if (format === 'openai-responses') {
    const output = Array.isArray(record.output) ? record.output as Array<Record<string, unknown>> : [];
    const tools = output.some((item) => item.type === 'function_call');
    const nestedText = output.flatMap((item) => Array.isArray(item.content) ? item.content as Array<Record<string, unknown>> : []).find((item) => item.type === 'output_text')?.text;
    const outputText = typeof record.output_text === 'string' ? record.output_text : nestedText;
    const text = typeof outputText === 'string' && outputText.length > 0 || output.some((item) => item.type === 'message');
    const completed = record.status === 'completed' || record.status === 'incomplete';
    if (!output.length && !text && !completed) throw new ConnectionError('invalid_response', 'Provider 返回格式异常：缺少 Responses output/status。');
    const supported = capability === 'toolCalling' ? tools : capability === 'structuredOutput' ? isProbeJson(outputText) : text || tools || completed;
    return { supported, detail: capability === 'structuredOutput' && supported ? '收到符合 schema 的 JSON 输出。' : tools ? '收到 Responses function_call。' : '收到 Responses API 输出。', usage };
  }
  const content = Array.isArray(record.content) ? record.content as Array<Record<string, unknown>> : [];
  const tools = content.some((item) => item.type === 'tool_use');
  const textBlock = content.find((item) => item.type === 'text' && typeof item.text === 'string');
  const text = Boolean(textBlock);
  if (!content.length && typeof record.stop_reason !== 'string') throw new ConnectionError('invalid_response', 'Provider 返回格式异常：缺少 Messages content/stop_reason。');
  const supported = capability === 'toolCalling' ? tools : capability === 'structuredOutput' ? isProbeJson(textBlock?.text) : text || tools || typeof record.stop_reason === 'string';
  return { supported, detail: capability === 'structuredOutput' && supported ? '收到有效 JSON 输出（prompt fallback）。' : tools ? '收到 Anthropic tool_use。' : '收到 Anthropic Messages 输出。', usage };
}
