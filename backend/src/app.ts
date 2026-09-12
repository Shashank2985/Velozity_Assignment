import Fastify, { FastifyError, FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import prismaPlugin from './plugins/prisma.js';
import jwtPlugin from './plugins/jwt.js';
import socketPlugin from './plugins/socket.js';
import { AppError } from './lib/errors.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { clientRoutes } from './modules/clients/clients.routes.js';
import { projectRoutes } from './modules/projects/projects.routes.js';
import { taskRoutes } from './modules/tasks/tasks.routes.js';
import { activityRoutes } from './modules/activity/activity.routes.js';
import { notificationRoutes } from './modules/notifications/notifications.routes.js';

dotenv.config();

export function buildApp(opts: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : {
            transport:
              process.env.NODE_ENV === 'development'
                ? {
                    target: 'pino-pretty',
                    options: {
                      translateTime: 'HH:MM:ss Z',
                      ignore: 'pid,hostname',
                    },
                  }
                : undefined,
          },
    ...opts,
  });

  // 1. CORS plugin
  app.register(cors, {
    origin: (origin, cb) => {
      // Allow all local origins (localhost, 127.0.0.1, LAN IPs) and non-browser requests
      cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // 2. Core plugins
  app.register(prismaPlugin);
  app.register(jwtPlugin);
  app.register(socketPlugin);

  // 3. Centralized error handling
  app.setErrorHandler((error: FastifyError | Error | any, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          details: error.details,
        },
      });
    }

    if (error && typeof error === 'object' && 'validation' in error && error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          message: error.message || 'Validation error',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: error.validation,
        },
      });
    }

    request.log.error(error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return reply.status(500).send({
      success: false,
      error: {
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : errorMessage,
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      },
    });
  });

  // 4. Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // 5. Register feature routes
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(userRoutes, { prefix: '/api/users' });
  app.register(clientRoutes, { prefix: '/api/clients' });
  app.register(projectRoutes, { prefix: '/api/projects' });
  app.register(taskRoutes, { prefix: '/api/tasks' });
  app.register(activityRoutes, { prefix: '/api/activity' });
  app.register(notificationRoutes, { prefix: '/api/notifications' });

  return app;
}
