# Prisma Accelerate Migration Plan

## Overview

This document outlines the complete migration plan to switch from direct Prisma Client to Prisma Accelerate for improved performance, connection pooling, and global caching.

## Current Setup Analysis

### Current Architecture

- **Database**: PostgreSQL hosted on Prisma Cloud (`db.prisma.io:5432`)
- **Prisma Client**: Direct connection (`@prisma/client@6.15.0`)
- **Connection**: Single connection string in `DATABASE_URL`
- **Usage**: 42 tables, multiple PrismaClient instances across the codebase

### Current PrismaClient Instances

1. **Main Client**: `src/lib/prisma.ts` (singleton with logging)
2. **Seed Script**: `prisma/seed.ts`
3. **Migration Scripts**: `scripts/database-migrate.ts`, `scripts/fix-database-drift.ts`
4. **Backup Scripts**: `scripts/backup-data.ts`, `scripts/database-restore.ts`
5. **Verification Scripts**: `scripts/verify-local-database.ts`, `scripts/verify-properties.ts`
6. **Utility Scripts**: `src/script/enable-rls.ts`, `scripts/simple-migration-test.ts`
7. **Platform Setup**: `scripts/setup-platform-superadmin.ts`

## Migration Plan

### Phase 1: Prerequisites and Setup

#### 1.1 Prisma Accelerate Account Setup

- [ ] Sign up for Prisma Accelerate (if not already done)
- [ ] Create a new Accelerate project
- [ ] Generate Accelerate connection string
- [ ] Verify Accelerate dashboard access

#### 1.2 Environment Configuration

- [ ] Add new environment variable `ACCELERATE_URL`
- [ ] Keep existing `DATABASE_URL` for migrations and admin tasks
- [ ] Update environment files (`.env`, `.env.local`, `.env.example`)

### Phase 2: Code Changes

#### 2.1 Update Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DATABASE_URL")
}
```

#### 2.2 Update Main Prisma Client (`src/lib/prisma.ts`)

```typescript
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = global as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"]
  }).$extends(withAccelerate());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

#### 2.3 Update Environment Variables

```bash
# .env and .env.local
# Direct database URL (for migrations, admin tasks)
DATABASE_URL="postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require"

# Prisma Accelerate URL (for application queries)
ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=your_api_key"
```

### Phase 3: Package Dependencies

#### 3.1 Install Prisma Accelerate Extension

```bash
npm install @prisma/extension-accelerate
```

#### 3.2 Update package.json Scripts

No changes needed - existing scripts will continue to work.

### Phase 4: Testing Strategy

#### 4.1 Development Testing

- [ ] Test local development with Accelerate
- [ ] Verify all CRUD operations work
- [ ] Test connection pooling behavior
- [ ] Validate caching functionality

#### 4.2 Migration Scripts Testing

- [ ] Ensure migration scripts still use direct DATABASE_URL
- [ ] Test seed scripts with new client
- [ ] Verify backup/restore functionality

#### 4.3 Performance Testing

- [ ] Benchmark query performance before/after
- [ ] Test concurrent connection handling
- [ ] Validate cache hit rates

### Phase 5: Deployment Strategy

#### 5.1 Staging Deployment

- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Monitor performance metrics
- [ ] Test all user flows

#### 5.2 Production Deployment

- [ ] Schedule maintenance window
- [ ] Deploy with zero-downtime strategy
- [ ] Monitor application health
- [ ] Rollback plan ready

## Implementation Steps

### Step 1: Environment Setup

1. Obtain Prisma Accelerate connection string
2. Update environment variables
3. Test connection to Accelerate

### Step 2: Code Updates

1. Install `@prisma/extension-accelerate`
2. Update `src/lib/prisma.ts`
3. Update Prisma schema if needed
4. Generate new Prisma client

### Step 3: Testing

1. Run local development server
2. Execute test suite
3. Verify all functionality works
4. Test migration scripts

### Step 4: Deployment

1. Deploy to staging
2. Run integration tests
3. Deploy to production
4. Monitor performance

## Benefits Expected

### Performance Improvements

- **Connection Pooling**: Reduced connection overhead
- **Global Caching**: Faster query responses for repeated queries
- **Edge Optimization**: Reduced latency for global users

### Operational Benefits

- **Reduced Database Load**: Connection pooling reduces database connections
- **Better Scalability**: Handle more concurrent users
- **Improved Reliability**: Built-in connection management

## Rollback Plan

### If Issues Occur

1. **Immediate**: Revert environment variables to use direct DATABASE_URL
2. **Code Rollback**: Remove Accelerate extension, restore original prisma.ts
3. **Redeploy**: Deploy previous version
4. **Monitor**: Ensure system stability

