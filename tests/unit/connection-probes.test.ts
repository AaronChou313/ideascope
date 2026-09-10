import { describe, expect, it, vi } from 'vitest';
import { chatCompletionsUrl, normalizeBaseUrl, probeProvider } from '../../src/infrastructure/llm/openai-compatible';
import { probeOpenAlex } from '../../src/infrastructure/literature/openalex';
import { ConnectionError } from '../../src/infrastructure/network/errors';

describe('browser connection probes', () => {
  it('normalizes a user base URL without adding a duplicate v1', () => {
    expect(normalizeBaseUrl('https://gateway.example/v1/')).toBe('https://gateway.example/v1');
    expect(chatCompletionsUrl('https://gateway.example/v1')).toBe('https://gateway.example/v1/chat/completions');
    expect(() => normalizeBaseUrl('http://gateway.example/v1')).toThrow('HTTPS');
  });

  it('sends credentials only to the configured origin and reports usage', async () => {
    const fetcher = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }], usage: { total_tokens: 2 } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });
    const result = await probeProvider({ baseUrl: 'https://gateway.example/v1', model: 'test-model' }, 'test-only-key', 'completion', new AbortController().signal, fetcher);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('https://gateway.example/v1/chat/completions');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-only-key');
    expect(result).toMatchObject({ state: 'supported', usageReporting: 'supported' });
  });

  it('classifies 401 without exposing response content', async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response('secret response', { status: 401 })));
    await expect(probeProvider({ baseUrl: 'https://gateway.example/v1', model: 'test' }, 'test-only-key', 'completion', new AbortController().signal, fetcher)).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
  });

  it.each([[403, 'forbidden'], [429, 'rate_limited']] as const)('classifies HTTP %s', async (status, code) => {
    const fetcher = vi.fn(() => Promise.resolve(new Response('', { status })));
    await expect(probeProvider({ baseUrl: 'https://gateway.example/v1', model: 'test' }, 'test-only-key', 'completion', new AbortController().signal, fetcher)).rejects.toMatchObject({ code, status });
  });

  it('normalizes an OpenAlex response', async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ meta: { count: 42 }, results: [{ title: 'A Paper' }] }), { status: 200 })));
    await expect(probeOpenAlex(new AbortController().signal, fetcher)).resolves.toMatchObject({ count: 42, firstTitle: 'A Paper' });
  });

  it('rejects a missing key before a request is sent', async () => {
    const fetcher = vi.fn();
    await expect(probeProvider({ baseUrl: 'https://gateway.example/v1', model: 'test' }, '', 'completion', new AbortController().signal, fetcher)).rejects.toBeInstanceOf(ConnectionError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('preserves cancellation as a distinct outcome', async () => {
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const controller = new AbortController();
    const request = probeProvider({ baseUrl: 'https://gateway.example/v1', model: 'test' }, 'test-only-key', 'completion', controller.signal, fetcher);
    controller.abort();
    await expect(request).rejects.toMatchObject({ code: 'cancelled' });
  });
});
