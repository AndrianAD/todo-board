export type TaskStatus = 'opened' | 'in_progress' | 'done';

export interface User {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  createdAt: string;
  assigneeId: string | null;
  status: TaskStatus;
}

export interface Board {
  users: User[];
  tasks: Task[];
}

export const TASK_STATUSES: TaskStatus[] = ['opened', 'in_progress', 'done'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  opened: 'Opened',
  in_progress: 'In progress',
  done: 'Done',
};
