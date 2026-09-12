import { prisma } from '../../plugins/prisma.js';
import { JwtPayload } from '../../types/auth.js';
import { ActivityFilterParams, TaskActivityLogDto } from '../../types/activity.js';
import { Role, TaskStatus } from '../../types/enums.js';
import { toUserDto } from '../auth/auth.service.js';

export class ActivityService {
  async getActivityLogs(user: JwtPayload, filters: ActivityFilterParams = {}): Promise<TaskActivityLogDto[]> {
    const limit = filters.limit ? Math.min(filters.limit, 100) : 50;
    const where: Record<string, any> = {};

    // 1. Role scoping
    if (user.role === Role.PM) {
      where.task = { project: { pmId: user.userId } };
    } else if (user.role === Role.DEVELOPER) {
      where.task = { assigneeId: user.userId };
    }

    // 2. Project filter
    if (filters.projectId) {
      where.task = {
        ...(where.task || {}),
        projectId: filters.projectId,
      };
    }

    // 3. Task filter
    if (filters.taskId) {
      where.taskId = filters.taskId;
    }

    // 4. Catch-up timestamp filter
    if (filters.lastSeenTimestamp) {
      where.createdAt = {
        gt: new Date(filters.lastSeenTimestamp),
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
      take: limit,
    });

    return logs.map((log) => ({
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
  }
}

export const activityService = new ActivityService();
