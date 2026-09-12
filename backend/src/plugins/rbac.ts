import { FastifyReply, FastifyRequest } from 'fastify';
import { Role } from '../types/enums.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';
import { prisma } from './prisma.js';
import { JwtPayload } from '../types/auth.js';

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenError(`Forbidden: Requires one of [${roles.join(', ')}]`);
    }
  };
}

export async function assertProjectAccess(user: JwtPayload, projectId: string) {
  if (user.role === Role.ADMIN) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('Project not found');
    return project;
  }

  if (user.role === Role.PM) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, pmId: user.userId },
    });
    if (!project) {
      throw new ForbiddenError('You do not have access to this project');
    }
    return project;
  }

  if (user.role === Role.DEVELOPER) {
    const hasAssignedTask = await prisma.task.findFirst({
      where: { projectId, assigneeId: user.userId },
    });
    if (!hasAssignedTask) {
      throw new ForbiddenError('You do not have access to this project');
    }
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('Project not found');
    return project;
  }

  throw new ForbiddenError('Insufficient permissions');
}

export async function assertTaskAccess(user: JwtPayload, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  if (user.role === Role.ADMIN) {
    return task;
  }

  if (user.role === Role.PM) {
    if (task.project.pmId !== user.userId) {
      throw new ForbiddenError('You do not have access to tasks in this project');
    }
    return task;
  }

  if (user.role === Role.DEVELOPER) {
    if (task.assigneeId !== user.userId) {
      throw new ForbiddenError('You can only access or modify tasks assigned to you');
    }
    return task;
  }

  throw new ForbiddenError('Insufficient permissions');
}

export function buildScopedTaskWhere(user: JwtPayload, additionalFilters: Record<string, unknown> = {}) {
  const baseWhere: Record<string, unknown> = { ...additionalFilters };

  if (user.role === Role.ADMIN) {
    return baseWhere;
  }

  if (user.role === Role.PM) {
    return {
      ...baseWhere,
      project: {
        pmId: user.userId,
      },
    };
  }

  if (user.role === Role.DEVELOPER) {
    return {
      ...baseWhere,
      assigneeId: user.userId,
    };
  }

  return { id: '__no_access__' };
}
