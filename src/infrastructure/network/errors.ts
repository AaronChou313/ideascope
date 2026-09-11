export type ConnectionErrorCode = 'unauthorized' | 'forbidden' | 'not_found' | 'rate_limited' | 'model_not_found' | 'incompatible_request' | 'network' | 'cors' | 'network_or_cors' | 'invalid_response' | 'cancelled' | 'http_error';

export class ConnectionError extends Error {
  constructor(public readonly code: ConnectionErrorCode, message: string, public readonly status?: number) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export function classifyResponse(status: number): ConnectionError {
  if (status === 401) return new ConnectionError('unauthorized', '认证失败（401），请检查凭证。', status);
  if (status === 403) return new ConnectionError('forbidden', '服务拒绝访问（403），请检查权限与来源限制。', status);
  if (status === 404) return new ConnectionError('not_found', '接口不存在（404），请检查 Provider Format 与 Base URL。', status);
  if (status === 429) return new ConnectionError('rate_limited', '请求受到限流（429），请稍后重试。', status);
  return new ConnectionError('http_error', `服务返回 HTTP ${status}。`, status);
}

export async function classifyProviderResponse(response: Response): Promise<ConnectionError> {
  let message = '';
  try {
    const data = await response.clone().json() as { error?: { message?: unknown; type?: unknown; code?: unknown }; message?: unknown };
    message = [data.error?.message, data.error?.type, data.error?.code, data.message]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase();
  } catch { /* Do not expose an arbitrary provider body. */ }
  if (/(model|模型).*(not found|not exist|不存在)|unknown[_ ]model/.test(message))
    return new ConnectionError('model_not_found', '模型不存在或当前凭证无权访问该模型。', response.status);
  if ([400, 409, 415, 422].includes(response.status))
    return new ConnectionError('incompatible_request', '请求格式与所选 Provider 协议或模型能力不兼容。', response.status);
  return classifyResponse(response.status);
}

export function normalizeConnectionError(error: unknown): ConnectionError {
  if (error instanceof ConnectionError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') return new ConnectionError('cancelled', '请求已取消。');
  if (error instanceof TypeError && typeof navigator !== 'undefined') {
    if (!navigator.onLine) return new ConnectionError('network', '网络不可用，请检查当前网络连接。');
    return new ConnectionError('cors', '浏览器未能读取响应；Provider 可能未允许当前页面的 CORS origin。');
  }
  return new ConnectionError('network_or_cors', '网络错误或浏览器跨域策略阻止访问。');
}
