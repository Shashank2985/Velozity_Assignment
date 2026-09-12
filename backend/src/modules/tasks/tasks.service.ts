import { prisma } from '../../plugins/prisma.js';
import { JwtPayload } from '../../types/auth.js';
import { CreateTaskDto, TaskDto, TaskFilterParams, UpdateTaskDto } from '../../types/tasks.js';
import { Role, TaskStatus } from '../../types/enums.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { assertProjectAccess, assertTaskAccess } from '../../plugins/rbac.js';
import { toUserDto } from '../auth/auth.service.js';
import {
  broadcastActivity,
  broadcastNotification,
  broadcastTaskCreated,
  broadcastTaskUpdated,
} from '../../plugins/socket.js';

interface RawTaskWithRelations {
  id: string;
  title: string;
  description: string;
  projectId: string;
  assigneeId: string;
  status: TaskStatus;
  priority: any;
  dueDate: Date;
  isOverdue: boolean;
  createdAt: Date;
  updatedAt: Date;
  project?: {
    id: string;
    name: string;
    clientId: string;
    pmId: string;
    createdAt: Date;
    client?: { id: string; name: string };
    pm?: { id: string; name: string; email: string; role: Role | string; createdAt: Date };
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
    role: Role | string;
    createdAt: Date;
  };
}

