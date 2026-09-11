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

type ProbeShape = { state: 'supported' | 'unsupported' | 'failed' | 'unknown'; detail: string; usage: boolean };

function isProbeJson(value: unknown) {
  if (typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Boolean(parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      && Object.keys(parsed).length === 1 && (parsed as { ok?: unknown }).ok === true);
  } catch { return false; }
}

function validArguments(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return true;
  if (typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Boolean(parsed && typeof parsed === 'object' && !Array.isArray(parsed));
  } catch { return false; }
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
    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls as Array<Record<string, unknown>> : [];
    const tools = toolCalls.some((call) => {
      const fn = call.function as Record<string, unknown> | undefined;
      return call.type === 'function' && fn?.name === 'probe_ok' && validArguments(fn.arguments);
    });
    const finished = typeof choice.finish_reason === 'string' && choice.finish_reason.length > 0;
    if (capability === 'toolCalling') return { state: tools ? 'supported' : 'unsupported', detail: tools ? '已验证 probe_ok 工具名与合法 arguments。' : '请求成功，但未返回有效的 probe_ok 工具调用。', usage };
    if (capability === 'structuredOutput') return { state: isProbeJson(message.content) ? 'supported' : 'unsupported', detail: isProbeJson(message.content) ? 'JSON 解析及探针 schema 校验通过。' : '返回内容不是符合 {ok:true} schema 的 JSON。', usage };
    if (content) return { state: 'supported', detail: `收到最终文本${finished ? `（finish_reason: ${String(choice.finish_reason)}）` : ''}。`, usage };
    if (reasoning) return { state: 'unknown', detail: finished && choice.finish_reason === 'length' ? '收到 reasoning_content，但输出 token 用尽且没有最终文本；本次结果不足以判断普通完成能力。' : '收到 reasoning_content，但最终文本为空；连接成功，本次结果不足以判断普通完成能力。', usage };
    return { state: 'failed', detail: finished ? `请求成功但最终文本为空（finish_reason: ${String(choice.finish_reason)}）。` : '请求成功但 choices 中没有可用输出。', usage };
  }
  if (format === 'openai-responses') {
    const output = Array.isArray(record.output) ? record.output as Array<Record<string, unknown>> : [];
    const tools = output.some((item) => item.type === 'function_call' && item.name === 'probe_ok' && validArguments(item.arguments));
    const nestedText = output.flatMap((item) => Array.isArray(item.content) ? item.content as Array<Record<string, unknown>> : []).find((item) => item.type === 'output_text')?.text;
    const outputText = typeof record.output_text === 'string' ? record.output_text : nestedText;
    const text = typeof outputText === 'string' && outputText.length > 0 || output.some((item) => item.type === 'message');
    const reasoning = output.some((item) => item.type === 'reasoning');
    const completed = record.status === 'completed' || record.status === 'incomplete';
    if (!output.length && !text && !completed) throw new ConnectionError('invalid_response', 'Provider 返回格式异常：缺少 Responses output/status。');
    if (capability === 'toolCalling') return { state: tools ? 'supported' : 'unsupported', detail: tools ? '已验证 Responses probe_ok function_call 与合法 arguments。' : '请求成功，但未返回有效的 probe_ok function_call。', usage };
    if (capability === 'structuredOutput') return { state: isProbeJson(outputText) ? 'supported' : 'unsupported', detail: isProbeJson(outputText) ? 'JSON 解析及探针 schema 校验通过。' : 'Responses 输出未通过探针 schema 校验。', usage };
    if (typeof outputText === 'string' && outputText.length > 0) return { state: 'supported', detail: '收到 Responses 最终文本。', usage };
    if (reasoning) return { state: 'unknown', detail: record.status === 'incomplete' ? '收到 reasoning 输出，但响应未完成且没有最终文本；本次结果不足以判断普通完成能力。' : '收到 reasoning 输出，但最终文本为空；本次结果不足以判断普通完成能力。', usage };
    return { state: completed ? 'failed' : 'unknown', detail: completed ? 'Responses 请求结束但最终文本为空。' : 'Responses 结果不完整，无法判断普通完成能力。', usage };
  }
  const content = Array.isArray(record.content) ? record.content as Array<Record<string, unknown>> : [];
  const tools = content.some((item) => item.type === 'tool_use' && item.name === 'probe_ok' && validArguments(item.input));
  const textBlock = content.find((item) => item.type === 'text' && typeof item.text === 'string');
  const text = Boolean(textBlock);
  const thinking = content.some((item) => item.type === 'thinking' && typeof item.thinking === 'string');
  if (!content.length && typeof record.stop_reason !== 'string') throw new ConnectionError('invalid_response', 'Provider 返回格式异常：缺少 Messages content/stop_reason。');
  if (capability === 'toolCalling') return { state: tools ? 'supported' : 'unsupported', detail: tools ? '已验证 Anthropic probe_ok tool_use 与合法 input。' : '请求成功，但未返回有效的 probe_ok tool_use。', usage };
  if (capability === 'structuredOutput') return { state: isProbeJson(textBlock?.text) ? 'supported' : 'unsupported', detail: isProbeJson(textBlock?.text) ? 'JSON 解析及探针 schema 校验通过（prompt fallback）。' : 'Messages 文本未通过探针 schema 校验。', usage };
  if (text) return { state: 'supported', detail: '收到 Anthropic 最终文本。', usage };
  if (thinking) return { state: 'unknown', detail: record.stop_reason === 'max_tokens' ? '收到 thinking 内容，但输出 token 用尽且没有最终文本；本次结果不足以判断普通完成能力。' : '收到 thinking 内容，但最终文本为空；本次结果不足以判断普通完成能力。', usage };
  return { state: typeof record.stop_reason === 'string' ? 'failed' : 'unknown', detail: 'Messages 请求未返回最终文本。', usage };
}

