import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Use a global singleton to avoid creating new connections on every
// server component render during development hot-reloads.
const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
