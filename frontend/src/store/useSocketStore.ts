import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '../types/socket-events';
import { useNotificationStore } from './useNotificationStore';
import { useTaskStore } from './useTaskStore';
import { useActivityStore } from './useActivityStore';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketState {
  socket: AppSocket | null;
  isConnected: boolean;
  onlineUsersCount: number;
  onlineUserIds: string[];
  activeProjectId: string | null;

  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  syncActivity: (projectId?: string, lastSeenTimestamp?: string) => Promise<void>;
}

const wsURL = import.meta.env.VITE_WS_URL || window.location.origin;

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsersCount: 1,
  onlineUserIds: [],
  activeProjectId: null,

  connectSocket: (token: string) => {
    const existingSocket = get().socket;
    if (existingSocket) {
      existingSocket.disconnect();
    }

    const socket: AppSocket = io(wsURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      set({ isConnected: true, socket });

      // If active project is selected, rejoin room and perform catch-up sync
      const currentProjectId = get().activeProjectId;
      if (currentProjectId) {
        socket.emit('project:join', currentProjectId);
      }

      // Perform catch up sync
      useActivityStore.getState().performCatchUpSync(currentProjectId || undefined);
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('presence:count', (data) => {
      set({
        onlineUsersCount: data.count,
        onlineUserIds: data.onlineUserIds || [],
      });
    });

    socket.on('notification:new', (notification) => {
      useNotificationStore.getState().handleSocketNotification(notification);
    });

    socket.on('task:updated', (task) => {
      useTaskStore.getState().handleSocketTaskUpdated(task);
    });

    socket.on('task:created', (task) => {
      useTaskStore.getState().handleSocketTaskCreated(task);
    });

    socket.on('activity:new', (activity) => {
      useActivityStore.getState().handleSocketActivity(activity);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  joinProject: (projectId: string) => {
    const socket = get().socket;
    const prevProject = get().activeProjectId;

    if (socket && prevProject && prevProject !== projectId) {
      socket.emit('project:leave', prevProject);
    }

    set({ activeProjectId: projectId });

    if (socket && socket.connected) {
      socket.emit('project:join', projectId);
    }
  },

  leaveProject: (projectId: string) => {
    const socket = get().socket;
    if (socket && socket.connected) {
      socket.emit('project:leave', projectId);
    }
    set({ activeProjectId: null });
  },

  syncActivity: async (projectId?: string, lastSeenTimestamp?: string) => {
    const socket = get().socket;
    if (!socket || !socket.connected) return;

    return new Promise((resolve) => {
      socket.emit(
        'activity:sync',
        { projectId, lastSeenTimestamp },
        (res) => {
          if (res.status === 'ok' && res.data) {
            useActivityStore.getState().setActivities(res.data);
          }
          resolve();
        }
      );
    });
  },
}));
