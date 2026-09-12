import { api } from './api';
import { CreateTaskDto, TaskDto, TaskFilterParams, UpdateTaskDto } from '../types/tasks';
import { TaskStatus } from '../types/enums';

export interface TasksResponse {
  success: boolean;
  tasks: TaskDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const tasksService = {
  async getTasks(params?: TaskFilterParams): Promise<TasksResponse> {
    const response = await api.get<TasksResponse>('/tasks', { params });
    return response.data;
  },

  async getTaskById(id: string): Promise<{ success: boolean; task: TaskDto }> {
    const response = await api.get<{ success: boolean; task: TaskDto }>(`/tasks/${id}`);
    return response.data;
  },

  async createTask(data: CreateTaskDto): Promise<{ success: boolean; task: TaskDto }> {
    const response = await api.post<{ success: boolean; task: TaskDto }>('/tasks', data);
    return response.data;
  },

  async updateTask(id: string, data: UpdateTaskDto): Promise<{ success: boolean; task: TaskDto }> {
    const response = await api.patch<{ success: boolean; task: TaskDto }>(`/tasks/${id}`, data);
    return response.data;
  },

  async updateTaskStatus(id: string, status: TaskStatus): Promise<{ success: boolean; task: TaskDto }> {
    const response = await api.patch<{ success: boolean; task: TaskDto }>(`/tasks/${id}/status`, { status });
    return response.data;
  },

  async deleteTask(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(`/tasks/${id}`);
    return response.data;
  },
};
