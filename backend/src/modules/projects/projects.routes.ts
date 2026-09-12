import { FastifyPluginAsync } from 'fastify';
import { projectsService } from './projects.service.js';
import { createProjectSchema, updateProjectSchema, validate } from '../../lib/validation.js';
import { requireRole } from '../../plugins/rbac.js';
import { Role } from '../../types/enums.js';

export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/projects (Scoped to user's role)
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const projects = await projectsService.getProjects(request.user);
      return reply.status(200).send({
        success: true,
        projects,
      });
    }
  );

  // GET /api/projects/:id
  fastify.get(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const project = await projectsService.getProjectById(request.user, id);
      return reply.status(200).send({
        success: true,
        project,
      });
    }
  );

  // POST /api/projects (Admin, PM)
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate, requireRole(Role.ADMIN, Role.PM)],
    },
    async (request, reply) => {
      const input = validate(createProjectSchema, request.body);
      const project = await projectsService.createProject(request.user, input);
      return reply.status(201).send({
        success: true,
        project,
      });
    }
  );

  // PATCH /api/projects/:id (Admin, PM)
  fastify.patch(
    '/:id',
    {
      onRequest: [fastify.authenticate, requireRole(Role.ADMIN, Role.PM)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = validate(updateProjectSchema, request.body);
      const project = await projectsService.updateProject(request.user, id, input);
      return reply.status(200).send({
        success: true,
        project,
      });
    }
  );

  // DELETE /api/projects/:id (Admin only)
  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate, requireRole(Role.ADMIN)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await projectsService.deleteProject(request.user, id);
      return reply.status(200).send({
        success: true,
        message: 'Project deleted successfully',
      });
    }
  );
};
