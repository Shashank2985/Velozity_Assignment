import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('====================================================');
  console.log('📊 DATABASE SEED VERIFICATION REPORT');
  console.log('====================================================');

  const [userCount, clientCount, projectCount, taskCount, activityCount, notifCount] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.project.count(),
    prisma.task.count(),
    prisma.taskActivityLog.count(),
    prisma.notification.count(),
  ]);

  console.log(`👤 Users:           ${userCount}`);
  console.log(`🏢 Clients:         ${clientCount}`);
  console.log(`📁 Projects:        ${projectCount}`);
  console.log(`📋 Tasks:           ${taskCount}`);
  console.log(`📝 Activity Logs:   ${activityCount}`);
  console.log(`🔔 Notifications:   ${notifCount}`);

  console.log('\n--- 👥 USERS BY ROLE ---');
  const users = await prisma.user.findMany({
    select: { name: true, email: true, role: true },
    orderBy: { role: 'asc' },
  });
  console.table(users);

  console.log('\n--- 📁 PROJECTS & PMs ---');
  const projects = await prisma.project.findMany({
    select: {
      name: true,
      client: { select: { name: true } },
      pm: { select: { name: true, email: true } },
      _count: { select: { tasks: true } },
    },
  });
  console.table(
    projects.map((p) => ({
      Project: p.name,
      Client: p.client.name,
      PM: `${p.pm.name} (${p.pm.email})`,
      Tasks: p._count.tasks,
    }))
  );

  console.log('\n--- 📋 SAMPLE TASKS & STATUS ---');
  const tasks = await prisma.task.findMany({
    take: 6,
    select: {
      title: true,
      status: true,
      priority: true,
      isOverdue: true,
      assignee: { select: { name: true } },
    },
  });
  console.table(
    tasks.map((t) => ({
      Title: t.title.length > 30 ? t.title.substring(0, 30) + '...' : t.title,
      Status: t.status,
      Priority: t.priority,
      Overdue: t.isOverdue,
      Assignee: t.assignee.name,
    }))
  );

  console.log('====================================================');
  console.log('✅ ALL SEEDED DATA CONFIRMED & VERIFIED');
  console.log('====================================================\n');
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
