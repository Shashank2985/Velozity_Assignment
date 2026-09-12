import { FastifyPluginAsync } from 'fastify';
import { notificationsService } from './notifications.service.js';

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/notifications
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const result = await notificationsService.getUserNotifications(request.user.userId);
      return reply.status(200).send({
        success: true,
        ...result,
      });
    }
  );

  // PATCH /api/notifications/:id/read
  fastify.patch(
    '/:id/read',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const notification = await notificationsService.markAsRead(request.user.userId, id);

      return reply.status(200).send({
        success: true,
        notification,
      });
    }
  );

  // PATCH /api/notifications/read-all
  fastify.patch(
    '/read-all',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const result = await notificationsService.markAllAsRead(request.user.userId);

      return reply.status(200).send({
        success: true,
        ...result,
      });
    }
  );
};
