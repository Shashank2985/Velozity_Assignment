import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully.');
});

redisClient.on('error', (err) => {
  if (err.message?.includes('Connection is closed')) return;
  console.error('❌ Redis connection error:', err.message);
});

export function createRedisClient(): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 200, 3000);
    },
  });
  client.on('error', (err) => {
    if (err.message?.includes('Connection is closed')) return;
    console.error('❌ Redis Client error:', err.message);
  });
  return client;
}
