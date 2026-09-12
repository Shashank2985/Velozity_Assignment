import { api } from './api';
import { NotificationDto } from '../types/notifications';

export const notificationsService = {
  async getNotifications(): Promise<{ success: boolean; notifications: NotificationDto[]; unreadCount: number }> {
    const response = await api.get<{ success: boolean; notifications: NotificationDto[]; unreadCount: number }>('/notifications');
    return response.data;
  },

  async markAsRead(id: string): Promise<{ success: boolean; notification: NotificationDto }> {
    const response = await api.patch<{ success: boolean; notification: NotificationDto }>(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<{ success: boolean; count: number }> {
    const response = await api.patch<{ success: boolean; count: number }>('/notifications/read-all');
    return response.data;
  },
};
