import { TaskActivityLogDto } from './activity';
import { NotificationDto } from './notifications';
import { TaskDto } from './tasks';

export interface ServerToClientEvents {
  'activity:new': (activity: TaskActivityLogDto) => void;
  'notification:new': (notification: NotificationDto) => void;
  'task:updated': (task: TaskDto) => void;
  'task:created': (task: TaskDto) => void;
  'presence:count': (data: { count: number; onlineUserIds?: string[] }) => void;
  'error': (err: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  'activity:sync': (
    payload: { projectId?: string; lastSeenTimestamp?: string },
    callback: (response: { status: 'ok' | 'error'; data?: TaskActivityLogDto[]; error?: string }) => void
  ) => void;
  'project:join': (projectId: string) => void;
  'project:leave': (projectId: string) => void;
  'ping': () => void;
}
