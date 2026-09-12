import { FastifyPluginAsync } from 'fastify';
import { clientsService } from './clients.service.js';
import { createClientSchema, validate } from '../../lib/validation.js';
import { requireRole } from '../../plugins/rbac.js';
import { Role } from '../../types/enums.js';

export const clientRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/clients
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (_request, reply) => {
      const clients = await clientsService.getClients();
      return reply.status(200).send({
        success: true,
        clients,
      });
    }
  );

  // POST /api/clients (Admin only)
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate, requireRole(Role.ADMIN)],
    },
    async (request, reply) => {
      const input = validate(createClientSchema, request.body);
      const client = await clientsService.createClient(input.name);

      return reply.status(201).send({
        success: true,
        client,
      });
    }
  );
};
