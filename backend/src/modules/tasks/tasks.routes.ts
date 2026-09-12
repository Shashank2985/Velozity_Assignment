import { FastifyPluginAsync } from 'fastify';
import { tasksService } from './tasks.service.js';
import {
  createTaskSchema,
  taskQuerySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  validate,
} from '../../lib/validation.js';
import { requireRole } from '../../plugins/rbac.js';
import { Role } from '../../types/enums.js';

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tasks (Dynamic multi-field filtering + pagination)
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const filters = validate(taskQuerySchema, request.query);
      const result = await tasksService.getTasks(request.user, filters);

      return reply.status(200).send({
        success: true,
        ...result,
      });
    }
  );

  // GET /api/tasks/:id
  fastify.get(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const task = await tasksService.getTaskById(request.user, id);

      return reply.status(200).send({
        success: true,
        task,
      });
    }
  );

  // POST /api/tasks (Admin, PM)
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate, requireRole(Role.ADMIN, Role.PM)],
    },
    async (request, reply) => {
      const input = validate(createTaskSchema, request.body);
      const task = await tasksService.createTask(request.user, input);

      return reply.status(201).send({
        success: true,
        task,
      });
    }
  );

  // PATCH /api/tasks/:id (Admin, PM full edit; Dev status edit)
  fastify.patch(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = validate(updateTaskSchema, request.body);
      const task = await tasksService.updateTask(request.user, id, input);

      return reply.status(200).send({
        success: true,
        task,
      });
    }
  );

  // PATCH /api/tasks/:id/status (Fast dedicated status transition)
  fastify.patch(
    '/:id/status',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = validate(updateTaskStatusSchema, request.body);
      const task = await tasksService.updateTaskStatus(request.user, id, input.status);

      return reply.status(200).send({
        success: true,
        task,
      });
    }
  );

  // DELETE /api/tasks/:id (Admin, PM only)
  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate, requireRole(Role.ADMIN, Role.PM)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await tasksService.deleteTask(request.user, id);

      return reply.status(200).send({
        success: true,
        message: 'Task deleted successfully',
      });
    }
  );
};
