export interface User {
  id: number;
  username: string;
}
export interface Task {
  id: number;
  title: string;
  completed: boolean;
}
export interface Snapshot {
  title?: string;
  completed?: boolean;
}
export interface TaskLog {
  id: number;
  actor_id: number;
  task_id: number;
  action: 'create' | 'update' | 'delete';
  before_data: Snapshot | null;
  after_data: Snapshot | null;
  created_at: string;
}
export type TaskStatus = 'all' | 'pending' | 'completed';
