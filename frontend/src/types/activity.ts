import { TaskStatus } from './enums';
import { UserDto } from './auth';
import { TaskDto } from './tasks';

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