export async function parseProviderStream(format: ProviderFormat, body: ReadableStream<Uint8Array> | null, contentType = ''): Promise<string> {
  if (!body) throw new ConnectionError('invalid_response', 'Provider 未返回流式响应体。');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    raw += decoder.decode(part.value, { stream: true });
  }
  raw += decoder.decode();
  const sseFramed = /(^|\n)(data|event):/.test(raw);
  if (!contentType.toLowerCase().includes('text/event-stream') && !sseFramed)
    throw new ConnectionError('invalid_response', '响应不是可识别的 SSE / stream event。');
  let outputEvents = 0;
  let terminal = false;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const value = line.slice(5).trim();
    if (value === '[DONE]') { terminal = true; continue; }
    if (!value) continue;
    let event: Record<string, unknown>;
    try { event = JSON.parse(value) as Record<string, unknown>; } catch { continue; }
    if (format === 'openai-chat') {
      const choice = Array.isArray(event.choices) ? event.choices[0] as Record<string, unknown> | undefined : undefined;
      const delta = choice?.delta as Record<string, unknown> | undefined;
      if (typeof delta?.content === 'string' && delta.content.length > 0
        || typeof delta?.reasoning_content === 'string' && delta.reasoning_content.length > 0
        || Array.isArray(delta?.tool_calls) && delta.tool_calls.length > 0) outputEvents += 1;
      if (typeof choice?.finish_reason === 'string') terminal = true;
    } else if (format === 'openai-responses') {
      const type = event.type;
      if (type === 'response.output_text.delta' && typeof event.delta === 'string' && event.delta.length > 0
        || type === 'response.function_call_arguments.delta' && typeof event.delta === 'string' && event.delta.length > 0
        || type === 'response.output_item.added' && Boolean(event.item)) outputEvents += 1;
      if (type === 'response.completed' || type === 'response.incomplete') terminal = true;
    } else {
      const type = event.type;
      const delta = event.delta as Record<string, unknown> | undefined;
      const block = event.content_block as Record<string, unknown> | undefined;
      if (type === 'content_block_delta' && (typeof delta?.text === 'string' && delta.text.length > 0 || typeof delta?.partial_json === 'string' && delta.partial_json.length > 0)) outputEvents += 1;
      if (type === 'content_block_start' && block?.type === 'tool_use') outputEvents += 1;
      if (type === 'message_stop') terminal = true;
    }
  }
  if (!outputEvents) throw new ConnectionError('invalid_response', '流中没有可识别的模型输出事件。');
  return terminal ? '已解析有效模型输出事件和合法终止事件，流式能力验证通过。' : '已解析有效模型输出事件，响应流正常结束，流式能力验证通过。';
}
