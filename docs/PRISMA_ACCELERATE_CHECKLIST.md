# Prisma Accelerate Migration Checklist

## Pre-Migration Setup

### 1. Prisma Accelerate Account
- [ ] Sign up for Prisma Accelerate account
- [ ] Create new Accelerate project
- [ ] Generate API key
- [ ] Note down the Accelerate connection string format: `prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY`

### 2. Environment Preparation
- [ ] Backup current `.env` and `.env.local` files
- [ ] Prepare new environment variables
- [ ] Test current application functionality (baseline)

## Implementation Steps

### Step 1: Install Dependencies
```bash
npm install @prisma/extension-accelerate
```

### Step 2: Update Environment Variables
Add to both `.env` and `.env.local`:
```bash
# Keep existing DATABASE_URL for migrations
DATABASE_URL="postgres://e71d4c8d034de308c6084978afa743b90929f21174728ff09a13f507c033c91f:sk_Hq0wbTB8WoWMuWksO8sp0@db.prisma.io:5432/postgres?sslmode=require"

# Add new Accelerate URL for application queries
ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_ACTUAL_API_KEY"
```

### Step 3: Update Prisma Client
Replace content in `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = global as typeof globalThis & {
  prisma?: PrismaClient;
};

// Use ACCELERATE_URL for app queries, DATABASE_URL for migrations
const databaseUrl = process.env.ACCELERATE_URL || process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"],
  }).$extends(withAccelerate());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

### Step 4: Generate New Client
```bash
npx prisma generate
```

### Step 5: Test Locally
```bash
npm run dev
```

## Testing Checklist

### Basic Functionality
- [ ] Application starts without errors
- [ ] User authentication works
- [ ] Dashboard loads correctly
- [ ] CRUD operations function properly

### Core Features
- [ ] User management works
- [ ] Property management functions
- [ ] Room management operates correctly
- [ ] Reservation system works
- [ ] Payment processing functions
- [ ] Notification system operates

### Admin Functions
- [ ] Migration scripts still work with DATABASE_URL
- [ ] Seed script functions properly
- [ ] Backup scripts operate correctly

### Performance Testing
- [ ] Page load times are equal or better
- [ ] Database queries execute properly
- [ ] No connection errors in logs

## Deployment Checklist

### Pre-Deployment
- [ ] All tests pass locally
- [ ] Code committed to version control
- [ ] Environment variables prepared for production
- [ ] Rollback plan documented

### Deployment Steps
- [ ] Deploy to staging first
- [ ] Run full test suite on staging
- [ ] Monitor staging for 24 hours
- [ ] Deploy to production
- [ ] Monitor production deployment

### Post-Deployment Monitoring
- [ ] Check application logs for errors
- [ ] Monitor query performance
- [ ] Verify cache hit rates in Accelerate dashboard
- [ ] Check database connection count reduction

## Rollback Plan

If issues occur, execute in order:

### Immediate Rollback (Environment Only)
1. Remove `ACCELERATE_URL` from environment variables
2. Restart application
3. Verify functionality restored

### Full Rollback (Code Changes)
1. Revert `src/lib/prisma.ts` to original version
2. Uninstall `@prisma/extension-accelerate`
3. Run `npx prisma generate`
4. Redeploy application

### Rollback Commands
```bash
# Quick environment rollback
unset ACCELERATE_URL

# Full code rollback
git checkout HEAD~1 -- src/lib/prisma.ts
npm uninstall @prisma/extension-accelerate
npx prisma generate
npm run build:production
```

## Success Metrics

### Performance Indicators
- [ ] Query response time ≤ current performance
- [ ] Cache hit rate > 20% within 24 hours
- [ ] Database connection count reduced by 30-50%
- [ ] No increase in error rates

### Functional Validation
- [ ] All user flows work correctly
- [ ] No data inconsistencies
- [ ] Real-time features function properly
- [ ] Payment processing unaffected

## Troubleshooting

### Common Issues
1. **Connection Errors**: Verify ACCELERATE_URL format and API key
2. **Cache Issues**: Check cacheStrategy syntax in queries
3. **Migration Failures**: Ensure DATABASE_URL still used for migrations
4. **Performance Degradation**: Review query patterns and caching strategy

### Debug Commands
```bash
# Check environment variables
echo $ACCELERATE_URL
echo $DATABASE_URL

# Test Prisma connection
npx prisma db pull

# Check client generation
npx prisma generate --schema=./prisma/schema.prisma
```

## Post-Migration Optimization

### Caching Optimization
- [ ] Identify frequently queried data
- [ ] Implement appropriate cache TTL values
- [ ] Monitor cache hit rates
- [ ] Optimize query patterns for caching

### Performance Tuning
- [ ] Review slow queries in Accelerate dashboard
- [ ] Optimize database indexes if needed
- [ ] Adjust connection pool settings
- [ ] Monitor and tune cache strategies

---

**Estimated Time**: 2-4 hours for complete migration and testing
**Risk Level**: Low (easy rollback available)
**Downtime**: None (if done correctly)
