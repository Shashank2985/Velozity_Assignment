import { FastifyPluginAsync } from 'fastify';
import { activityService } from './activity.service.js';
import { ActivityFilterParams } from '../../types/activity.js';

export const activityRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/activity (Scoped activity feed + catch-up sync)
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const filters = request.query as ActivityFilterParams;
      const activities = await activityService.getActivityLogs(request.user, {
        ...filters,
        limit: filters.limit ? parseInt(String(filters.limit), 10) : 50,
      });

      return reply.status(200).send({
        success: true,
        activities,
      });
    }
  );
};
