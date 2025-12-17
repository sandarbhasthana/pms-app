/**
 * Redis Connection Configuration for BullMQ
 *
 * Centralized Redis connection management for job queues
 *
 * Platform Support:
 * - Vercel: Serverless - Redis/BullMQ disabled (no persistent connections)
 * - Railway: Persistent server - Full Redis/BullMQ support with Upstash
 * - Local: Development - Local Redis
 */

import { Redis } from "ioredis";

// Detect if running on Vercel (serverless environment)
const isVercel =
  process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;

// Redis connection configuration
// Supports both Upstash (Railway) and local Redis (development)
const getRedisConfig = () => {
  // Vercel: Disable Redis (serverless can't maintain persistent connections)
  if (isVercel) {
    console.log("⚠️  Running on Vercel (serverless) - Redis/BullMQ disabled");
    console.log("💡 Background jobs will be skipped on Vercel");
    return null;
  }

  const upstashUrl = process.env.UPSTASH_REDIS_URL;
  const isProduction = process.env.NODE_ENV === "production";

  if (upstashUrl) {
    // Railway Production: Use Upstash Redis with TCP connection
    console.log("🔗 Using Upstash Redis (Railway Production)");

    // Check if it's a redis:// URL (TCP) or https:// URL (REST)
    if (upstashUrl.startsWith("redis://")) {
      try {
        const url = new URL(upstashUrl);
        return {
          host: url.hostname,
          port: parseInt(url.port) || 6379,
          password: url.password,
          username: url.username || "default",
          tls: {}, // Upstash requires TLS
          maxRetriesPerRequest: null, // Required by BullMQ for blocking operations
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          lazyConnect: true,
          connectTimeout: 30000, // Increased from 20s to 30s
          commandTimeout: 120000, // Increased from 30s to 120s (2 minutes) for long-running report jobs
          keepAlive: 30000,
          family: 4,
          // Additional Upstash-specific optimizations
          enableAutoPipelining: true // Improve performance with automatic command batching
        };
      } catch (error) {
        console.error("❌ Failed to parse UPSTASH_REDIS_URL:", error);
        throw new Error("Invalid UPSTASH_REDIS_URL format");
      }
    } else {
      console.error("❌ UPSTASH_REDIS_URL must be redis:// format for Railway");
      console.error(
        "💡 Current URL format:",
        upstashUrl.substring(0, 20) + "..."
      );
      console.error("💡 Expected format: redis://default:password@host:port");
      throw new Error(
        "Invalid UPSTASH_REDIS_URL format - must start with redis://"
      );
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

  // For WSL2, use localhost which will automatically resolve to WSL IP
  // Windows will handle the WSL2 networking automatically
  const redisHost = process.env.REDIS_HOST || "localhost";

  return {
    host: redisHost,
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || "Sandhu123",
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: null, // Required by BullMQ for blocking operations
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    // Increased timeouts for better reliability
    connectTimeout: 20000, // 20 seconds
    commandTimeout: 30000, // 30 seconds
    retryDelayOnClusterDown: 300,
    // Additional BullMQ optimizations
    keepAlive: 30000,
    family: 4, // Force IPv4
    maxLoadingTimeout: 5000,
    // Retry strategy for WSL2 connection issues
    retryStrategy: (times: number) => {
      if (times > 10) {
        console.error("❌ Redis connection failed after 10 retries");
        return null; // Stop retrying
      }
      const delay = Math.min(times * 100, 3000);
      console.log(`🔄 Redis retry attempt ${times}, waiting ${delay}ms...`);
      return delay;
    }
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

    // Vercel: Return mock Redis instance (no persistent connections in serverless)
    if (config === null) {
      console.log("🔇 Redis disabled - returning mock instance");
      redisInstance = {
        on: () => {},
        off: () => {},
        disconnect: () => Promise.resolve(),
        quit: () => Promise.resolve("OK"),
        get: () => Promise.resolve(null),
        set: () => Promise.resolve("OK"),
        setex: () => Promise.resolve("OK"),
        del: () => Promise.resolve(0),
        exists: () => Promise.resolve(0),
        expire: () => Promise.resolve(0),
        ttl: () => Promise.resolve(-1),
        keys: () => Promise.resolve([]),
        scan: () => Promise.resolve(["0", []]),
        hget: () => Promise.resolve(null),
        hset: () => Promise.resolve(0),
        hdel: () => Promise.resolve(0),
        hgetall: () => Promise.resolve({}),
        lpush: () => Promise.resolve(0),
        rpush: () => Promise.resolve(0),
        lpop: () => Promise.resolve(null),
        rpop: () => Promise.resolve(null),
        lrange: () => Promise.resolve([]),
        llen: () => Promise.resolve(0)
      } as unknown as Redis;
      return redisInstance;
    }

    // Create Redis instance with proper connection handling
    redisInstance = new Redis({
      ...config,
      lazyConnect: false, // Connect immediately (no need to call .connect())
      enableOfflineQueue: true, // Queue commands while connecting
      reconnectOnError: (err) => {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      }
    });

    // Connection will be established automatically with lazyConnect: false
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
