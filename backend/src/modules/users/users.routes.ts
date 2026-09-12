import { FastifyPluginAsync } from 'fastify';
import { usersService } from './users.service.js';
import { Role } from '../../types/enums.js';

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/users
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { role } = request.query as { role?: Role };
      const users = await usersService.getUsers(role);

      return reply.status(200).send({
        success: true,
        users,
      });
    }
  );

  // GET /api/users/:id
  fastify.get(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await usersService.getUserById(id);

      return reply.status(200).send({
        success: true,
        user,
      });
    }
  );
};
