import { api } from './api';
import { ActivityFilterParams, TaskActivityLogDto } from '../types/activity';

export const activityService = {
  async getActivityLogs(params?: ActivityFilterParams): Promise<{ success: boolean; activities: TaskActivityLogDto[] }> {
    const response = await api.get<{ success: boolean; activities: TaskActivityLogDto[] }>('/activity', { params });
    return response.data;
  },
};
