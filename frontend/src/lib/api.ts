export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const base = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

export function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') return '请求超时，请稍后重试。';
  if (error instanceof TypeError) return '暂时无法连接服务，请检查网络或稍后重试。';
  if (error instanceof SyntaxError) return '服务返回的数据格式异常，请重试。';
  return error instanceof Error ? error.message : '操作未完成，请重试。';
}

export async function request<T>(
  path: string,
  options: {
    token?: string;
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const { token, body, signal, method = 'GET' } = options;
  const timeout = AbortSignal.timeout(15_000);
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const detail = typeof data?.detail === 'string' ? data.detail : undefined;
    const fallback: Record<number, string> = {
      401: token ? '登录已过期，请重新登录。' : '用户名或密码错误。',
      404: '任务不存在或已被删除，请刷新后重试。',
      409: '用户名已存在，请换一个试试。',
      422: '输入不符合要求，请检查后重试。',
    };
    throw new ApiError(
      fallback[response.status] ?? detail ?? '服务暂时不可用，请稍后重试。',
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
