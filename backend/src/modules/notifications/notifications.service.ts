import { prisma } from '../../plugins/prisma.js';
import { NotificationDto } from '../../types/notifications.js';
import { TaskStatus } from '../../types/enums.js';
import { NotFoundError } from '../../lib/errors.js';

export class NotificationsService {
  async getUserNotifications(userId: string): Promise<{ notifications: NotificationDto[]; unreadCount: number }> {
    const [unreadCount, notifications] = await Promise.all([
      prisma.notification.count({
        where: { userId, read: false },
      }),
      prisma.notification.findMany({
        where: { userId },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              projectId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        taskId: n.taskId,
        task: n.task
          ? {
              id: n.task.id,
              title: n.task.title,
              status: n.task.status as unknown as TaskStatus,
              projectId: n.task.projectId,
            }
          : null,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationDto> {
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            projectId: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      taskId: updated.taskId,
      task: updated.task
        ? {
            id: updated.task.id,
            title: updated.task.title,
            status: updated.task.status as unknown as TaskStatus,
            projectId: updated.task.projectId,
          }
        : null,
      message: updated.message,
      read: updated.read,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const res = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { updatedCount: res.count };
  }
}

export const notificationsService = new NotificationsService();
