import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthProvider } from '../auth';
import { useTasks } from '../hooks/useTasks';

let client: QueryClient;
let taskCalls: number;
let fail: boolean;
beforeEach(() => {
  vi.useFakeTimers();
  taskCalls = 0;
  fail = false;
  sessionStorage.setItem('shixu.access-token', 'sync-test-token');
  focusManager.setFocused(true);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const response = (data: unknown, status = 200) =>
    ({ ok: status === 200, status, json: async () => data }) as Response;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input).endsWith('/users/me')) return response({ id: 1, username: 'sync-student' });
    taskCalls++;
    return fail ? response({}, 500) : response([{ id: 1, title: '同步任务', completed: false }]);
  });
});
afterEach(() => {
  client.clear();
  focusManager.setFocused(undefined);
  vi.useRealTimers();
});
function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

async function settle() {
  // 身份恢复、启用任务查询、查询通知分别经过 React 提交，逐轮清空。
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
  }
}

function useTaskSnapshot() {
  // 与真实页面一样在 render 中读取字段，使 Query Observer 订阅这些字段的变化。
  const { data, error, status } = useTasks();
  return { data, error, status };
}

describe('同步时机', () => {
  it('每 30 秒同步，失焦暂停，重新前台刷新', async () => {
    const { result } = renderHook(useTaskSnapshot, { wrapper });
    await settle();
    expect(result.current.data).toHaveLength(1);
    expect(taskCalls).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    await settle();
    expect(taskCalls).toBe(2);
    await act(async () => {
      focusManager.setFocused(false);
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(taskCalls).toBe(2);
    await act(async () => {
      focusManager.setFocused(true);
      await vi.advanceTimersByTimeAsync(100);
    });
    await settle();
    expect(taskCalls).toBe(3);
  });
  it('同步失败保留完整数据，下一次轮询退避到 60 秒', async () => {
    const { result } = renderHook(useTaskSnapshot, { wrapper });
    await settle();
    fail = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    await settle();
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toHaveLength(1);
    expect(taskCalls).toBe(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(taskCalls).toBe(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(taskCalls).toBe(3);
  });
});
