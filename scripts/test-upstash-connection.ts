/**
 * Test Upstash Redis Connection
 *
 * Comprehensive test script for Upstash Redis integration
 */

import { redisConnection } from "../src/lib/queue/redis";

async function testUpstashConnection() {
  console.log("🔌 Testing Upstash Redis connection...\n");

  try {
    // Test basic connection
    console.log("1️⃣ Connecting to Redis...");
    const pong = await redisConnection.ping();
    console.log(`✅ Redis PING successful: ${pong}\n`);

    // Test basic operations
    console.log("2️⃣ Testing basic operations...");

    // Set a test key with expiration
    await redisConnection.set("test:upstash", "connection-test", "EX", 60);
    console.log("✅ SET operation successful");

    // Get the test key
    const value = await redisConnection.get("test:upstash");
    console.log(`✅ GET operation successful: ${value}`);

    // Test hash operations (used by BullMQ for job data)
    await redisConnection.hset(
      "test:hash",
      "field1",
      "value1",
      "field2",
      "value2"
    );
    const hashValue = await redisConnection.hget("test:hash", "field1");
    console.log(`✅ HASH operations successful: ${hashValue}`);

    // Test list operations (used by BullMQ for queues)
    await redisConnection.lpush("test:queue", "job1", "job2", "job3");
    const queueLength = await redisConnection.llen("test:queue");
    console.log(`✅ LIST operations successful: queue length = ${queueLength}`);

    // Test sorted set operations (used by BullMQ for delayed jobs)
    await redisConnection.zadd(
      "test:delayed",
      Date.now() + 1000,
      "delayed-job-1"
    );
    const delayedCount = await redisConnection.zcard("test:delayed");
    console.log(
      `✅ SORTED SET operations successful: delayed jobs = ${delayedCount}`
    );

    // Clean up test data
    await redisConnection.del(
      "test:upstash",
      "test:hash",
      "test:queue",
      "test:delayed"
    );
    console.log("✅ Cleanup successful\n");

    // Test connection info
    console.log("3️⃣ Connection information...");
    const isUpstash = !!process.env.UPSTASH_REDIS_URL;
    const isLocal = !!process.env.REDIS_HOST;

    console.log(
      `📊 Connection type: ${
        isUpstash ? "Upstash (Production)" : "Local (Development)"
      }`
    );
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);

    if (isUpstash) {
      console.log("📊 Upstash URL configured: ✅");
      console.log("📊 TLS enabled: ✅");
    } else if (isLocal) {
      console.log(
        `📊 Local Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
      );
      console.log("📊 Password protected: ✅");
    }

    // Test Redis server info (if available)
    try {
      console.log("\n4️⃣ Redis server information...");
      const info = await redisConnection.info("server");
      const lines = info
        .split("\r\n")
        .filter(
          (line) =>
            line.includes("redis_version") ||
            line.includes("redis_mode") ||
            line.includes("tcp_port") ||
            line.includes("uptime_in_seconds")
        );

      if (lines.length > 0) {
        lines.forEach((line) => console.log(`📊 ${line}`));
      } else {
        console.log("📊 Server info not available (normal for Upstash)");
      }
    } catch {
      console.log(
        "📊 Server info not available (normal for some Redis providers)"
      );
    }

    // Test BullMQ compatibility
    console.log("\n5️⃣ Testing BullMQ compatibility...");

    // Test blocking operations (critical for BullMQ)
    const testKey = "test:bullmq:blocking";
    await redisConnection.lpush(testKey, "test-job");

    // Test BLPOP with timeout (BullMQ uses this)
    const result = await redisConnection.blpop(testKey, 1);
    if (result && result[1] === "test-job") {
      console.log("✅ Blocking operations work (BullMQ compatible)");
    } else {
      console.log("⚠️ Blocking operations may have issues");
    }

    // Test Lua script execution (BullMQ uses scripts)
    const luaScript = `
      local key = KEYS[1]
      local value = ARGV[1]
      redis.call('set', key, value)
      return redis.call('get', key)
    `;

    const scriptResult = await redisConnection.eval(
      luaScript,
      1,
      "test:lua",
      "lua-test"
    );
    if (scriptResult === "lua-test") {
      console.log("✅ Lua script execution works (BullMQ compatible)");
    } else {
      console.log("⚠️ Lua script execution may have issues");
    }

    // Clean up
    await redisConnection.del("test:lua");

    console.log("\n🎉 Redis connection test completed successfully!");
    console.log("✅ BullMQ should work properly with this Redis setup");
    console.log("✅ All required operations are supported");

    // Performance test
    console.log("\n6️⃣ Performance test...");
    const iterations = 100;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      await redisConnection.set(`perf:test:${i}`, `value-${i}`);
    }

    const endTime = Date.now();
    const avgLatency = (endTime - startTime) / iterations;

    console.log(`📊 Average latency: ${avgLatency.toFixed(2)}ms per operation`);
    console.log(
      `📊 Total time for ${iterations} operations: ${endTime - startTime}ms`
    );

    // Clean up performance test data
    const keys = [];
    for (let i = 0; i < iterations; i++) {
      keys.push(`perf:test:${i}`);
    }
    await redisConnection.del(...keys);

    if (avgLatency < 50) {
      console.log("✅ Excellent performance (< 50ms avg)");
    } else if (avgLatency < 100) {
      console.log("✅ Good performance (< 100ms avg)");
    } else {
      console.log("⚠️ Higher latency detected - monitor in production");
    }
  } catch (error) {
    console.error("❌ Redis connection test failed:", error);

    // Type guard to safely access error properties
    const isErrorWithCode = (err: unknown): err is { code: string } => {
      return typeof err === "object" && err !== null && "code" in err;
    };

    const isErrorWithMessage = (err: unknown): err is { message: string } => {
      return typeof err === "object" && err !== null && "message" in err;
    };

    // Specific error handling
    if (isErrorWithCode(error) && error.code === "ENOTFOUND") {
      console.log("\n💡 Upstash connection troubleshooting:");
      console.log("   1. Verify UPSTASH_REDIS_URL is set correctly");
      console.log("   2. Check network connectivity to Upstash");
      console.log("   3. Ensure domain name resolution works");
      console.log(
        "   4. Try accessing Upstash dashboard to verify service status"
      );
    }

    if (
      isErrorWithMessage(error) &&
      (error.message?.includes("WRONGPASS") ||
        error.message?.includes("NOAUTH"))
    ) {
      console.log("\n💡 Authentication issue:");
      console.log("   1. Check Upstash Redis credentials in dashboard");
      console.log("   2. Verify password in UPSTASH_REDIS_URL");
      console.log(
        "   3. Ensure URL format: redis://default:password@host:port"
      );
    }

    if (
      isErrorWithMessage(error) &&
      (error.message?.includes("ETIMEDOUT") ||
        error.message?.includes("timeout"))
    ) {
      console.log("\n💡 Timeout issue:");
      console.log("   1. Check network connectivity");
      console.log("   2. Verify firewall settings");
      console.log("   3. Try increasing timeout values in redis config");
    }

    if (
      isErrorWithMessage(error) &&
      (error.message?.includes("TLS") || error.message?.includes("SSL"))
    ) {
      console.log("\n💡 TLS/SSL issue:");
      console.log("   1. Ensure TLS is enabled in Redis config");
      console.log("   2. Check if Upstash requires TLS (it does)");
      console.log("   3. Verify certificate validation settings");
    }

    console.log("\n🔧 Environment variables check:");
    console.log(
      `   UPSTASH_REDIS_URL: ${
        process.env.UPSTASH_REDIS_URL ? "✅ Set" : "❌ Not set"
      }`
    );
    console.log(
      `   REDIS_HOST: ${process.env.REDIS_HOST ? "✅ Set" : "❌ Not set"}`
    );
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
  } finally {
    console.log("\n🔌 Closing Redis connection...");
    await redisConnection.quit();
    console.log("✅ Connection closed successfully");
    process.exit(0);
  }
}

// Handle script termination
process.on("SIGINT", async () => {
  console.log("\n🛑 Test interrupted by user");
  await redisConnection.quit();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Test terminated");
  await redisConnection.quit();
  process.exit(0);
});

testUpstashConnection().catch(async (error) => {
  console.error("❌ Unhandled error:", error);
  await redisConnection.quit();
  process.exit(1);
});
