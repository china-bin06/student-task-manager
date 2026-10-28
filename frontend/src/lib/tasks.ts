import type { Task, TaskStatus } from '../types';
import { request } from './api';

export async function loadAllTasks(token: string, signal?: AbortSignal): Promise<Task[]> {
  const tasks = new Map<number, Task>();
  for (let offset = 0; ; offset += 100) {
    const batch = await request<Task[]>(`/tasks?offset=${offset}&limit=100`, { token, signal });
    if (!Array.isArray(batch)) throw new Error('任务数据格式异常，请重试。');
    for (const task of batch) tasks.set(task.id, task);
    if (batch.length < 100) return [...tasks.values()].sort((a, b) => a.id - b.id);
  }
}

export function filterTasks(tasks: Task[], keyword: string, status: TaskStatus): Task[] {
  const normalized = keyword.trim().toLocaleLowerCase();
  return tasks.filter(
    (task) =>
      task.title.toLocaleLowerCase().includes(normalized) &&
      (status === 'all' || task.completed === (status === 'completed')),
  );
}
