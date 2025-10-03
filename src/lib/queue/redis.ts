/**
 * Redis Connection Configuration for BullMQ
 *
 * Centralized Redis connection management for job queues
 */

import { Redis } from "ioredis";

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || "Sandhu123",
  db: parseInt(process.env.REDIS_DB || "0"),
  maxRetriesPerRequest: null, // Required by BullMQ for blocking operations
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  lazyConnect: true,
  // Increased timeouts for better reliability
  connectTimeout: 20000, // 20 seconds
  commandTimeout: 30000, // 30 seconds
  retryDelayOnClusterDown: 300,
  // Additional BullMQ optimizations
  keepAlive: 30000,
  family: 4, // Force IPv4
  maxLoadingTimeout: 5000
};

// Lazy Redis connection instance
let redisInstance: Redis | null = null;

export const getRedisConnection = (): Redis => {
  if (!redisInstance) {
    // Skip Redis connection during build time
    if (process.env.NEXT_PHASE === "phase-production-build") {
      // Return a mock Redis instance that doesn't actually connect
      redisInstance = {
        on: () => {},
        off: () => {},
        disconnect: () => Promise.resolve(),
        quit: () => Promise.resolve("OK")
      } as unknown as Redis;
      return redisInstance;
    }

    // Only create real connection when actually needed
    if (
      process.env.NODE_ENV === "production" ||
      process.env.REDIS_ENABLED === "true"
    ) {
      redisInstance = new Redis(redisConfig);
    } else {
      // Return a Redis instance with lazy connection for development
      redisInstance = new Redis({
        ...redisConfig,
        lazyConnect: true,
        enableOfflineQueue: false
      });
    }
  }
  return redisInstance;
};

// Backward compatibility export
export const redisConnection = getRedisConnection();

// Handle Redis connection events
redisConnection.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redisConnection.on("error", (error) => {
  console.error("❌ Redis connection error:", error);
});

redisConnection.on("ready", () => {
  console.log("🚀 Redis is ready to accept commands");
});

redisConnection.on("close", () => {
  console.log("🔌 Redis connection closed");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down Redis connection...");
  await redisConnection.quit();
  process.exit(0);
});

export default redisConnection;