export function formatTaskDto(task: RawTaskWithRelations): TaskDto {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    projectId: task.projectId,
    project: task.project
      ? {
          id: task.project.id,
          name: task.project.name,
          clientId: task.project.clientId,
          client: task.project.client,
          pmId: task.project.pmId,
          pm: task.project.pm ? toUserDto(task.project.pm) : undefined,
          createdAt: task.project.createdAt.toISOString(),
        }
      : undefined,
    assigneeId: task.assigneeId,
    assignee: task.assignee ? toUserDto(task.assignee) : undefined,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate.toISOString(),
    isOverdue: task.isOverdue,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export class TasksService {
  async getTasks(
    user: JwtPayload,
    filters: TaskFilterParams
  ): Promise<{ tasks: TaskDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    // 1. Role-based scoping
    if (user.role === Role.PM) {
      where.project = { pmId: user.userId };
    } else if (user.role === Role.DEVELOPER) {
      where.assigneeId = user.userId;
    }

    // 2. Project filter
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    // 3. Assignee filter (Admin/PM can filter by assignee; for Dev it's already scoped)
    if (filters.assigneeId && user.role !== Role.DEVELOPER) {
      where.assigneeId = filters.assigneeId;
    }

    // 4. Status filter
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    // 5. Priority filter
    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        where.priority = { in: filters.priority };
      } else {
        where.priority = filters.priority;
      }
    }

    // 6. Overdue filter
    if (typeof filters.isOverdue === 'boolean') {
      where.isOverdue = filters.isOverdue;
    }

    // 7. Date range filter
    if (filters.dueFrom || filters.dueTo) {
      where.dueDate = {};
      if (filters.dueFrom) {
        where.dueDate.gte = new Date(filters.dueFrom);
      }
      if (filters.dueTo) {
        where.dueDate.lte = new Date(filters.dueTo);
      }
    }

    // 8. Search query filter
    if (filters.search && filters.search.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        include: {
          project: {
            include: {
              client: true,
              pm: true,
            },
          },
          assignee: true,
        },
        skip,
        take: limit,
        orderBy: {
          [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc',
        },
      }),
    ]);

    return {
      tasks: tasks.map((t) => formatTaskDto(t as unknown as RawTaskWithRelations)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTaskById(user: JwtPayload, taskId: string): Promise<TaskDto> {
    await assertTaskAccess(user, taskId);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            client: true,
            pm: true,
          },
        },
        assignee: true,
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    return formatTaskDto(task as unknown as RawTaskWithRelations);
  }

  async createTask(user: JwtPayload, data: CreateTaskDto): Promise<TaskDto> {
    const project = await assertProjectAccess(user, data.projectId);

    const assignee = await prisma.user.findUnique({
      where: { id: data.assigneeId },
    });
    if (!assignee) {
      throw new NotFoundError('Assignee user not found');
    }

    const dueDateObj = new Date(data.dueDate);
    const initialStatus = data.status || TaskStatus.TODO;
    const isOverdue = dueDateObj < new Date() && initialStatus !== TaskStatus.DONE;

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || '',
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        priority: data.priority,
        dueDate: dueDateObj,
        status: initialStatus,
        isOverdue,
      },
      include: {
        project: {
          include: {
            client: true,
            pm: true,
          },
        },
        assignee: true,
      },
    });

    // 1. Log activity
    const activityLog = await prisma.taskActivityLog.create({
      data: {
        taskId: task.id,
        actorId: user.userId,
        fromStatus: null,
        toStatus: initialStatus,
      },
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
    });

    broadcastActivity(
      {
        id: activityLog.id,
        taskId: activityLog.taskId,
        task: activityLog.task
          ? {
              id: activityLog.task.id,
              title: activityLog.task.title,
              projectId: activityLog.task.projectId,
              status: activityLog.task.status as unknown as TaskStatus,
            }
          : undefined,
        actorId: activityLog.actorId,
        actor: activityLog.actor ? toUserDto(activityLog.actor) : undefined,
        fromStatus: null,
        toStatus: activityLog.toStatus as unknown as TaskStatus,
        createdAt: activityLog.createdAt.toISOString(),
      },
      data.projectId,
      project.pmId
    );

    // 2. Create notification for assignee
    const notification = await prisma.notification.create({
      data: {
        userId: data.assigneeId,
        taskId: task.id,
        message: `You were assigned a new task: "${task.title}" in project "${project.name}".`,
        read: false,
      },
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

    broadcastNotification({
      id: notification.id,
      userId: notification.userId,
      taskId: notification.taskId,
      task: notification.task
        ? {
            id: notification.task.id,
            title: notification.task.title,
            status: notification.task.status as unknown as TaskStatus,
            projectId: notification.task.projectId,
          }
        : null,
      message: notification.message,
      read: notification.read,
      createdAt: notification.createdAt.toISOString(),
    });

    const taskDto = formatTaskDto(task as unknown as RawTaskWithRelations);
    broadcastTaskCreated(taskDto);

    return taskDto;
  }

  async updateTask(user: JwtPayload, taskId: string, data: UpdateTaskDto): Promise<TaskDto> {
    const existing = await assertTaskAccess(user, taskId);

    if (user.role === Role.DEVELOPER) {
      // Developers can only update status
      if (data.title || data.description !== undefined || data.assigneeId || data.priority || data.dueDate) {
        throw new ForbiddenError('Developers can only transition the task status');
      }
    }

    const dueDateObj = data.dueDate ? new Date(data.dueDate) : existing.dueDate;
    const targetStatus = data.status || existing.status;
    const isOverdue = targetStatus === TaskStatus.DONE ? false : dueDateObj < new Date();

    const oldAssigneeId = existing.assigneeId;
    const statusChanged = data.status && data.status !== existing.status;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        priority: data.priority,
        dueDate: data.dueDate ? dueDateObj : undefined,
        status: data.status,
        isOverdue,
      },
      include: {
        project: {
          include: {
            client: true,
            pm: true,
          },
        },
        assignee: true,
      },
    });

    const taskDto = formatTaskDto(updated as unknown as RawTaskWithRelations);

    // 1. Log status transition if status changed
    if (statusChanged && data.status) {
      const activityLog = await prisma.taskActivityLog.create({
        data: {
          taskId: taskId,
          actorId: user.userId,
          fromStatus: existing.status,
          toStatus: data.status,
        },
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
      });

      broadcastActivity(
        {
          id: activityLog.id,
          taskId: activityLog.taskId,
          task: activityLog.task
            ? {
                id: activityLog.task.id,
                title: activityLog.task.title,
                projectId: activityLog.task.projectId,
                status: activityLog.task.status as unknown as TaskStatus,
              }
            : undefined,
          actorId: activityLog.actorId,
          actor: activityLog.actor ? toUserDto(activityLog.actor) : undefined,
          fromStatus: activityLog.fromStatus as unknown as TaskStatus,
          toStatus: activityLog.toStatus as unknown as TaskStatus,
          createdAt: activityLog.createdAt.toISOString(),
        },
        updated.projectId,
        existing.project.pmId
      );

      // If moved to IN_REVIEW, notify PM
      if (data.status === TaskStatus.IN_REVIEW) {
        const notif = await prisma.notification.create({
          data: {
            userId: existing.project.pmId,
            taskId: taskId,
            message: `Task "${updated.title}" was moved to IN_REVIEW by ${user.name}.`,
            read: false,
          },
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

        broadcastNotification({
          id: notif.id,
          userId: notif.userId,
          taskId: notif.taskId,
          task: notif.task
            ? {
                id: notif.task.id,
                title: notif.task.title,
                status: notif.task.status as unknown as TaskStatus,
                projectId: notif.task.projectId,
              }
            : null,
          message: notif.message,
          read: notif.read,
          createdAt: notif.createdAt.toISOString(),
        });
      }
    }

    // 2. Notify new assignee if reassigned
    if (data.assigneeId && data.assigneeId !== oldAssigneeId) {
      const notif = await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          taskId: taskId,
          message: `Task "${updated.title}" was assigned to you.`,
          read: false,
        },
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

      broadcastNotification({
        id: notif.id,
        userId: notif.userId,
        taskId: notif.taskId,
        task: notif.task
          ? {
              id: notif.task.id,
              title: notif.task.title,
              status: notif.task.status as unknown as TaskStatus,
              projectId: notif.task.projectId,
            }
          : null,
        message: notif.message,
        read: notif.read,
        createdAt: notif.createdAt.toISOString(),
      });
    }

    broadcastTaskUpdated(taskDto);

    return taskDto;
  }

  async updateTaskStatus(user: JwtPayload, taskId: string, newStatus: TaskStatus): Promise<TaskDto> {
    const existing = await assertTaskAccess(user, taskId);

    if (existing.status === newStatus) {
      return formatTaskDto(existing as unknown as RawTaskWithRelations);
    }

    const isOverdue = newStatus === TaskStatus.DONE ? false : existing.dueDate < new Date();

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        isOverdue,
      },
      include: {
        project: {
          include: {
            client: true,
            pm: true,
          },
        },
        assignee: true,
      },
    });

    const taskDto = formatTaskDto(updated as unknown as RawTaskWithRelations);

    // 1. Log activity transition
    const activityLog = await prisma.taskActivityLog.create({
      data: {
        taskId,
        actorId: user.userId,
        fromStatus: existing.status,
        toStatus: newStatus,
      },
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
    });

    broadcastActivity(
      {
        id: activityLog.id,
        taskId: activityLog.taskId,
        task: activityLog.task
          ? {
              id: activityLog.task.id,
              title: activityLog.task.title,
              projectId: activityLog.task.projectId,
              status: activityLog.task.status as unknown as TaskStatus,
            }
          : undefined,
        actorId: activityLog.actorId,
        actor: activityLog.actor ? toUserDto(activityLog.actor) : undefined,
        fromStatus: activityLog.fromStatus as unknown as TaskStatus,
        toStatus: activityLog.toStatus as unknown as TaskStatus,
        createdAt: activityLog.createdAt.toISOString(),
      },
      updated.projectId,
      existing.project.pmId
    );

    // 2. If moved to IN_REVIEW, notify PM
    if (newStatus === TaskStatus.IN_REVIEW) {
      const notif = await prisma.notification.create({
        data: {
          userId: existing.project.pmId,
          taskId,
          message: `Task "${updated.title}" was moved to IN_REVIEW by ${user.name}.`,
          read: false,
        },
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

      broadcastNotification({
        id: notif.id,
        userId: notif.userId,
        taskId: notif.taskId,
        task: notif.task
          ? {
              id: notif.task.id,
              title: notif.task.title,
              status: notif.task.status as unknown as TaskStatus,
              projectId: notif.task.projectId,
            }
          : null,
        message: notif.message,
        read: notif.read,
        createdAt: notif.createdAt.toISOString(),
      });
    }

    broadcastTaskUpdated(taskDto);

    return taskDto;
  }

  async deleteTask(user: JwtPayload, taskId: string): Promise<void> {
    const existing = await assertTaskAccess(user, taskId);

    if (user.role === Role.DEVELOPER) {
      throw new ForbiddenError('Developers cannot delete tasks');
    }

    await prisma.task.delete({
      where: { id: taskId },
    });
  }
}

export const tasksService = new TasksService();
