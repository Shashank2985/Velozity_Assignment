import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { Role, TaskStatus, Priority } from '../src/types/enums.js';
import { prisma } from '../src/plugins/prisma.js';

describe('Phase 4: Projects & Tasks REST APIs & Scoping', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let pmAliceToken: string;
  let pmBobToken: string;
  let devCarolToken: string;
  let devEveToken: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Login users to get tokens
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@velozity.com', password: 'Password123!' },
    });
    adminToken = JSON.parse(adminLogin.payload).accessToken;

    const aliceLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'pm.alice@velozity.com', password: 'Password123!' },
    });
    pmAliceToken = JSON.parse(aliceLogin.payload).accessToken;

    const bobLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'pm.bob@velozity.com', password: 'Password123!' },
    });
    pmBobToken = JSON.parse(bobLogin.payload).accessToken;

    const carolLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'dev.carol@velozity.com', password: 'Password123!' },
    });
    devCarolToken = JSON.parse(carolLogin.payload).accessToken;

    const eveLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'dev.eve@velozity.com', password: 'Password123!' },
    });
    devEveToken = JSON.parse(eveLogin.payload).accessToken;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('Users & Clients Directory Endpoints', () => {
    it('GET /api/clients should return clients list with project counts', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/clients',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.clients.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /api/users should support role filtering', async () => {
      const devRes = await app.inject({
        method: 'GET',
        url: '/api/users?role=DEVELOPER',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(devRes.statusCode).toBe(200);
      const devBody = JSON.parse(devRes.payload);
      expect(devBody.users.length).toBe(4);
      expect(devBody.users.every((u: any) => u.role === Role.DEVELOPER)).toBe(true);

      const pmRes = await app.inject({
        method: 'GET',
        url: '/api/users?role=PM',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(pmRes.statusCode).toBe(200);
      const pmBody = JSON.parse(pmRes.payload);
      expect(pmBody.users.length).toBe(2);
      expect(pmBody.users.every((u: any) => u.role === Role.PM)).toBe(true);
    });
  });

  describe('Project Scoping & RBAC', () => {
    it('ADMIN should see all projects with computed task breakdown statistics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.projects.length).toBe(3);

      const p1 = body.projects.find((p: any) => p.name.includes('Payment Gateway'));
      expect(p1).toBeDefined();
      expect(p1.tasksCount).toBeDefined();
      expect(p1.tasksCount.total).toBe(6);
    });

    it('PM Alice should see only her 2 managed projects', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: { authorization: `Bearer ${pmAliceToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.projects.length).toBe(2);
      expect(body.projects.every((p: any) => p.pm.email === 'pm.alice@velozity.com')).toBe(true);
    });

    it('PM Bob should see only his 1 managed project', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: { authorization: `Bearer ${pmBobToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.projects.length).toBe(1);
      expect(body.projects[0].name).toContain('Recommendation Engine');
    });

    it('DEVELOPER cannot create a new project (403 Forbidden)', async () => {
      const client = await prisma.client.findFirst();
      const res = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${devCarolToken}` },
        payload: {
          name: 'Unauthorized Project',
          clientId: client?.id,
          pmId: client?.id,
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Tasks API with Dynamic Filtering & State Transitions', () => {
    it('should filter tasks by status (IN_PROGRESS)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/tasks?status=IN_PROGRESS',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.tasks.length).toBeGreaterThan(0);
      expect(body.tasks.every((t: any) => t.status === TaskStatus.IN_PROGRESS)).toBe(true);
    });

    it('should filter tasks by priority (CRITICAL)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/tasks?priority=CRITICAL',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.tasks.length).toBeGreaterThan(0);
      expect(body.tasks.every((t: any) => t.priority === Priority.CRITICAL)).toBe(true);
    });

    it('should filter tasks by overdue status (isOverdue=true)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/tasks?isOverdue=true',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.tasks.length).toBeGreaterThan(0);
      expect(body.tasks.every((t: any) => t.isOverdue === true)).toBe(true);
    });

    it('should search tasks by title/description keyword', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/tasks?search=WebRTC',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.tasks.length).toBe(1);
      expect(body.tasks[0].title).toContain('WebRTC');
    });

    it('DEVELOPER should only see their own assigned tasks', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/tasks',
        headers: { authorization: `Bearer ${devCarolToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.tasks.every((t: any) => t.assignee.email === 'dev.carol@velozity.com')).toBe(true);
    });

    it('State Machine: Developer transitions status to IN_REVIEW and triggers PM notification + Activity Log', async () => {
      // Find Carol's task
      let task = await prisma.task.findFirst({
        where: {
          assignee: { email: 'dev.carol@velozity.com' },
        },
        include: { project: true },
      });
      if (task && task.status === TaskStatus.IN_REVIEW) {
        task = await prisma.task.update({
          where: { id: task.id },
          data: { status: TaskStatus.IN_PROGRESS },
          include: { project: true },
        });
      }
      expect(task).toBeDefined();

      const previousStatus = task!.status;

      // Update status to IN_REVIEW
      const statusRes = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${task!.id}/status`,
        headers: { authorization: `Bearer ${devCarolToken}` },
        payload: { status: TaskStatus.IN_REVIEW },
      });

      expect(statusRes.statusCode).toBe(200);
      const statusBody = JSON.parse(statusRes.payload);
      expect(statusBody.task.status).toBe(TaskStatus.IN_REVIEW);

      // Verify TaskActivityLog was created
      const activityLog = await prisma.taskActivityLog.findFirst({
        where: { taskId: task!.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(activityLog).toBeDefined();
      expect(activityLog?.fromStatus).toBe(previousStatus);
      expect(activityLog?.toStatus).toBe(TaskStatus.IN_REVIEW);

      // Verify Notification was sent to PM Alice
      const notif = await prisma.notification.findFirst({
        where: {
          userId: task!.project.pmId,
          taskId: task!.id,
          message: { contains: 'IN_REVIEW' },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(notif).toBeDefined();
    });
  });

  describe('Notifications & Activity Feeds', () => {
    it('GET /api/notifications returns list and unread count', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/notifications',
        headers: { authorization: `Bearer ${pmAliceToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.notifications)).toBe(true);
      expect(typeof body.unreadCount).toBe('number');
    });

    it('PATCH /api/notifications/:id/read marks notification as read', async () => {
      const notif = await prisma.notification.findFirst({
        where: { user: { email: 'pm.alice@velozity.com' }, read: false },
      });

      if (notif) {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/notifications/${notif.id}/read`,
          headers: { authorization: `Bearer ${pmAliceToken}` },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.notification.read).toBe(true);
      }
    });

    it('PATCH /api/notifications/read-all marks all notifications as read', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/notifications/read-all',
        headers: { authorization: `Bearer ${pmAliceToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);

      const checkRes = await app.inject({
        method: 'GET',
        url: '/api/notifications',
        headers: { authorization: `Bearer ${pmAliceToken}` },
      });
      const checkBody = JSON.parse(checkRes.payload);
      expect(checkBody.unreadCount).toBe(0);
    });

    it('GET /api/activity returns scoped activity log history', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/activity',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.activities.length).toBeGreaterThan(0);
      expect(body.activities[0].createdAt).toBeDefined();
    });
  });
});
