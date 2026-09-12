import { UserDto } from './auth.js';
import { TaskDto } from './tasks.js';

export interface NotificationDto {
  id: string;
  userId: string;
  user?: UserDto;
  taskId?: string | null;
  task?: Partial<TaskDto> | null;
  message: string;
  read: boolean;
  createdAt: string;
}
