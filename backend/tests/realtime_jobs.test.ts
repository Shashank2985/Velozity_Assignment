import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/plugins/prisma.js';
import { runOverdueTaskCheck, stopOverdueTaskWorker } from '../src/jobs/overdueTasks.job.js';
import { redisClient } from '../src/lib/redis.js';
import { Role, TaskStatus, Priority } from '../src/types/enums.js';

describe('Phase 5: Real-Time Socket.io & BullMQ Jobs', () => {
  let app: FastifyInstance;
  let serverUrl: string;
  let adminToken: string;
  let pmAliceToken: string;
  let devCarolToken: string;

  beforeAll(async () => {
    app = buildApp();
    const address = await app.listen({ port: 0, host: '127.0.0.1' });
    serverUrl = address;

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

    const carolLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'dev.carol@velozity.com', password: 'Password123!' },
    });
    devCarolToken = JSON.parse(carolLogin.payload).accessToken;
  });

  afterAll(async () => {
    await stopOverdueTaskWorker();
    await app.close();
    await prisma.$disconnect();
  });

  describe('Socket.io Handshake & Authentication', () => {
    it('should connect successfully with a valid JWT access token', async () => {
      console.log('--- TEST 1: Connecting with adminToken ---');
      const client: ClientSocket = ioc(serverUrl, {
        auth: { token: adminToken },
        transports: ['websocket'],
        forceNew: true,
        multiplex: false,
        reconnection: false,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.disconnect();
          reject(new Error('Test 1 timeout waiting for connect'));
        }, 5000);

        client.on('connect', () => {
          console.log('--- TEST 1: Connected successfully! ---');
          clearTimeout(timeout);
          expect(client.connected).toBe(true);
          client.disconnect();
          resolve();
        });
        client.on('connect_error', (err) => {
          console.log('--- TEST 1: connect_error:', err.message);
          clearTimeout(timeout);
          client.disconnect();
          reject(err);
        });
      });
    });

    it('should reject connection when no token is provided', async () => {
      console.log('--- TEST 2: Connecting without token ---');
      const client: ClientSocket = ioc(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
        multiplex: false,
        reconnection: false,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.disconnect();
          reject(new Error('Test 2 timeout waiting for error'));
        }, 5000);

        client.on('connect_error', (err) => {
          console.log('--- TEST 2: connect_error caught as expected:', err.message);
          clearTimeout(timeout);
          client.disconnect();
          resolve();
        });
        client.on('connect', () => {
          console.log('--- TEST 2: Unexpectedly connected! ---');
          clearTimeout(timeout);
          client.disconnect();
          reject(new Error('Should not have connected without token'));
        });
      });
    });

    it('should reject connection with invalid token', async () => {
      console.log('--- TEST 3: Connecting with invalid token ---');
      const client: ClientSocket = ioc(serverUrl, {
        auth: { token: 'invalid-garbage-token' },
        transports: ['websocket'],
        forceNew: true,
        multiplex: false,
        reconnection: false,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.disconnect();
          reject(new Error('Test 3 timeout waiting for error'));
        }, 5000);

        client.on('connect_error', (err) => {
          console.log('--- TEST 3: connect_error caught as expected:', err.message);
          clearTimeout(timeout);
          client.disconnect();
          resolve();
        });
        client.on('connect', () => {
          console.log('--- TEST 3: Unexpectedly connected! ---');
          clearTimeout(timeout);
          client.disconnect();
          reject(new Error('Should not have connected with invalid token'));
        });
      });
    });
  });

  describe('Real-Time Broadcasts & Catch-up Sync', () => {
    it('should broadcast activity:new, task:updated, and notification:new on task transition', async () => {
      console.log('--- TEST 4: Connecting PM Alice socket ---');
      const aliceSocket: ClientSocket = ioc(serverUrl, {
        auth: { token: pmAliceToken },
        transports: ['websocket'],
        forceNew: true,
        multiplex: false,
        reconnection: false,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Alice connect timeout')), 5000);
        aliceSocket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      // 2. Find Carol's task in Alice's project and reset to IN_PROGRESS
      let task = await prisma.task.findFirst({
        where: {
          assignee: { email: 'dev.carol@velozity.com' },
          project: { pm: { email: 'pm.alice@velozity.com' } },
        },
      });

      if (!task) {
        const aliceProject = await prisma.project.findFirst({ where: { pm: { email: 'pm.alice@velozity.com' } } });
        const carol = await prisma.user.findFirst({ where: { email: 'dev.carol@velozity.com' } });
        task = await prisma.task.create({
          data: {
            title: 'Test Real-time Task for Carol',
            description: 'Test description',
            projectId: aliceProject!.id,
            assigneeId: carol!.id,
            priority: Priority.HIGH,
            dueDate: new Date(Date.now() + 86400000),
            status: TaskStatus.IN_PROGRESS,
          },
        });
      } else {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: TaskStatus.IN_PROGRESS },
        });
      }

      console.log('--- TEST 4: Alice joining project room ---');
      aliceSocket.emit('project:join', task.projectId);
      await new Promise((r) => setTimeout(r, 100));

      // Setup listeners for expected events
      const notificationPromise = new Promise<any>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Notification event timeout')), 5000);
        aliceSocket.on('notification:new', (notif) => {
          if (notif.taskId === task!.id) {
            clearTimeout(t);
            resolve(notif);
          }
        });
      });

      const activityPromise = new Promise<any>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Activity event timeout')), 5000);
        aliceSocket.on('activity:new', (activity) => {
          if (activity.taskId === task!.id) {
            clearTimeout(t);
            resolve(activity);
          }
        });
      });

      const taskUpdatedPromise = new Promise<any>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('TaskUpdated event timeout')), 5000);
        aliceSocket.on('task:updated', (updatedTask) => {
          if (updatedTask.id === task!.id) {
            clearTimeout(t);
            resolve(updatedTask);
          }
        });
      });

      console.log('--- TEST 4: Patching task status to IN_REVIEW ---');
      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${task.id}/status`,
        headers: { authorization: `Bearer ${devCarolToken}` },
        payload: { status: TaskStatus.IN_REVIEW },
      });
      expect(patchRes.statusCode).toBe(200);

      // 4. Assert real-time socket delivery
      const [receivedNotif, receivedActivity, receivedTask] = await Promise.all([
        notificationPromise,
        activityPromise,
        taskUpdatedPromise,
      ]);

      console.log('--- TEST 4: All socket events received! ---');
      expect(receivedNotif).toBeDefined();
      expect(receivedNotif.message).toContain('IN_REVIEW');

      expect(receivedActivity).toBeDefined();
      expect(receivedActivity.toStatus).toBe(TaskStatus.IN_REVIEW);

      expect(receivedTask).toBeDefined();
      expect(receivedTask.status).toBe(TaskStatus.IN_REVIEW);

      aliceSocket.disconnect();
    });

    it('should support activity:sync catch-up RPC', async () => {
      console.log('--- TEST 5: activity:sync catch-up ---');
      const client: ClientSocket = ioc(serverUrl, {
        auth: { token: adminToken },
        transports: ['websocket'],
        forceNew: true,
        multiplex: false,
        reconnection: false,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Test 5 connect timeout')), 5000);
        client.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        client.on('connect_error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      const syncResult = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('activity:sync ack timeout')), 5000);
        client.emit(
          'activity:sync',
          { lastSeenTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
          (res: any) => {
            clearTimeout(timeout);
            resolve(res);
          }
        );
      });

      console.log('--- TEST 5: activity:sync received result ---', syncResult?.status);
      expect(syncResult.status).toBe('ok');
      expect(Array.isArray(syncResult.data)).toBe(true);
      expect(syncResult.data.length).toBeGreaterThan(0);

      client.disconnect();
    });
  });

  describe('BullMQ Overdue Tasks Background Job', () => {
    it('should detect overdue tasks, set isOverdue to true, and create notifications', async () => {
      console.log('--- TEST 6: BullMQ Overdue Task Check ---');
      const dev = await prisma.user.findFirst({ where: { role: Role.DEVELOPER } });
      const project = await prisma.project.findFirst();

      const testOverdueTask = await prisma.task.create({
        data: {
          title: 'Automated Test Overdue Task Scanner',
          description: 'Testing BullMQ overdue job execution',
          projectId: project!.id,
          assigneeId: dev!.id,
          priority: Priority.HIGH,
          dueDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          status: TaskStatus.IN_PROGRESS,
          isOverdue: false,
        },
      });

      const result = await runOverdueTaskCheck();
      expect(result.processedCount).toBeGreaterThanOrEqual(1);
      expect(result.updatedIds).toContain(testOverdueTask.id);

      const updated = await prisma.task.findUnique({
        where: { id: testOverdueTask.id },
      });
      expect(updated?.isOverdue).toBe(true);

      await prisma.notification.deleteMany({ where: { taskId: testOverdueTask.id } });
      await prisma.taskActivityLog.deleteMany({ where: { taskId: testOverdueTask.id } });
      await prisma.task.delete({ where: { id: testOverdueTask.id } });
      console.log('--- TEST 6: Finished BullMQ test ---');
    });
  });
});
