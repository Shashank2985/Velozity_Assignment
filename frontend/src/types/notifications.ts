import { UserDto } from './auth';
import { TaskDto } from './tasks';

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
