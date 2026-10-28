import type { Snapshot, TaskLog } from '../types';

export const actionNames = { create: '创建任务', update: '修改任务', delete: '删除任务' };
export function logTitle(log: TaskLog): string {
  return log.after_data?.title ?? log.before_data?.title ?? `任务 #${log.task_id}`;
}
export function snapshotValue(value: Snapshot | null, field: 'title' | 'completed'): string {
  const raw = value?.[field];
  return raw === undefined ? '—' : field === 'completed' ? (raw ? '已完成' : '未完成') : String(raw);
}
export function changes(log: TaskLog) {
  return (['title', 'completed'] as const)
    .filter((field) => log.action !== 'update' || log.before_data?.[field] !== log.after_data?.[field])
    .map((field) => ({
      label: field === 'title' ? '任务标题' : '完成状态',
      before: snapshotValue(log.before_data, field),
      after: snapshotValue(log.after_data, field),
    }));
}
export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}
