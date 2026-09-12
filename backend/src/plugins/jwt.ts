import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { JwtPayload } from '../types/auth.js';
import { UnauthorizedError } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  const accessSecret = process.env.JWT_ACCESS_SECRET || 'fallback-super-secret-access-key-32-chars';

  await fastify.register(fastifyCookie, {
    secret: process.env.JWT_REFRESH_SECRET || 'cookie-secret-key-32-chars-minimum-safe',
    hook: 'onRequest',
  });

  await fastify.register(fastifyJwt, {
    secret: accessSecret,
    sign: {
      expiresIn: process.env.ACCESS_TOKEN_TTL || '15m',
    },
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError('Invalid or expired access token', 'TOKEN_EXPIRED');
    }
  });
};

export default fp(jwtPlugin, {
  name: 'jwt-plugin',
});
