import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisClient, redisClient } from '../lib/redis.js';
import { ServerToClientEvents, ClientToServerEvents } from '../types/socket-events.js';
import { JwtPayload } from '../types/auth.js';
import { Role, TaskStatus } from '../types/enums.js';
import { TaskDto } from '../types/tasks.js';
import { TaskActivityLogDto } from '../types/activity.js';
import { NotificationDto } from '../types/notifications.js';
import { prisma } from './prisma.js';
import { toUserDto } from '../modules/auth/auth.service.js';

export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, { user: JwtPayload }>;

export type AppSocketServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, { user: JwtPayload }>;

let ioInstance: AppSocketServer | null = null;

export function getIO(): AppSocketServer | null {
  return ioInstance;
}

export function broadcastTaskCreated(task: TaskDto) {
  if (!ioInstance) return;
  ioInstance.to(`project:${task.projectId}`).to('admin:global').emit('task:created', task);
  if (task.project?.pmId) {
    ioInstance.to(`pm:${task.project.pmId}`).emit('task:created', task);
  }
}

export function broadcastTaskUpdated(task: TaskDto) {
  if (!ioInstance) return;
  let target = ioInstance.to(`project:${task.projectId}`).to('admin:global').to(`user:${task.assigneeId}`);
  if (task.project?.pmId) {
    target = target.to(`pm:${task.project.pmId}`);
  }
  target.emit('task:updated', task);
}

export function broadcastActivity(activity: TaskActivityLogDto, projectId?: string, pmId?: string) {
  if (!ioInstance) return;
  let target = ioInstance.to('admin:global');
  if (projectId) {
    target = target.to(`project:${projectId}`);
  }
  if (pmId) {
    target = target.to(`pm:${pmId}`);
  }
  target.emit('activity:new', activity);
}

export function broadcastNotification(notification: NotificationDto) {
  if (!ioInstance) return;
  ioInstance.to(`user:${notification.userId}`).emit('notification:new', notification);
}

async function updatePresenceCount(io: AppSocketServer) {
  try {
    if (redisClient.status !== 'ready' && redisClient.status !== 'connect') return;
    const onlineUserIds = await redisClient.smembers('online:users');
    io.emit('presence:count', {
      count: onlineUserIds.length,
      onlineUserIds,
    });
  } catch (err) {
    // Suppress presence count error on shutdown
  }
}

const socketPlugin: FastifyPluginAsync = async (fastify) => {
  const io: AppSocketServer = new SocketIOServer(fastify.server, {
    cors: {
      origin: true,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  let pubClient: ReturnType<typeof createRedisClient> | null = null;
  let subClient: ReturnType<typeof createRedisClient> | null = null;

  // 1. Setup Redis pub/sub adapter
  try {
    pubClient = createRedisClient();
    pubClient.on('error', () => {});
    subClient = createRedisClient();
    subClient.on('error', () => {});
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.io Redis adapter connected.');
  } catch (err) {
    console.warn('⚠️ Redis adapter not available for Socket.io, falling back to in-memory adapter:', err);
  }

  // 2. JWT Handshake Authentication Middleware
  io.use(async (socket: AppSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.slice(7)
          : null);

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = await fastify.jwt.verify<JwtPayload>(token);
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired authentication token'));
    }
  });

  // 3. Socket Connection & Room Routing
  io.on('connection', async (socket: AppSocket) => {
    const user = socket.data.user;
    if (!user) return;

    // Join private user room
    socket.join(`user:${user.userId}`);

    // Join role-specific broadcast rooms
    if (user.role === Role.ADMIN) {
      socket.join('admin:global');
    } else if (user.role === Role.PM) {
      socket.join(`pm:${user.userId}`);
    }

    // 1. Dynamic room join / leave
    socket.on('project:join', (projectId: string) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('project:leave', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    // 2. Catch-up sync RPC
    (socket as any).on('activity:sync', async (payload: any, callback: any) => {
      try {
        const where: Record<string, any> = {};

        if (user.role === Role.PM) {
          where.task = { project: { pmId: user.userId } };
        } else if (user.role === Role.DEVELOPER) {
          where.task = { assigneeId: user.userId };
        }

        if (payload && payload.projectId) {
          where.task = {
            ...(where.task || {}),
            projectId: payload.projectId,
          };
        }

        if (payload && payload.lastSeenTimestamp) {
          where.createdAt = {
            gt: new Date(payload.lastSeenTimestamp),
          };
        }

        const logs = await prisma.taskActivityLog.findMany({
          where,
          include: {
            actor: true,
            task: {
              select: {
                id: true,
                title: true,
                projectId: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        const formatted: TaskActivityLogDto[] = logs.map((log) => ({
          id: log.id,
          taskId: log.taskId,
          task: log.task
            ? {
                id: log.task.id,
                title: log.task.title,
                projectId: log.task.projectId,
                status: log.task.status as unknown as TaskStatus,
              }
            : undefined,
          actorId: log.actorId,
          actor: log.actor ? toUserDto(log.actor) : undefined,
          fromStatus: log.fromStatus ? (log.fromStatus as unknown as TaskStatus) : null,
          toStatus: log.toStatus as unknown as TaskStatus,
          createdAt: log.createdAt.toISOString(),
        }));

        if (typeof callback === 'function') {
          callback({ status: 'ok', data: formatted });
        }
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ status: 'error', error: err.message });
        }
      }
    });

    socket.on('disconnect', async () => {
      try {
        if (redisClient.status === 'ready' || redisClient.status === 'connect') {
          const socketsInRoom = await io.in(`user:${user.userId}`).fetchSockets();
          if (socketsInRoom.length === 0) {
            await redisClient.srem('online:users', user.userId);
            await updatePresenceCount(io);
          }
        }
      } catch (err) {
        // Suppress presence cleanup error on shutdown
      }
    });

    // 4. Record presence after event listeners are attached
    try {
      await redisClient.sadd('online:users', user.userId);
      await updatePresenceCount(io);
    } catch (err) {
      console.error('Error recording presence:', err);
    }
  });

  ioInstance = io;
  fastify.decorate('io', io);

  fastify.addHook('onClose', async () => {
    io.disconnectSockets(true);
    io.close();
    if (ioInstance === io) {
      ioInstance = null;
    }
    if (pubClient) {
      pubClient.disconnect();
      pubClient = null;
    }
    if (subClient) {
      subClient.disconnect();
      subClient = null;
    }
  });
};

export default fp(socketPlugin, {
  name: 'socket-plugin',
  dependencies: ['jwt-plugin'],
});
