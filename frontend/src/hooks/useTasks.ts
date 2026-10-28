import { useEffect } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { loadAllTasks } from '../lib/tasks';
import { request } from '../lib/api';
import type { Task } from '../types';

export function useTasks() {
  const { token, user, handleError, session } = useAuth();
  const mutating = useIsMutating({ mutationKey: ['task-write'] });
  const query = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: ({ signal }) => loadAllTasks(token!, signal),
    enabled: !!token && !!user && !mutating,
    refetchInterval: (q) => Math.min(30_000 * 2 ** q.state.fetchFailureCount, 120_000),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  });
  useEffect(() => {
    if (query.error) handleError(query.error, session);
  }, [query.error, handleError, session]);
  return query;
}

export type TaskWrite =
  | { type: 'create'; title: string }
  | { type: 'update'; id: number; title?: string; completed?: boolean }
  | { type: 'delete'; id: number };

export function useTaskWrite() {
  const { token, user, handleError, session, isCurrentSession } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['task-write'],
    onMutate: async () => {
      await client.cancelQueries({ queryKey: ['tasks'] });
    },
    mutationFn: async (write: TaskWrite) => {
      if (write.type === 'create')
        return request<Task>('/tasks', { token: token!, method: 'POST', body: { title: write.title } });
      if (write.type === 'delete') {
        await request(`/tasks/${write.id}`, { token: token!, method: 'DELETE' });
        return null;
      }
      const { title, completed } = write;
      return request<Task>(`/tasks/${write.id}`, {
        token: token!,
        method: 'PATCH',
        body: {
          ...(title !== undefined ? { title } : {}),
          ...(completed !== undefined ? { completed } : {}),
        },
      });
    },
    onSuccess: (task, write) => {
      // 退出后完成的请求不能重新写入已清除的账号缓存。
      if (!isCurrentSession(session) || client.getQueryData(['tasks', user?.id]) === undefined) return;
      client.setQueryData<Task[]>(['tasks', user?.id], (old) => {
        if (!old) return old;
        if (write.type === 'delete') return old.filter((item) => item.id !== write.id);
        return [...old.filter((item) => item.id !== task!.id), task!].sort((a, b) => a.id - b.id);
      });
    },
    onError: (error) => handleError(error, session),
    onSettled: () => {
      if (!isCurrentSession(session)) return;
      void client.invalidateQueries({ queryKey: ['tasks'] });
      void client.invalidateQueries({ queryKey: ['task-logs'] });
    },
  });
}
