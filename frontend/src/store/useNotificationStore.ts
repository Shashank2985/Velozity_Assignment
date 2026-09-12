import { create } from 'zustand';
import { NotificationDto } from '../types/notifications';
import { notificationsService } from '../services/notifications.service';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

interface NotificationState {
  notifications: NotificationDto[];
  unreadCount: number;
  isLoading: boolean;
  isDrawerOpen: boolean;
  toasts: ToastItem[];

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  handleSocketNotification: (notification: NotificationDto) => void;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  addToast: (toast: Omit<ToastItem, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isDrawerOpen: false,
  toasts: [],

  setDrawerOpen: (open: boolean) => set({ isDrawerOpen: open }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const data = await notificationsService.getNotifications();
      set({
        notifications: data.notifications,
        unreadCount: data.unreadCount,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsService.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  handleSocketNotification: (notification: NotificationDto) => {
    set((state) => {
      // Avoid duplicate
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) return state;

      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    });

    // Add toast banner
    get().addToast({
      title: 'New Notification',
      message: notification.message,
      type: notification.message.toLowerCase().includes('overdue') ? 'warning' : 'info',
    });
  },

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastItem = {
      ...toast,
      id,
      timestamp: Date.now(),
    };

    set((state) => ({
      toasts: [newToast, ...state.toasts.slice(0, 4)], // Keep max 5
    }));

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 5000);
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
