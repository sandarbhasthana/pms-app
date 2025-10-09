# Upstash Redis Migration Checklist

## Pre-Migration Setup

### 1. Vercel Marketplace Integration
- [ ] Go to [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Navigate to your project → Integrations tab
- [ ] Search for "Upstash" in Marketplace
- [ ] Click "Add Integration" on Upstash Redis
- [ ] Select your project for integration
- [ ] Choose Redis plan (Free tier: 10K commands/day)
- [ ] Complete integration setup

### 2. Upstash Database Configuration
- [ ] Access Upstash dashboard via Vercel integration
- [ ] Create new Redis database:
  - **Name**: `pms-app-redis`
  - **Region**: Choose closest to your users (e.g., `us-east-1`)
  - **Type**: Regional (for better performance)
  - **Eviction**: `allkeys-lru`
- [ ] Note down connection details
- [ ] Verify environment variables appear in Vercel

### 3. Environment Variables Verification
Check these are automatically added to your Vercel project:
```bash
UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
UPSTASH_REDIS_URL="redis://default:your-password@your-db.upstash.io:6379"
```

## Implementation Steps

### Step 1: Update Redis Connection Code

Replace content in `src/lib/queue/redis.ts`:

```typescript
/**
 * Upstash Redis Connection Configuration for BullMQ
 */

import { Redis } from "ioredis";

// Upstash Redis configuration
const getRedisConfig = () => {
  const upstashUrl = process.env.UPSTASH_REDIS_URL;
  
  if (upstashUrl) {
    // Parse Upstash URL: redis://default:password@host:port
    const url = new URL(upstashUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password,
      username: url.username || 'default',
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
  }

  // Fallback to local Redis for development
  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || "Sandhu123",
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: null,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 20000,
    commandTimeout: 30000,
    keepAlive: 30000,
    family: 4
  };
};

// Lazy Redis connection instance
let redisInstance: Redis | null = null;

export const getRedisConnection = (): Redis => {
  if (!redisInstance) {
    // Skip Redis connection during build time
    if (process.env.NEXT_PHASE === "phase-production-build") {
      redisInstance = {
        on: () => {},
        off: () => {},
        disconnect: () => Promise.resolve(),
        quit: () => Promise.resolve("OK")
      } as unknown as Redis;
      return redisInstance;
    }

    const config = getRedisConfig();
    
    if (process.env.NODE_ENV === "production" || process.env.REDIS_ENABLED === "true") {
      redisInstance = new Redis(config);
    } else {
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

// Enhanced connection event handling
redisConnection.on("connect", () => {
  const isUpstash = !!process.env.UPSTASH_REDIS_URL;
  console.log(`✅ Redis connected successfully ${isUpstash ? '(Upstash)' : '(Local)'}`);
});

redisConnection.on("error", (error) => {
  console.error("❌ Redis connection error:", error);
  
  if (error.message?.includes('ENOTFOUND')) {
    console.error("💡 Check Upstash Redis URL and network connectivity");
  }
  if (error.message?.includes('WRONGPASS')) {
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
```

### Step 2: Update Local Environment (Optional)
Keep local Redis for development in `.env.local`:
```bash
# Local Redis for development (keep existing)
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"
REDIS_PASSWORD="Sandhu123"
REDIS_DB="0"
REDIS_ENABLED="true"

# Upstash will be used automatically in production via Vercel
```

### Step 3: Test Connection Script
Create `scripts/test-upstash-connection.ts`:

```typescript
/**
 * Test Upstash Redis Connection
 */

import { redisConnection } from '../src/lib/queue/redis';

async function testUpstashConnection() {
  console.log('🔌 Testing Upstash Redis connection...\n');
  
  try {
    // Test basic connection
    console.log('1️⃣ Connecting to Redis...');
    const pong = await redisConnection.ping();
    console.log(`✅ Redis PING successful: ${pong}\n`);
    
    // Test basic operations
    console.log('2️⃣ Testing basic operations...');
    
    // Set a test key
    await redisConnection.set('test:upstash', 'connection-test', 'EX', 60);
    console.log('✅ SET operation successful');
    
    // Get the test key
    const value = await redisConnection.get('test:upstash');
    console.log(`✅ GET operation successful: ${value}`);
    
    // Test BullMQ operations
    await redisConnection.lpush('test:queue', 'job1', 'job2');
    const queueLength = await redisConnection.llen('test:queue');
    console.log(`✅ LIST operations successful: queue length = ${queueLength}`);
    
    // Clean up
    await redisConnection.del('test:upstash', 'test:queue');
    console.log('✅ Cleanup successful\n');
    
    // Check if using Upstash
    const isUpstash = !!process.env.UPSTASH_REDIS_URL;
    console.log(`📊 Connection type: ${isUpstash ? 'Upstash (Production)' : 'Local (Development)'}`);
    
    console.log('\n🎉 Redis connection test completed successfully!');
    console.log('✅ BullMQ should work properly with this Redis setup');
    
  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Upstash connection troubleshooting:');
      console.log('   1. Verify UPSTASH_REDIS_URL is set correctly');
      console.log('   2. Check network connectivity to Upstash');
      console.log('   3. Ensure TLS is properly configured');
    }
    
    if (error.message?.includes('WRONGPASS')) {
      console.log('\n💡 Authentication issue:');
      console.log('   1. Check Upstash Redis credentials');
      console.log('   2. Verify password in UPSTASH_REDIS_URL');
    }
  } finally {
    await redisConnection.quit();
    process.exit(0);
  }
}

testUpstashConnection().catch(console.error);
```

## Testing Checklist

### Local Development Testing
- [ ] Run `npm run dev` - application starts without errors
- [ ] Test with local Redis (existing setup works)
- [ ] Verify BullMQ jobs process correctly
- [ ] Check queue workers are functioning
- [ ] Test cron job scheduling

### Upstash Connection Testing
- [ ] Run test script: `npx ts-node scripts/test-upstash-connection.ts`
- [ ] Verify TLS connection works
- [ ] Test basic Redis operations
- [ ] Validate BullMQ compatibility
- [ ] Check error handling

### Queue System Testing
- [ ] Test reservation automation jobs
- [ ] Verify no-show detection works
- [ ] Test late checkout detection
- [ ] Validate payment status updates
- [ ] Check cleanup operations

### Performance Testing
- [ ] Monitor job processing times
- [ ] Test concurrent job handling
- [ ] Validate queue throughput
- [ ] Check connection stability

## Deployment Checklist

### Pre-Deployment
- [ ] All tests pass locally
- [ ] Code committed to version control
- [ ] Upstash integration verified in Vercel
- [ ] Environment variables confirmed

### Staging Deployment
- [ ] Deploy to Vercel staging environment
- [ ] Verify Upstash connection in staging
- [ ] Run full test suite
- [ ] Monitor for 24 hours
- [ ] Check job processing logs

### Production Deployment
- [ ] Deploy to production
- [ ] Monitor application startup
- [ ] Verify all queue jobs execute
- [ ] Check Redis connection logs
- [ ] Monitor performance metrics

## Monitoring and Validation

### Upstash Dashboard Monitoring
- [ ] Check connection count
- [ ] Monitor command rate
- [ ] Verify memory usage
- [ ] Check latency metrics
- [ ] Review error rates

### Application Monitoring
- [ ] Check application logs for Redis errors
- [ ] Monitor BullMQ job processing
- [ ] Verify cron jobs run on schedule
- [ ] Check worker performance
- [ ] Validate queue throughput

### Health Check Script
Add to your monitoring:
```typescript
// Add to your health check endpoint
export async function checkRedisHealth() {
  try {
    const start = Date.now();
    await redisConnection.ping();
    const latency = Date.now() - start;
    
    return { 
      status: 'healthy', 
      latency,
      type: process.env.UPSTASH_REDIS_URL ? 'upstash' : 'local'
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message 
    };
  }
}
```

## Troubleshooting

### Common Issues
1. **TLS Connection Errors**: Ensure `tls: {}` is in Redis config
2. **Authentication Failures**: Verify UPSTASH_REDIS_URL format
3. **Timeout Issues**: Check network connectivity to Upstash
4. **Job Processing Delays**: Monitor Upstash latency metrics

### Debug Commands
```bash
# Check environment variables
echo $UPSTASH_REDIS_URL

# Test connection manually
npx ts-node scripts/test-upstash-connection.ts

# Check Vercel environment variables
vercel env ls
```

## Rollback Plan

### Quick Rollback (Environment Only)
1. Remove `UPSTASH_REDIS_URL` from Vercel environment
2. Redeploy application
3. Application will fallback to local Redis config

### Full Rollback (Code Changes)
1. Revert `src/lib/queue/redis.ts` to original version
2. Commit and deploy previous version
3. Verify local Redis functionality

## Success Metrics

### Performance Indicators
- [ ] Job processing time ≤ current performance
- [ ] Queue throughput maintains current levels
- [ ] Connection latency < 100ms
- [ ] Error rate < 0.1%
- [ ] Uptime > 99.9%

### Cost Monitoring
- [ ] Daily command count within limits
- [ ] Memory usage optimized
- [ ] Connection count reasonable
- [ ] No unexpected charges

---

**Estimated Time**: 2-3 hours for complete migration
**Risk Level**: Low (easy rollback available)
**Downtime**: Zero (seamless fallback to local Redis)
