import dotenv from 'dotenv';
import { buildApp } from './app.js';
import { startOverdueTaskWorker, stopOverdueTaskWorker } from './jobs/overdueTasks.job.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  const app = buildApp();

  try {
    const address = await app.listen({ port: PORT, host: HOST });
    console.log('\n======================================================');
    console.log(`🚀 Velozity Real-Time API Server is running!`);
    console.log(`📡 URL:    ${address}`);
    console.log(`🏥 Health: ${address}/health`);
    console.log(`🔐 Auth:   ${address}/api/auth/login`);
    console.log('======================================================\n');

    // Start background overdue task scanner worker
    startOverdueTaskWorker();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`\n🛑 Received ${signal}, gracefully shutting down...`);
      await stopOverdueTaskWorker();
      await app.close();
      console.log('👋 Server closed successfully.');
      process.exit(0);
    });
  }
}

startServer();
