import { PrismaClient, Role, TaskStatus, Priority } from '@prisma/client';
import argon2 from 'argon2';
import process from 'node:process';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clean existing records in reverse dependency order
  await prisma.notification.deleteMany();
  await prisma.taskActivityLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // 2. Hash shared password
  const passwordHash = await argon2.hash('Password123!');

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Eleanor Vance (Admin)',
      email: 'admin@velozity.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const pmAlice = await prisma.user.create({
    data: {
      name: 'Alice Henderson (PM)',
      email: 'pm.alice@velozity.com',
      passwordHash,
      role: Role.PM,
    },
  });

  const pmBob = await prisma.user.create({
    data: {
      name: 'Bob Martinez (PM)',
      email: 'pm.bob@velozity.com',
      passwordHash,
      role: Role.PM,
    },
  });

  const devCarol = await prisma.user.create({
    data: {
      name: 'Carol Zhang (Backend Dev)',
      email: 'dev.carol@velozity.com',
      passwordHash,
      role: Role.DEVELOPER,
    },
  });

  const devDave = await prisma.user.create({
    data: {
      name: 'Dave Patel (Frontend Dev)',
      email: 'dev.dave@velozity.com',
      passwordHash,
      role: Role.DEVELOPER,
    },
  });

  const devEve = await prisma.user.create({
    data: {
      name: 'Eve Robinson (Fullstack Dev)',
      email: 'dev.eve@velozity.com',
      passwordHash,
      role: Role.DEVELOPER,
    },
  });

  const devFrank = await prisma.user.create({
    data: {
      name: 'Frank Miller (DevOps / Data)',
      email: 'dev.frank@velozity.com',
      passwordHash,
      role: Role.DEVELOPER,
    },
  });

  console.log('👤 Created 1 Admin, 2 PMs, and 4 Developers.');

  // 4. Create Clients
  const clientAcme = await prisma.client.create({
    data: { name: 'Acme Financial Systems' },
  });

  const clientHealth = await prisma.client.create({
    data: { name: 'Apex HealthCare Solutions' },
  });

  const clientRetail = await prisma.client.create({
    data: { name: 'OmniChannel Global Commerce' },
  });

  console.log('🏢 Created 3 Clients.');

  // 5. Create Projects
  const project1 = await prisma.project.create({
    data: {
      name: 'FinTech High-Frequency Payment Gateway',
      clientId: clientAcme.id,
      pmId: pmAlice.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Telehealth Live Video & EHR Consultation Portal',
      clientId: clientHealth.id,
      pmId: pmAlice.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'AI-Powered E-Commerce Recommendation Engine',
      clientId: clientRetail.id,
      pmId: pmBob.id,
    },
  });

  console.log('📁 Created 3 Projects assigned to PMs.');

  // 6. Create Tasks
  const now = new Date();
  const past3Days = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const past7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const future2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const future5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const future10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

  // Project 1 Tasks
  const task1_1 = await prisma.task.create({
    data: {
      title: 'Implement ISO 20022 XML Payment Parser',
      description: 'Support SWIFT pacs.008 credit transfer message validation and conversion.',
      projectId: project1.id,
      assigneeId: devCarol.id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.CRITICAL,
      dueDate: past3Days,
      isOverdue: true, // overdue task
    },
  });

  const task1_2 = await prisma.task.create({
    data: {
      title: 'PCI-DSS Tokenization Service Integration',
      description: 'Replace raw PAN with AES-256 encrypted vault tokens in card processing flow.',
      projectId: project1.id,
      assigneeId: devEve.id,
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      dueDate: future2Days,
      isOverdue: false,
    },
  });

  const task1_3 = await prisma.task.create({
    data: {
      title: 'Webhook Idempotency Layer with Redis',
      description: 'Prevent double-charging on duplicate webhook retries using distributed locks.',
      projectId: project1.id,
      assigneeId: devCarol.id,
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      dueDate: past7Days,
      isOverdue: false,
    },
  });

  const task1_4 = await prisma.task.create({
    data: {
      title: 'Merchant Analytics Settlement Dashboard UI',
      description: 'Build interactive revenue chart and payout reconciliation breakdown table.',
      projectId: project1.id,
      assigneeId: devDave.id,
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: future5Days,
      isOverdue: false,
    },
  });

  const task1_5 = await prisma.task.create({
    data: {
      title: 'Real-Time Fraud Detection Score Hook',
      description: 'Trigger machine learning fraud model evaluations on transactions > $10,000.',
      projectId: project1.id,
      assigneeId: devFrank.id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.CRITICAL,
      dueDate: future2Days,
      isOverdue: false,
    },
  });

  const task1_6 = await prisma.task.create({
    data: {
      title: 'Multi-Currency Foreign Exchange Rate Feeder',
      description: 'Connect to ECB exchange feed with 60-second Redis caching.',
      projectId: project1.id,
      assigneeId: devCarol.id,
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      dueDate: future10Days,
      isOverdue: false,
    },
  });

  // Project 2 Tasks
  const task2_1 = await prisma.task.create({
    data: {
      title: 'WebRTC P2P Video Consultation Mesh',
      description: 'Set up SFU / STUN server failover with end-to-end encryption for doctor-patient calls.',
      projectId: project2.id,
      assigneeId: devEve.id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.CRITICAL,
      dueDate: past7Days,
      isOverdue: true, // overdue task
    },
  });

  const task2_2 = await prisma.task.create({
    data: {
      title: 'HIPAA Compliant Medical Record Export (PDF/HL7)',
      description: 'Generate digitally signed patient medical summaries with audit trails.',
      projectId: project2.id,
      assigneeId: devFrank.id,
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      dueDate: future2Days,
      isOverdue: false,
    },
  });

  const task2_3 = await prisma.task.create({
    data: {
      title: 'Patient Waiting Room Queue with WebSockets',
      description: 'Real-time estimated wait time display and doctor availability indicators.',
      projectId: project2.id,
      assigneeId: devDave.id,
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      dueDate: past3Days,
      isOverdue: false,
    },
  });

  const task2_4 = await prisma.task.create({
    data: {
      title: 'Prescription Digital Signature & Pharmacy Dispatch',
      description: 'Integrate SureScripts API for automated electronic prescription routing.',
      projectId: project2.id,
      assigneeId: devCarol.id,
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: future5Days,
      isOverdue: false,
    },
  });

  const task2_5 = await prisma.task.create({
    data: {
      title: 'Doctor Appointment Calendar Scheduling Grid',
      description: 'Drag-and-drop timezone-aware booking widget with Google Calendar sync.',
      projectId: project2.id,
      assigneeId: devDave.id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      dueDate: future5Days,
      isOverdue: false,
    },
  });

  // Project 3 Tasks
  const task3_1 = await prisma.task.create({
    data: {
      title: 'Vector Search Embedding Pipeline with pgvector',
      description: 'Embed 50,000 product catalogs using text-embedding-3-small and cosine similarity.',
      projectId: project3.id,
      assigneeId: devFrank.id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.CRITICAL,
      dueDate: future2Days,
      isOverdue: false,
    },
  });

  const task3_2 = await prisma.task.create({
    data: {
      title: 'Collaborative Filtering Real-Time Recs API',
      description: 'Serve personalized "Frequently Bought Together" bundles under 25ms p99.',
      projectId: project3.id,
      assigneeId: devEve.id,
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      dueDate: past3Days,
      isOverdue: true, // overdue task
    },
  });

  const task3_3 = await prisma.task.create({
    data: {
      title: 'Dynamic Product Pricing Elasticity Model',
      description: 'Adjust catalog prices automatically based on inventory velocity and competitor scraping.',
      projectId: project3.id,
      assigneeId: devFrank.id,
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: future10Days,
      isOverdue: false,
    },
  });

  const task3_4 = await prisma.task.create({
    data: {
      title: 'Customer Checkout Funnel A/B Testing Widget',
      description: 'Multi-variant testing for 1-click checkout vs multi-step payment options.',
      projectId: project3.id,
      assigneeId: devDave.id,
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      dueDate: past7Days,
      isOverdue: false,
    },
  });

  const task3_5 = await prisma.task.create({
    data: {
      title: 'Abandoned Cart Email Trigger via BullMQ',
      description: 'Schedule automated discount coupon notifications 2 hours after cart inactivity.',
      projectId: project3.id,
      assigneeId: devCarol.id,
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      dueDate: future5Days,
      isOverdue: false,
    },
  });

  console.log('📋 Created 16 Tasks across all statuses and priorities.');

  // 7. Create Activity Logs
  await prisma.taskActivityLog.createMany({
    data: [
      {
        taskId: task1_1.id,
        actorId: devCarol.id,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        taskId: task1_2.id,
        actorId: devEve.id,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.IN_REVIEW,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        taskId: task1_3.id,
        actorId: devCarol.id,
        fromStatus: TaskStatus.IN_REVIEW,
        toStatus: TaskStatus.DONE,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        taskId: task2_1.id,
        actorId: devEve.id,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        taskId: task2_2.id,
        actorId: devFrank.id,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.IN_REVIEW,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
      {
        taskId: task2_3.id,
        actorId: devDave.id,
        fromStatus: TaskStatus.IN_REVIEW,
        toStatus: TaskStatus.DONE,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        taskId: task3_2.id,
        actorId: devEve.id,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.IN_REVIEW,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
      {
        taskId: task3_4.id,
        actorId: devDave.id,
        fromStatus: TaskStatus.IN_REVIEW,
        toStatus: TaskStatus.DONE,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('📝 Created Initial Task Activity Logs.');

  // 8. Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: pmAlice.id,
        taskId: task1_2.id,
        message: 'Task "PCI-DSS Tokenization Service Integration" moved to IN_REVIEW by Eve Robinson.',
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        userId: devCarol.id,
        taskId: task1_1.id,
        message: 'Task "Implement ISO 20022 XML Payment Parser" is overdue.',
        read: false,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        userId: pmAlice.id,
        taskId: task2_2.id,
        message: 'Task "HIPAA Compliant Medical Record Export" moved to IN_REVIEW by Frank Miller.',
        read: true,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
      {
        userId: devEve.id,
        taskId: task2_1.id,
        message: 'Task "WebRTC P2P Video Consultation Mesh" is overdue.',
        read: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        userId: pmBob.id,
        taskId: task3_2.id,
        message: 'Task "Collaborative Filtering Real-Time Recs API" moved to IN_REVIEW by Eve Robinson.',
        read: false,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
      {
        userId: admin.id,
        taskId: task1_1.id,
        message: 'High priority task overdue in project "FinTech High-Frequency Payment Gateway".',
        read: false,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('🔔 Created Initial Notifications.');

  console.log('✅ Database seeded successfully!');
  console.log('\n--- 🔑 TEST CREDENTIALS (All use Password: Password123!) ---');
  console.log('ADMIN:     admin@velozity.com');
  console.log('PM 1:      pm.alice@velozity.com');
  console.log('PM 2:      pm.bob@velozity.com');
  console.log('DEV 1:     dev.carol@velozity.com');
  console.log('DEV 2:     dev.dave@velozity.com');
  console.log('DEV 3:     dev.eve@velozity.com');
  console.log('DEV 4:     dev.frank@velozity.com');
  console.log('------------------------------------------------------------\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
