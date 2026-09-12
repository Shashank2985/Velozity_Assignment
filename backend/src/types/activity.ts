import { TaskStatus } from './enums.js';
import { UserDto } from './auth.js';
import { TaskDto } from './tasks.js';

export interface TaskActivityLogDto {
  id: string;
  taskId: string;
  task?: Partial<TaskDto>;
  actorId: string;
  actor?: UserDto;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  createdAt: string;
}

export interface ActivityFilterParams {
  projectId?: string;
  taskId?: string;
  lastSeenTimestamp?: string;
  limit?: number;
}
