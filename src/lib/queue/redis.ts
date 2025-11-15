/**
 * Redis Connection Configuration for BullMQ
 *
 * Centralized Redis connection management for job queues
 */

import { Redis } from "ioredis";

// Redis connection configuration
// Supports both Upstash (production) and local Redis (development)
const getRedisConfig = () => {
  const upstashUrl = process.env.UPSTASH_REDIS_URL;
  const isProduction = process.env.NODE_ENV === "production";

  if (upstashUrl) {
    // Production: Use Upstash Redis
    console.log("🔗 Using Upstash Redis (Production)");
    try {
      const url = new URL(upstashUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password,
        username: url.username || "default",
        tls: {}, // Upstash requires TLS
        maxRetriesPerRequest: null, // Required by BullMQ
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 20000,
        commandTimeout: 30000,
        keepAlive: 30000,
        family: 4
      };
    } catch (error) {
      console.error("❌ Failed to parse UPSTASH_REDIS_URL:", error);
      throw new Error("Invalid UPSTASH_REDIS_URL format");
    }
  }

  // Production without Upstash URL - throw error
  if (isProduction) {
    console.error(
      "❌ UPSTASH_REDIS_URL is required in production environment!"
    );
    console.error(
      "💡 Add UPSTASH_REDIS_URL to your Railway environment variables"
    );
    throw new Error(
      "UPSTASH_REDIS_URL environment variable is required in production"
    );
  }

  // Development: Use local Redis
  console.log("🔗 Using Local Redis (Development)");
  return {
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

    const config = getRedisConfig();

    // Only create real connection when actually needed
    if (
      process.env.NODE_ENV === "production" ||
      process.env.REDIS_ENABLED === "true"
    ) {
      redisInstance = new Redis(config);
    } else {
      // Return a Redis instance with lazy connection for development
      redisInstance = new Redis({
        ...config,
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
  const isUpstash = !!process.env.UPSTASH_REDIS_URL;
  console.log(
    `✅ Redis connected successfully ${isUpstash ? "(Upstash)" : "(Local)"}`
  );
});

redisConnection.on("error", (error) => {
  console.error("❌ Redis connection error:", error);

  // Upstash-specific error handling
  if (error.message?.includes("ENOTFOUND")) {
    console.error("💡 Check Upstash Redis URL and network connectivity");
  }
  if (error.message?.includes("WRONGPASS")) {
    console.error("💡 Check Upstash Redis credentials");
  }
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
