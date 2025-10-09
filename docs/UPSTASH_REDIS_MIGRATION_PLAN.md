# Upstash Redis Migration Plan for Vercel

## Overview

This document outlines the complete migration plan to switch from local Redis to Upstash Redis via Vercel Marketplace integration for improved scalability, reliability, and serverless compatibility.

## Current Redis Setup Analysis

### Current Architecture
- **Redis Client**: ioredis v5.8.0
- **Queue System**: BullMQ v5.59.0 for job processing
- **Connection**: Local Redis (127.0.0.1:6379) with password authentication
- **Usage**: Reservation automation, job queues, caching

### Current Redis Implementation
1. **Connection Management**: `src/lib/queue/redis.ts` (centralized Redis connection)
2. **Queue System**: `src/lib/queue/queues.ts` (BullMQ job queues)
3. **Workers**: `src/lib/queue/workers/automation-worker.ts` (job processing)
4. **Job Types**: No-show detection, late checkout, payment status, cleanup
5. **Environment Config**: Local Redis with custom password

### Current Environment Variables
```bash
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"
REDIS_PASSWORD="Sandhu123"
REDIS_DB="0"
```

## Migration Benefits

### Performance & Reliability
- **Global Edge Network**: Reduced latency worldwide
- **High Availability**: 99.99% uptime SLA
- **Auto-scaling**: Handles traffic spikes automatically
- **Serverless Optimized**: Perfect for Vercel deployments

### Operational Benefits
- **Zero Maintenance**: No Redis server management
- **Built-in Monitoring**: Real-time metrics and alerts
- **Automatic Backups**: Point-in-time recovery
- **Security**: TLS encryption and authentication

## Migration Plan

### Phase 1: Upstash Setup via Vercel Marketplace

#### 1.1 Vercel Marketplace Integration
- [ ] Go to Vercel Dashboard → Integrations
- [ ] Search for "Upstash" in Marketplace
- [ ] Install Upstash Redis integration
- [ ] Select your project for integration
- [ ] Choose Redis plan (starts with free tier)

#### 1.2 Upstash Configuration
- [ ] Access Upstash dashboard via Vercel integration
- [ ] Create new Redis database
- [ ] Configure database settings:
  - **Region**: Choose closest to your users
  - **Eviction Policy**: `allkeys-lru` (recommended for caching)
  - **Max Memory**: Based on your plan
- [ ] Generate connection credentials

#### 1.3 Environment Variables Setup
Vercel will automatically add these environment variables:
```bash
UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
UPSTASH_REDIS_URL="redis://default:your-password@your-db.upstash.io:6379"
```

### Phase 2: Code Migration

#### 2.1 Update Redis Connection (`src/lib/queue/redis.ts`)
```typescript
/**
 * Upstash Redis Connection Configuration for BullMQ
 */

import { Redis } from "ioredis";

// Upstash Redis configuration
const getRedisConfig = () => {
  // Use Upstash URL if available, fallback to local for development
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

// Enhanced connection event handling for Upstash
redisConnection.on("connect", () => {
  const isUpstash = !!process.env.UPSTASH_REDIS_URL;
  console.log(`✅ Redis connected successfully ${isUpstash ? '(Upstash)' : '(Local)'}`);
});

redisConnection.on("error", (error) => {
  console.error("❌ Redis connection error:", error);
  
  // Upstash-specific error handling
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

#### 2.2 Update Environment Configuration
Add to your environment files:
```bash
# .env.local (for local development - keep existing local Redis)
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"
REDIS_PASSWORD="Sandhu123"
REDIS_DB="0"

