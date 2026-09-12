import { Priority, TaskStatus } from './enums.js';
import { UserDto } from './auth.js';
import { ProjectDto } from './projects.js';

export interface TaskDto {
  id: string;
  title: string;
  description: string;
  projectId: string;
  project?: ProjectDto;
  assigneeId: string;
  assignee?: UserDto;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  projectId: string;
  assigneeId: string;
  priority: Priority;
  dueDate: string;
  status?: TaskStatus;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigneeId?: string;
  priority?: Priority;
  dueDate?: string;
  status?: TaskStatus;
}

export interface UpdateTaskStatusDto {
  status: TaskStatus;
}

export interface TaskFilterParams {
  projectId?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: Priority | Priority[];
  assigneeId?: string;
  dueFrom?: string;
  dueTo?: string;
  isOverdue?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'dueDate' | 'createdAt' | 'priority' | 'status' | 'title';
  sortOrder?: 'asc' | 'desc';
}
