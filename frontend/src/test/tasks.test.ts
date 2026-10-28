import { describe, expect, it, vi } from 'vitest';
import { filterTasks, loadAllTasks } from '../lib/tasks';
import type { Task } from '../types';

const task = (id: number): Task => ({
  id,
  title: id === 101 ? '线性代数复习' : `任务 ${id}`,
  completed: id % 2 === 0,
});
describe('完整读取和组合筛选', () => {
  it.each([0, 100, 101])('完整读取 %i 条，包括整百后的空页', async (count) => {
    const data = Array.from({ length: count }, (_, i) => task(i + 1));
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      const offset = Number(url.searchParams.get('offset'));
      expect(url.searchParams.get('limit')).toBe('100');
      return new Response(JSON.stringify(data.slice(offset, offset + 100)));
    });
    const result = await loadAllTasks('test-token');
    expect(result).toEqual(data);
    expect(fetcher).toHaveBeenCalledTimes(Math.floor(count / 100) + 1);
    if (count === 101) expect(filterTasks(result, '  线性代数 ', 'pending')).toEqual([task(101)]);
  });
  it('中间一批失败时拒绝返回部分数据', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(Array.from({ length: 100 }, (_, i) => task(i + 1)))))
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: '故障' }), { status: 500 }));
    await expect(loadAllTasks('test-token')).rejects.toThrow('故障');
  });
  it('重复 ID 去重，并按 ID 排序', async () => {
    const first = Array.from({ length: 100 }, (_, i) => task(i + 1));
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(first)))
      .mockResolvedValueOnce(new Response(JSON.stringify([task(100), task(101)])));
    expect(await loadAllTasks('test-token')).toHaveLength(101);
  });
  it('关键词不区分英文大小写，状态和关键词同时生效', () => {
    const tasks = [
      { id: 1, title: 'Learn React', completed: false },
      { id: 2, title: 'React 练习', completed: true },
    ];
    expect(filterTasks(tasks, ' REACT ', 'completed')).toEqual([tasks[1]]);
    expect(filterTasks(tasks, '不存在', 'all')).toEqual([]);
  });
  it('把取消信号传递给读取请求', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      init?.signal?.throwIfAborted();
      throw new Error('不应执行');
    });
    await expect(loadAllTasks('test-token', controller.signal)).rejects.toThrow();
  });
});