# Production will use Upstash environment variables automatically:
# UPSTASH_REDIS_URL (automatically set by Vercel integration)
# UPSTASH_REDIS_REST_URL (for REST API if needed)
# UPSTASH_REDIS_REST_TOKEN (for REST API if needed)
```

### Phase 3: Testing Strategy

#### 3.1 Local Development Testing
- [ ] Test with local Redis (existing setup)
- [ ] Verify all BullMQ jobs work correctly
- [ ] Test queue processing and workers
- [ ] Validate job scheduling and cron jobs

#### 3.2 Upstash Integration Testing
- [ ] Test connection to Upstash Redis
- [ ] Verify TLS connectivity works
- [ ] Test job queue functionality
- [ ] Validate worker processing
- [ ] Test error handling and reconnection

#### 3.3 Performance Testing
- [ ] Benchmark job processing times
- [ ] Test concurrent job handling
- [ ] Validate queue throughput
- [ ] Monitor connection stability

### Phase 4: Deployment Strategy

#### 4.1 Staging Deployment
- [ ] Deploy to Vercel staging environment
- [ ] Verify Upstash integration works
- [ ] Run full test suite
- [ ] Monitor job processing for 24 hours

#### 4.2 Production Deployment
- [ ] Deploy to production with Upstash
- [ ] Monitor application health
- [ ] Validate all queue jobs execute
- [ ] Check performance metrics

## Implementation Steps

### Step 1: Vercel Marketplace Setup
1. Install Upstash Redis from Vercel Marketplace
2. Configure Redis database in Upstash dashboard
3. Verify environment variables are set in Vercel

### Step 2: Code Updates
1. Update `src/lib/queue/redis.ts` with Upstash support
2. Test locally with existing Redis setup
3. Commit changes to version control

### Step 3: Testing
1. Deploy to staging environment
2. Test all queue functionality
3. Monitor for 24 hours
4. Validate performance metrics

### Step 4: Production Migration
1. Deploy to production
2. Monitor job processing
3. Verify all automation works
4. Check error rates and performance

## Queue System Compatibility

### BullMQ Features Supported
- ✅ **Job Queues**: All existing job types work
- ✅ **Cron Jobs**: Scheduled jobs continue working
- ✅ **Workers**: Multi-worker processing supported
- ✅ **Retry Logic**: Built-in retry mechanisms work
- ✅ **Job Priorities**: Priority-based processing
- ✅ **Delayed Jobs**: Time-based job scheduling

### Current Job Types (All Compatible)
- ✅ **No-show Detection**: Automated reservation monitoring
- ✅ **Late Checkout Detection**: Checkout time monitoring
- ✅ **Payment Status Updates**: Payment processing jobs
- ✅ **Cleanup Operations**: Database maintenance jobs
- ✅ **Auto Check-in**: Reservation status automation

## Monitoring and Observability

### Upstash Dashboard Metrics
- **Connection Count**: Active Redis connections
- **Command Rate**: Operations per second
- **Memory Usage**: Redis memory consumption
- **Latency**: Command execution times
- **Error Rate**: Failed operations

### Application Monitoring
```typescript
// Add to your monitoring setup
const monitorRedisHealth = async () => {
  try {
    const start = Date.now();
    await redisConnection.ping();
    const latency = Date.now() - start;
    
    console.log(`Redis Health: OK (${latency}ms)`);
    return { status: 'healthy', latency };
  } catch (error) {
    console.error('Redis Health: ERROR', error);
    return { status: 'unhealthy', error: error.message };
  }
};
```

## Cost Optimization

### Upstash Pricing Tiers
- **Free Tier**: 10,000 commands/day
- **Pay-as-you-go**: $0.2 per 100K commands
- **Pro Plans**: Fixed monthly pricing with higher limits

### Cost Optimization Strategies
- **Connection Pooling**: Reuse connections efficiently
- **Command Batching**: Group operations when possible
- **TTL Management**: Set appropriate expiration times
- **Memory Optimization**: Use efficient data structures

## Rollback Plan

### If Issues Occur
1. **Immediate**: Remove `UPSTASH_REDIS_URL` environment variable
2. **Fallback**: Application will use local Redis configuration
3. **Code Rollback**: Revert to previous Redis configuration
4. **Redeploy**: Deploy previous version

### Rollback Commands
```bash
# Remove Upstash environment variables in Vercel
vercel env rm UPSTASH_REDIS_URL

# Redeploy with local Redis fallback
vercel --prod
```

## Success Criteria

### Functional Requirements
- [ ] All BullMQ jobs execute successfully
- [ ] Queue processing maintains current performance
- [ ] No increase in job failure rates
- [ ] Cron jobs run on schedule
- [ ] Worker scaling functions properly

### Performance Requirements
- [ ] Job processing latency ≤ current performance
- [ ] Queue throughput maintains current levels
- [ ] Connection stability > 99.9%
- [ ] Error rate < 0.1%

### Operational Requirements
- [ ] Zero maintenance overhead
- [ ] Monitoring and alerting functional
- [ ] Backup and recovery available
- [ ] Cost within budget expectations

## Timeline

- **Day 1**: Vercel Marketplace setup and Upstash configuration
- **Day 2**: Code updates and local testing
- **Day 3**: Staging deployment and testing
- **Day 4**: Production deployment and monitoring
- **Day 5**: Performance optimization and documentation

## Risk Assessment

### Low Risk
- Upstash is Redis-compatible
- ioredis client supports TLS connections
- BullMQ works with any Redis instance
- Easy rollback to local Redis

### Medium Risk
- Network latency may affect job processing
- TLS overhead might impact performance
- Connection limits on free tier

### Mitigation Strategies
- Thorough testing in staging environment
- Performance benchmarking before migration
- Gradual rollout with monitoring
- Quick rollback procedure ready

---

**Note**: This migration leverages Vercel's native Upstash integration for seamless setup and management. The Redis client code remains largely unchanged, ensuring compatibility with your existing BullMQ job system.
