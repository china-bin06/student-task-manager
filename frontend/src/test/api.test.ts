import { describe, expect, it, vi } from 'vitest';
import { ApiError, errorMessage, request } from '../lib/api';

describe('请求契约与错误', () => {
  it('登录 JSON 保留密码原始空白，不添加未登录凭证', async () => {
    const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await request('/auth/login', { method: 'POST', body: { username: 'demo', password: ' secret ' } });
    const options = mock.mock.calls[0][1]!;
    expect(JSON.parse(String(options.body)).password).toBe(' secret ');
    expect(options.headers).not.toHaveProperty('Authorization');
  });
  it('带 Bearer 凭证，204 不解析 JSON', async () => {
    const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    expect(await request('/tasks/1', { token: 'test-token', method: 'DELETE' })).toBeUndefined();
    expect(mock.mock.calls[0][1]?.headers).toHaveProperty('Authorization', 'Bearer test-token');
  });
  it.each([401, 409, 422, 500])('将 HTTP %i 转成带状态码的错误', async (status) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status }));
    await expect(request('/tasks', { token: 'test-token' })).rejects.toMatchObject({
      name: 'ApiError',
      status,
    });
  });
  it('网络错误和超时可以理解', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toContain('连接');
    expect(errorMessage(new DOMException('', 'TimeoutError'))).toContain('超时');
    expect(new ApiError('错误', 401).status).toBe(401);
  });
});
