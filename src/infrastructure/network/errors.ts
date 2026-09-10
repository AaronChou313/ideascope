export type ConnectionErrorCode = 'unauthorized' | 'forbidden' | 'rate_limited' | 'network_or_cors' | 'invalid_response' | 'cancelled' | 'http_error';

export class ConnectionError extends Error {
  constructor(public readonly code: ConnectionErrorCode, message: string, public readonly status?: number) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export function classifyResponse(status: number): ConnectionError {
  if (status === 401) return new ConnectionError('unauthorized', '认证失败（401），请检查凭证。', status);
  if (status === 403) return new ConnectionError('forbidden', '服务拒绝访问（403），请检查权限与来源限制。', status);
  if (status === 429) return new ConnectionError('rate_limited', '请求受到限流（429），请稍后重试。', status);
  return new ConnectionError('http_error', `服务返回 HTTP ${status}。`, status);
}

export function normalizeConnectionError(error: unknown): ConnectionError {
  if (error instanceof ConnectionError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') return new ConnectionError('cancelled', '请求已取消。');
  return new ConnectionError('network_or_cors', '网络错误或浏览器跨域策略阻止访问。');
}
