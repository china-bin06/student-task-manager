import { describe, expect, it } from 'vitest';
import { changes, logTitle } from '../lib/logs';
import type { TaskLog } from '../types';

const log: TaskLog = {
  id: 1,
  actor_id: 1,
  task_id: 9,
  action: 'update',
  before_data: { title: '学习', completed: false },
  after_data: { title: '学习', completed: true },
  created_at: '2026-10-28T08:00:00Z',
};
describe('历史快照展示', () => {
  it('更新只展示实际变化字段，完成/恢复是状态变化', () => {
    expect(changes(log)).toEqual([{ label: '完成状态', before: '未完成', after: '已完成' }]);
  });
  it('删除的任务从删除前快照取标题，删除后的值为空', () => {
    const deleted = { ...log, action: 'delete' as const, after_data: null };
    expect(logTitle(deleted)).toBe('学习');
    expect(changes(deleted)[0].after).toBe('—');
  });
});
