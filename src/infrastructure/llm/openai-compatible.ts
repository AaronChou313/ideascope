import { classifyResponse, ConnectionError, normalizeConnectionError } from '../network/errors';
import type { ProbeCapability, ProbeResult, ProviderConfig } from './types';

type FetchLike = typeof fetch;

export function normalizeBaseUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new ConnectionError('invalid_response', '远程 Provider 必须使用 HTTPS。');
  }
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/$/, '');
}

export function chatCompletionsUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/chat/completions`;
}

function requestBody(config: ProviderConfig, capability: ProbeCapability) {
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [{ role: 'user', content: 'Reply only with OK. This is a minimal connection probe.' }],
    max_tokens: capability === 'structuredOutput' ? 24 : 4,
    stream: capability === 'streaming',
  };
  if (capability === 'structuredOutput') {
    body.response_format = { type: 'json_schema', json_schema: { name: 'probe', strict: true, schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false } } };
    body.messages = [{ role: 'user', content: 'Return JSON with ok=true.' }];
  }
  if (capability === 'toolCalling') {
    body.tools = [{ type: 'function', function: { name: 'probe_ok', description: 'Connection probe only', parameters: { type: 'object', properties: {}, additionalProperties: false } } }];
    body.tool_choice = { type: 'function', function: { name: 'probe_ok' } };
  }
  return body;
}

export async function probeProvider(config: ProviderConfig, key: string, capability: ProbeCapability, signal: AbortSignal, fetcher: FetchLike = fetch): Promise<ProbeResult> {
  if (!config.model.trim()) throw new ConnectionError('invalid_response', 'Model ID 不能为空。');
  if (!key) throw new ConnectionError('unauthorized', 'API Key 仅保存在内存中，当前为空。');
  try {
    const response = await fetcher(chatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(requestBody(config, capability)),
      signal,
    });
    if (!response.ok) throw classifyResponse(response.status);
    if (capability === 'cancellation') return { capability, state: 'unknown', detail: '请求在取消前已完成，无法确认取消能力。', usageReporting: 'unknown' };
    if (capability === 'streaming') {
      const first = await response.body?.getReader().read();
      if (!first || first.done) throw new ConnectionError('invalid_response', '未收到流式数据。');
      return { capability, state: 'supported', detail: '收到首个流式数据块。', usageReporting: 'unknown' };
    }
    const data = await response.json() as { choices?: Array<{ message?: { content?: string; tool_calls?: unknown[] } }>; usage?: unknown };
    const message = data.choices?.[0]?.message;
    const supported = capability === 'toolCalling' ? Boolean(message?.tool_calls?.length) : Boolean(message?.content);
    return { capability, state: supported ? 'supported' : 'unsupported', detail: supported ? '响应形状符合该能力探针。' : '请求成功，但响应未体现该能力。', usageReporting: data.usage ? 'supported' : 'unknown' };
  } catch (error) {
    throw normalizeConnectionError(error);
  }
}
