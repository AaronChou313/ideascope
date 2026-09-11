import { classifyProviderResponse, ConnectionError, normalizeConnectionError } from '../network/errors';
import { parseProbeResponse, parseProviderStream, probeRequestBody, providerHeaders, providerUrl } from './provider-protocol';
import type { ProbeCapability, ProbeResult, ProviderConfig } from './types';

type FetchLike = typeof fetch;

export { normalizeBaseUrl } from './provider-protocol';

export function chatCompletionsUrl(baseUrl: string): string {
  return providerUrl({ format: 'openai-chat', baseUrl, model: '_' });
}

function sendProbe(config: ProviderConfig, key: string, capability: ProbeCapability, signal: AbortSignal, fetcher: FetchLike, disableThinking: boolean) {
  return fetcher(providerUrl(config), {
    method: 'POST', headers: providerHeaders(config.format ?? 'openai-chat', key),
    body: JSON.stringify(probeRequestBody(config, capability, disableThinking)), signal, redirect: 'error',
  });
}

export async function probeProvider(config: ProviderConfig, key: string, capability: ProbeCapability, signal: AbortSignal, fetcher: FetchLike = fetch): Promise<ProbeResult> {
  if (!config.model.trim()) throw new ConnectionError('invalid_response', 'Model ID 不能为空。');
  if (!key) throw new ConnectionError('unauthorized', 'API Key 仅保存在内存中，当前为空。');
  try {
    const format = config.format ?? 'openai-chat';
    let response = await sendProbe(config, key, capability, signal, fetcher, true);
    if (format === 'openai-chat' && [400, 422].includes(response.status))
      response = await sendProbe(config, key, capability, signal, fetcher, false);
    if (!response.ok) {
      throw await classifyProviderResponse(response);
    }
    if (capability === 'cancellation') return { capability, state: 'unknown', detail: '请求在取消前已完成，无法确认取消能力。', usageReporting: 'unknown' };
    if (capability === 'streaming') {
      const detail = await parseProviderStream(format, response.body, response.headers.get('Content-Type') ?? '');
      return { capability, state: 'supported', detail, usageReporting: 'unknown' };
    }
    const parsed = parseProbeResponse(format, capability, await response.json());
    return { capability, state: parsed.state, detail: parsed.detail, usageReporting: parsed.usage ? 'supported' : 'unknown' };
  } catch (error) {
    throw normalizeConnectionError(error);
  }
}
