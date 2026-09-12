import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { requireRole } from '../src/plugins/rbac.js';
import { Role } from '../src/types/enums.js';
import { prisma } from '../src/plugins/prisma.js';

describe('Phase 3: Authentication & RBAC Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();

    // Register test endpoints for RBAC verification inside plugin scope
    app.register(async (instance) => {
      instance.get(
        '/test/admin-only',
        {
          onRequest: [instance.authenticate, requireRole(Role.ADMIN)],
        },
        async () => ({ success: true, message: 'Welcome Admin' })
      );

      instance.get(
        '/test/pm-and-admin',
        {
          onRequest: [instance.authenticate, requireRole(Role.ADMIN, Role.PM)],
        },
        async () => ({ success: true, message: 'Welcome PM or Admin' })
      );
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('should successfully log in an Admin user and set HttpOnly refresh cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@velozity.com',
          password: 'Password123!',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.user.email).toBe('admin@velozity.com');
      expect(body.user.role).toBe(Role.ADMIN);
      expect(body.accessToken).toBeDefined();

      const cookies = res.cookies;
      const refreshCookie = cookies.find((c) => c.name === 'refreshToken');
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie?.httpOnly).toBe(true);
      expect(refreshCookie?.path).toBe('/api/auth');
    });

    it('should successfully log in a PM and a Developer', async () => {
      // PM
      const pmRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'pm.alice@velozity.com',
          password: 'Password123!',
        },
      });
      expect(pmRes.statusCode).toBe(200);
      const pmBody = JSON.parse(pmRes.payload);
      expect(pmBody.user.role).toBe(Role.PM);

      // Dev
      const devRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'dev.carol@velozity.com',
          password: 'Password123!',
        },
      });
      expect(devRes.statusCode).toBe(200);
      const devBody = JSON.parse(devRes.payload);
      expect(devBody.user.role).toBe(Role.DEVELOPER);
    });

    it('should reject login with wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@velozity.com',
          password: 'WrongPassword!',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@velozity.com',
          password: 'Password123!',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should fail validation on malformed email or missing password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'not-an-email',
          password: '',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info when authenticated with valid Bearer token', async () => {
      // First login
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'pm.alice@velozity.com',
          password: 'Password123!',
        },
      });
      const { accessToken } = JSON.parse(loginRes.payload);

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(meRes.statusCode).toBe(200);
      const meBody = JSON.parse(meRes.payload);
      expect(meBody.success).toBe(true);
      expect(meBody.user.email).toBe('pm.alice@velozity.com');
      expect(meBody.user.role).toBe(Role.PM);
    });

    it('should reject request without Bearer token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should rotate refresh token and issue a new access token', async () => {
      // 1. Login to get initial cookies
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'dev.carol@velozity.com',
          password: 'Password123!',
        },
      });

      const refreshCookie = loginRes.cookies.find((c) => c.name === 'refreshToken');
      expect(refreshCookie).toBeDefined();

      // 2. Call refresh endpoint using cookie
      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        cookies: {
          refreshToken: refreshCookie!.value,
        },
      });

      expect(refreshRes.statusCode).toBe(200);
      const refreshBody = JSON.parse(refreshRes.payload);
      expect(refreshBody.success).toBe(true);
      expect(refreshBody.accessToken).toBeDefined();
      expect(refreshBody.user.email).toBe('dev.carol@velozity.com');

      const newRefreshCookie = refreshRes.cookies.find((c) => c.name === 'refreshToken');
      expect(newRefreshCookie).toBeDefined();
      // Rotation: new cookie value should be different from the old one
      expect(newRefreshCookie!.value).not.toBe(refreshCookie!.value);

      // 3. Reusing the old (now revoked) refresh token should be rejected
      const replayRes = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        cookies: {
          refreshToken: refreshCookie!.value,
        },
      });

      expect(replayRes.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke the refresh token and clear the cookie', async () => {
      // 1. Login
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@velozity.com',
          password: 'Password123!',
        },
      });

      const refreshCookie = loginRes.cookies.find((c) => c.name === 'refreshToken');

      // 2. Logout
      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        cookies: {
          refreshToken: refreshCookie!.value,
        },
      });

      expect(logoutRes.statusCode).toBe(200);
      const body = JSON.parse(logoutRes.payload);
      expect(body.success).toBe(true);

      // 3. Attempting to refresh with the logged-out token should fail
      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        cookies: {
          refreshToken: refreshCookie!.value,
        },
      });

      expect(refreshRes.statusCode).toBe(401);
    });
  });

  describe('RBAC Role Enforcement', () => {
    let adminToken: string;
    let pmToken: string;
    let devToken: string;

    beforeAll(async () => {
      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'admin@velozity.com', password: 'Password123!' },
      });
      adminToken = JSON.parse(adminLogin.payload).accessToken;

      const pmLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'pm.alice@velozity.com', password: 'Password123!' },
      });
      pmToken = JSON.parse(pmLogin.payload).accessToken;

      const devLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'dev.carol@velozity.com', password: 'Password123!' },
      });
      devToken = JSON.parse(devLogin.payload).accessToken;
    });

    it('should allow ADMIN to access admin-only endpoint', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/test/admin-only',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should forbid PM and DEVELOPER from accessing admin-only endpoint', async () => {
      const pmRes = await app.inject({
        method: 'GET',
        url: '/test/admin-only',
        headers: { authorization: `Bearer ${pmToken}` },
      });
      expect(pmRes.statusCode).toBe(403);

      const devRes = await app.inject({
        method: 'GET',
        url: '/test/admin-only',
        headers: { authorization: `Bearer ${devToken}` },
      });
      expect(devRes.statusCode).toBe(403);
    });

    it('should allow ADMIN and PM to access pm-and-admin endpoint, but forbid DEVELOPER', async () => {
      const adminRes = await app.inject({
        method: 'GET',
        url: '/test/pm-and-admin',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(adminRes.statusCode).toBe(200);

      const pmRes = await app.inject({
        method: 'GET',
        url: '/test/pm-and-admin',
        headers: { authorization: `Bearer ${pmToken}` },
      });
      expect(pmRes.statusCode).toBe(200);

      const devRes = await app.inject({
        method: 'GET',
        url: '/test/pm-and-admin',
        headers: { authorization: `Bearer ${devToken}` },
      });
      expect(devRes.statusCode).toBe(403);
    });
  });
});
