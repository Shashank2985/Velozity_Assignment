import { FastifyPluginAsync } from 'fastify';
import { authService } from './auth.service.js';
import { loginSchema, validate } from '../../lib/validation.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const input = validate(loginSchema, request.body);

    const signJwt = (payload: Parameters<typeof fastify.jwt.sign>[0]) => {
      return fastify.jwt.sign(payload);
    };

    const result = await authService.login(input.email, input.password, signJwt);

    reply.setCookie(REFRESH_COOKIE_NAME, result.rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      expires: result.expiresAt,
    });

    return reply.status(200).send({
      success: true,
      user: result.user,
      accessToken: result.accessToken,
    });
  });

  // POST /api/auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const rawRefreshToken = request.cookies[REFRESH_COOKIE_NAME];

    const signJwt = (payload: Parameters<typeof fastify.jwt.sign>[0]) => {
      return fastify.jwt.sign(payload);
    };

    const result = await authService.refresh(rawRefreshToken || '', signJwt);

    reply.setCookie(REFRESH_COOKIE_NAME, result.rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      expires: result.expiresAt,
    });

    return reply.status(200).send({
      success: true,
      user: result.user,
      accessToken: result.accessToken,
    });
  });

  // POST /api/auth/logout
  fastify.post('/logout', async (request, reply) => {
    const rawRefreshToken = request.cookies[REFRESH_COOKIE_NAME];
    await authService.logout(rawRefreshToken);

    reply.clearCookie(REFRESH_COOKIE_NAME, {
      path: '/api/auth',
    });

    return reply.status(200).send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  // GET /api/auth/me
  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = await authService.getMe(request.user.userId);
      return reply.status(200).send({
        success: true,
        user,
      });
    }
  );
};
