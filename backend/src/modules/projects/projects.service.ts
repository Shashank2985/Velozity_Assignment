import { prisma } from '../../plugins/prisma.js';
import { JwtPayload } from '../../types/auth.js';
import { CreateProjectDto, ProjectDto, UpdateProjectDto } from '../../types/projects.js';
import { Role, TaskStatus } from '../../types/enums.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { assertProjectAccess } from '../../plugins/rbac.js';
import { toUserDto } from '../auth/auth.service.js';

interface RawProjectWithRelations {
  id: string;
  name: string;
  clientId: string;
  pmId: string;
  createdAt: Date;
  client: { id: string; name: string };
  pm: { id: string; name: string; email: string; role: Role | string; createdAt: Date };
  tasks?: Array<{ status: TaskStatus; isOverdue: boolean }>;
}

function formatProjectDto(project: RawProjectWithRelations): ProjectDto {
  const tasks = project.tasks || [];
  const tasksCount = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === TaskStatus.TODO).length,
    inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
    inReview: tasks.filter((t) => t.status === TaskStatus.IN_REVIEW).length,
    done: tasks.filter((t) => t.status === TaskStatus.DONE).length,
    overdue: tasks.filter((t) => t.isOverdue).length,
  };

  return {
    id: project.id,
    name: project.name,
    clientId: project.clientId,
    client: {
      id: project.client.id,
      name: project.client.name,
    },
    pmId: project.pmId,
    pm: toUserDto(project.pm),
    tasksCount,
    createdAt: project.createdAt.toISOString(),
  };
}

export class ProjectsService {
  async getProjects(user: JwtPayload): Promise<ProjectDto[]> {
    let whereCondition: Record<string, unknown> = {};

    if (user.role === Role.ADMIN) {
      whereCondition = {};
    } else if (user.role === Role.PM) {
      whereCondition = { pmId: user.userId };
    } else if (user.role === Role.DEVELOPER) {
      whereCondition = {
        tasks: {
          some: {
            assigneeId: user.userId,
          },
        },
      };
    }

    const projects = await prisma.project.findMany({
      where: whereCondition,
      include: {
        client: true,
        pm: true,
        tasks: {
          select: {
            status: true,
            isOverdue: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => formatProjectDto(p as unknown as RawProjectWithRelations));
  }

  async getProjectById(user: JwtPayload, projectId: string): Promise<ProjectDto> {
    await assertProjectAccess(user, projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        pm: true,
        tasks: {
          select: {
            status: true,
            isOverdue: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return formatProjectDto(project as unknown as RawProjectWithRelations);
  }

  async createProject(user: JwtPayload, data: CreateProjectDto): Promise<ProjectDto> {
    // If PM creates project, enforce pmId to be their own ID
    const effectivePmId = user.role === Role.PM ? user.userId : data.pmId;

    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    });
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    const pm = await prisma.user.findUnique({
      where: { id: effectivePmId },
    });
    if (!pm || (pm.role !== Role.PM && pm.role !== Role.ADMIN)) {
      throw new NotFoundError('Assigned PM not found or is not a Project Manager');
    }

    const created = await prisma.project.create({
      data: {
        name: data.name,
        clientId: data.clientId,
        pmId: effectivePmId,
      },
      include: {
        client: true,
        pm: true,
        tasks: {
          select: {
            status: true,
            isOverdue: true,
          },
        },
      },
    });

    return formatProjectDto(created as unknown as RawProjectWithRelations);
  }

  async updateProject(user: JwtPayload, projectId: string, data: UpdateProjectDto): Promise<ProjectDto> {
    await assertProjectAccess(user, projectId);

    if (user.role === Role.DEVELOPER) {
      throw new ForbiddenError('Developers cannot modify project settings');
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: data.name,
        clientId: data.clientId,
        pmId: user.role === Role.ADMIN ? data.pmId : undefined,
      },
      include: {
        client: true,
        pm: true,
        tasks: {
          select: {
            status: true,
            isOverdue: true,
          },
        },
      },
    });

    return formatProjectDto(updated as unknown as RawProjectWithRelations);
  }

  async deleteProject(user: JwtPayload, projectId: string): Promise<void> {
    await assertProjectAccess(user, projectId);

    if (user.role === Role.DEVELOPER) {
      throw new ForbiddenError('Developers cannot delete projects');
    }

    await prisma.project.delete({
      where: { id: projectId },
    });
  }
}

export const projectsService = new ProjectsService();
