import { Queue, Worker } from 'bullmq';
import { prisma } from '../plugins/prisma.js';
import { TaskStatus } from '../types/enums.js';
import { broadcastNotification, broadcastTaskUpdated } from '../plugins/socket.js';
import { formatTaskDto } from '../modules/tasks/tasks.service.js';

const QUEUE_NAME = 'overdue-tasks-queue';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = {
  url: REDIS_URL,
  maxRetriesPerRequest: null,
};

export async function runOverdueTaskCheck(): Promise<{ processedCount: number; updatedIds: string[] }> {
  const now = new Date();

  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { not: TaskStatus.DONE },
      isOverdue: false,
    },
    include: {
      project: {
        include: {
          client: true,
          pm: true,
        },
      },
      assignee: true,
    },
  });

  const updatedIds: string[] = [];

  for (const task of overdueTasks) {
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { isOverdue: true },
      include: {
        project: {
          include: {
            client: true,
            pm: true,
          },
        },
        assignee: true,
      },
    });

    updatedIds.push(task.id);

    // 1. Notify Assignee
    const assigneeNotif = await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        taskId: task.id,
        message: `Task "${task.title}" is overdue (was due ${new Date(task.dueDate).toLocaleDateString()}).`,
        read: false,
      },
      include: {
        task: {
          select: { id: true, title: true, status: true, projectId: true },
        },
      },
    });

    broadcastNotification({
      id: assigneeNotif.id,
      userId: assigneeNotif.userId,
      taskId: assigneeNotif.taskId,
      task: assigneeNotif.task
        ? {
            id: assigneeNotif.task.id,
            title: assigneeNotif.task.title,
            status: assigneeNotif.task.status as unknown as TaskStatus,
            projectId: assigneeNotif.task.projectId,
          }
        : null,
      message: assigneeNotif.message,
      read: assigneeNotif.read,
      createdAt: assigneeNotif.createdAt.toISOString(),
    });

    // 2. Notify PM (if PM is different from assignee)
    if (task.project?.pmId && task.project.pmId !== task.assigneeId) {
      const pmNotif = await prisma.notification.create({
        data: {
          userId: task.project.pmId,
          taskId: task.id,
          message: `Task "${task.title}" in project "${task.project.name}" is overdue.`,
          read: false,
        },
        include: {
          task: {
            select: { id: true, title: true, status: true, projectId: true },
          },
        },
      });

      broadcastNotification({
        id: pmNotif.id,
        userId: pmNotif.userId,
        taskId: pmNotif.taskId,
        task: pmNotif.task
          ? {
              id: pmNotif.task.id,
              title: pmNotif.task.title,
              status: pmNotif.task.status as unknown as TaskStatus,
              projectId: pmNotif.task.projectId,
            }
          : null,
        message: pmNotif.message,
        read: pmNotif.read,
        createdAt: pmNotif.createdAt.toISOString(),
      });
    }

    // 3. Broadcast real-time task update
    const taskDto = formatTaskDto(updated as any);
    broadcastTaskUpdated(taskDto);
  }

  if (overdueTasks.length > 0) {
    console.log(`⏰ BullMQ: Flagged ${overdueTasks.length} tasks as overdue and sent notifications.`);
  }

  return {
    processedCount: overdueTasks.length,
    updatedIds,
  };
}

let overdueQueue: Queue | null = null;
let overdueWorker: Worker | null = null;

export function startOverdueTaskWorker() {
  try {
    overdueQueue = new Queue(QUEUE_NAME, { connection });

    overdueWorker = new Worker(
      QUEUE_NAME,
      async () => {
        return await runOverdueTaskCheck();
      },
      { connection }
    );

    overdueWorker.on('completed', (job) => {
      // Periodic run complete
    });

    overdueWorker.on('error', (err) => {
      console.error('❌ BullMQ Worker Error:', err.message);
    });

    // Schedule repeatable check every 60 seconds
    overdueQueue.add(
      'scan-overdue-tasks',
      {},
      {
        repeat: {
          every: 60000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    console.log('✅ BullMQ Overdue Task Worker & Scheduler started (runs every 60s).');
  } catch (err: any) {
    console.warn('⚠️ Could not start BullMQ worker (Redis may be offline in this environment):', err.message);
  }

  return {
    queue: overdueQueue,
    worker: overdueWorker,
  };
}

export async function stopOverdueTaskWorker() {
  if (overdueWorker) {
    await overdueWorker.close();
    overdueWorker = null;
  }
  if (overdueQueue) {
    await overdueQueue.close();
    overdueQueue = null;
  }
}
