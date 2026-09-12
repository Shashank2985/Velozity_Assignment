import { create } from 'zustand';
import { UserDto } from '../types/auth';
import { authService } from '../services/auth.service';
import { useSocketStore } from './useSocketStore';
import { useTaskStore } from './useTaskStore';
import { useNotificationStore } from './useNotificationStore';
import { useActivityStore } from './useActivityStore';

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password?: string) => Promise<void>;
  switchDemoRole: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('velozity_access_token'),
  isAuthenticated: !!localStorage.getItem('velozity_access_token'),
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  initAuth: async () => {
    set({ isLoading: true, error: null });
    const token = localStorage.getItem('velozity_access_token');
    if (!token) {
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const { user } = await authService.me();
      set({ user, isAuthenticated: true, isLoading: false });
      // Connect socket
      useSocketStore.getState().connectSocket(token);
    } catch (err: any) {
      // Try refresh
      try {
        const { user, accessToken } = await authService.refresh();
        localStorage.setItem('velozity_access_token', accessToken);
        set({ user, accessToken, isAuthenticated: true, isLoading: false });
        useSocketStore.getState().connectSocket(accessToken);
      } catch (refreshErr) {
        localStorage.removeItem('velozity_access_token');
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      }
    }
  },

  login: async (email: string, password = 'Password123!') => {
    set({ isLoading: true, error: null });
    try {
      const { user, accessToken } = await authService.login({ email, password });
      localStorage.setItem('velozity_access_token', accessToken);
      set({ user, accessToken, isAuthenticated: true, isLoading: false });

      // Connect socket with new token
      useSocketStore.getState().connectSocket(accessToken);
      // Reload tasks & notifications
      useTaskStore.getState().fetchTasks();
      useNotificationStore.getState().fetchNotifications();
      useActivityStore.getState().fetchActivities();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Login failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  switchDemoRole: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      // Disconnect current socket
      useSocketStore.getState().disconnectSocket();

      const { user, accessToken } = await authService.login({
        email,
        password: 'Password123!',
      });

      localStorage.setItem('velozity_access_token', accessToken);
      set({ user, accessToken, isAuthenticated: true, isLoading: false });

      // Reconnect socket with new token
      useSocketStore.getState().connectSocket(accessToken);
      // Refresh tasks, notifications, activities
      useTaskStore.getState().resetFilters();
      useTaskStore.getState().fetchTasks();
      useNotificationStore.getState().fetchNotifications();
      useActivityStore.getState().fetchActivities();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Role switch failed';
      set({ error: msg, isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch (err) {
      // Ignore error during logout
    } finally {
      localStorage.removeItem('velozity_access_token');
      useSocketStore.getState().disconnectSocket();
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