### Rollback Commands

```bash
# Remove Accelerate extension
npm uninstall @prisma/extension-accelerate

# Revert prisma client
git checkout HEAD~1 -- src/lib/prisma.ts

# Regenerate client
npx prisma generate

# Redeploy
npm run build:production
```

## Monitoring and Validation

### Key Metrics to Monitor

- [ ] Query response times
- [ ] Connection pool utilization
- [ ] Cache hit rates
- [ ] Error rates
- [ ] Database connection count

### Validation Checklist

- [ ] All CRUD operations work correctly
- [ ] User authentication functions properly
- [ ] Real-time features (notifications) work
- [ ] Payment processing is unaffected
- [ ] Reservation system operates normally
- [ ] Admin functions work correctly

## Timeline

- **Day 1**: Environment setup and code changes
- **Day 2**: Local testing and validation
- **Day 3**: Staging deployment and testing
- **Day 4**: Production deployment
- **Day 5**: Monitoring and optimization

## Risk Assessment

### Low Risk

- Prisma Accelerate is production-ready
- Minimal code changes required
- Easy rollback available

### Medium Risk

- Performance characteristics may differ
- Caching behavior needs validation
- Connection pooling may affect some queries

### Mitigation Strategies

- Thorough testing in staging
- Gradual rollout if possible
- Real-time monitoring during deployment
- Quick rollback procedure ready

## Success Criteria

- [ ] All application features work correctly
- [ ] Query performance is equal or better
- [ ] No increase in error rates
- [ ] Successful connection pooling
- [ ] Cache hit rate > 20% within 24 hours
- [ ] Database connection count reduced by 50%

## Post-Migration Tasks

- [ ] Update documentation
- [ ] Train team on Accelerate features
- [ ] Optimize queries for caching
- [ ] Set up monitoring dashboards
- [ ] Review and tune cache strategies

## Detailed Implementation Guide

### Code Changes Required

#### 1. Update `src/lib/prisma.ts`

```typescript
// File: src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = global as typeof globalThis & {
  prisma?: PrismaClient;
};

// Use ACCELERATE_URL for application queries, DATABASE_URL for migrations
const databaseUrl = process.env.ACCELERATE_URL || process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: databaseUrl,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"]
  }).$extends(withAccelerate());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

#### 2. Update Environment Files

```bash
# .env
DATABASE_URL="postgres://e71d4c8d034de308c6084978afa743b90929f21174728ff09a13f507c033c91f:sk_Hq0wbTB8WoWMuWksO8sp0@db.prisma.io:5432/postgres?sslmode=require"
ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_ACCELERATE_API_KEY"

# .env.local
DATABASE_URL="postgres://e71d4c8d034de308c6084978afa743b90929f21174728ff09a13f507c033c91f:sk_Hq0wbTB8WoWMuWksO8sp0@db.prisma.io:5432/postgres?sslmode=require"
ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_ACCELERATE_API_KEY"
```

#### 3. Update Prisma Schema (if needed)

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DATABASE_URL")
}
```

### Migration Scripts Compatibility

All existing migration scripts will continue to work because they use `DATABASE_URL` directly:

- `scripts/database-migrate.ts` ✅
- `scripts/database-backup.ts` ✅
- `scripts/database-restore.ts` ✅
- `prisma/seed.ts` ✅

### Caching Strategy

#### Queries That Benefit from Caching

```typescript
// User profile queries (cache for 5 minutes)
const user = await prisma.user.findUnique({
  where: { id: userId },
  cacheStrategy: { ttl: 300 }
});

// Organization settings (cache for 10 minutes)
const orgSettings = await prisma.organization.findUnique({
  where: { id: orgId },
  cacheStrategy: { ttl: 600 }
});

// Room types (cache for 1 hour)
const roomTypes = await prisma.roomType.findMany({
  where: { propertyId },
  cacheStrategy: { ttl: 3600 }
});
```

#### Queries to Avoid Caching

- Real-time reservation data
- Payment transactions
- User authentication tokens
- Audit logs

### Testing Commands

```bash
# Install Accelerate extension
npm install @prisma/extension-accelerate

# Generate new client
npx prisma generate

# Test connection
npm run dev

# Run tests
npm test

# Test migrations
npx prisma migrate status
```

### Monitoring Queries

```sql
-- Check connection count (before migration)
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Monitor query performance
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

**Note**: This migration should be low-risk as Prisma Accelerate is designed to be a drop-in replacement with additional benefits. The main changes are in the client initialization and environment configuration.
