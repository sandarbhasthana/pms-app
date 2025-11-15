\# Serverless Architecture Migration Guide

## Executive Summary

This document outlines the migration strategy from traditional server-based background job processing (BullMQ) to serverless-compatible solutions for our Vercel-hosted PMS application.

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Why BullMQ Doesn't Work on Vercel](#why-bullmq-doesnt-work-on-vercel)
3. [Recommended Solutions](#recommended-solutions)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Cost Analysis](#cost-analysis)
6. [Migration Strategy](#migration-strategy)
7. [Code Examples](#code-examples)

---

## Current Architecture

### ✅ Working Components

- **Next.js 15.3.5** - Hosted on Vercel
- **Ably Realtime** - WebSocket service for chat (already implemented)
- **Upstash Redis** - Caching and session management
- **PostgreSQL** - Primary database (via Prisma)
- **Stripe** - Payment processing

### ❌ Problematic Components

- **BullMQ** - Requires persistent Node.js process (incompatible with Vercel serverless)

---

## Why BullMQ Doesn't Work on Vercel

### Vercel's Serverless Architecture Constraints

1. **Stateless Functions**

   - Each request spawns a new isolated function instance
   - Functions terminate after request completion
   - No persistent processes between requests

2. **Execution Time Limits**

   - Hobby: 10 seconds
   - Pro: 60 seconds (API routes), 300 seconds (Server Functions)
   - Enterprise: 900 seconds max

3. **No Background Workers**

   - Cannot run persistent worker processes
   - No way to continuously poll Redis for jobs
   - Workers would be killed after function timeout

4. **Cold Starts**
   - Functions may not run for minutes/hours
   - BullMQ workers need to be always running
   - Job processing would be unreliable

### Why BullMQ Was Initially Implemented

**Historical Context:**

- BullMQ is the industry-standard solution for Node.js background jobs
- Works perfectly in traditional server environments (VPS, containers, etc.)
- Excellent for development environments running on localhost
- The implementation was likely done before fully considering Vercel's serverless constraints

**Common Misconception:**

- "If it works locally, it will work on Vercel" ❌
- Local development runs a persistent Node.js server
- Vercel runs ephemeral serverless functions

---

## Recommended Solutions

### Solution Comparison Matrix

| Feature               | Upstash QStash | Inngest     | Trigger.dev | BullMQ (Traditional)   |
| --------------------- | -------------- | ----------- | ----------- | ---------------------- |
| **Vercel Compatible** | ✅ Yes         | ✅ Yes      | ✅ Yes      | ❌ No                  |
| **Serverless-First**  | ✅ Yes         | ✅ Yes      | ✅ Yes      | ❌ No                  |
| **HTTP-Based**        | ✅ Yes         | ✅ Yes      | ✅ Yes      | ❌ Redis-based         |
| **Scheduled Jobs**    | ✅ Yes         | ✅ Yes      | ✅ Yes      | ✅ Yes                 |
| **Retries**           | ✅ Auto        | ✅ Auto     | ✅ Auto     | ✅ Manual              |
| **Dead Letter Queue** | ✅ Yes         | ✅ Yes      | ✅ Yes      | ✅ Yes                 |
| **Visual Dashboard**  | ✅ Yes         | ✅ Yes      | ✅ Yes      | ⚠️ Requires Bull Board |
| **Free Tier**         | 500 msg/day    | 50k runs/mo | 1k runs/mo  | N/A (self-hosted)      |
| **Learning Curve**    | Low            | Medium      | Medium      | High                   |
| **Setup Time**        | 5 minutes      | 15 minutes  | 20 minutes  | 1+ hour                |

---

## Detailed Solution Analysis

### 1. Upstash QStash ⭐ (Recommended for Simple Jobs)

**Best For:** Simple background tasks, scheduled jobs, delayed notifications

**Architecture:**

```
Your App (Vercel) → QStash API → Your Webhook Endpoint (Vercel)
```

**Pros:**

- ✅ Built specifically for serverless
- ✅ Same company as Upstash Redis (already using)
- ✅ Simple HTTP-based API
- ✅ Automatic retries with exponential backoff
- ✅ CRON scheduling built-in
- ✅ No infrastructure management
- ✅ Pay-as-you-go pricing

**Cons:**

- ⚠️ Limited to HTTP requests (no complex workflows)
- ⚠️ Free tier is limited (500 messages/day)
- ⚠️ No built-in state management

**Use Cases in PMS:**

- Send check-in reminder emails
- Send check-out reminder emails
- Calculate late checkout fees
- Send payment reminders
- Daily/hourly cleanup jobs
- Webhook retries

**Pricing:**

- Free: 500 messages/day
- Pay-as-you-go: $1 per 100k messages
- **Estimated Monthly Cost:** $0-5 for typical usage

---

### 2. Inngest ⭐⭐ (Recommended for Workflows)

**Best For:** Multi-step workflows, event-driven architecture, complex business logic

**Architecture:**

```
Your App (Vercel) → Inngest Cloud → Your Function Endpoints (Vercel)
```

**Pros:**

- ✅ Event-driven architecture
- ✅ Multi-step workflows with state management
- ✅ Built-in retries and error handling
- ✅ Visual workflow builder and debugging
- ✅ Type-safe with TypeScript
- ✅ Excellent developer experience
- ✅ Generous free tier

**Cons:**

- ⚠️ Requires learning new concepts (events, steps)
- ⚠️ Additional dependency in your stack
- ⚠️ Vendor lock-in

**Use Cases in PMS:**

- Approval request workflows (multi-step)
- Payment processing pipelines
- Automated check-in/check-out flows
- Guest communication sequences
- Reservation status transitions
- Report generation

**Pricing:**

- Free: 50,000 function runs/month
- Pro: $20/month for 200k runs
- **Estimated Monthly Cost:** $0-20 for typical usage

---

### 3. Trigger.dev ⭐⭐⭐ (Recommended for Complex Jobs)

**Best For:** Long-running tasks, heavy processing, complex integrations

**Architecture:**

```
Your App (Vercel) → Trigger.dev Cloud → Your Job Handlers (Vercel)
```

**Pros:**

- ✅ Long-running tasks (up to 1 hour)
- ✅ Real-time job monitoring dashboard
- ✅ 100+ pre-built integrations
- ✅ Automatic retries and error recovery
- ✅ Scheduled jobs and CRON
- ✅ Excellent debugging tools
- ✅ Can handle heavy workloads

**Cons:**

- ⚠️ More complex setup
- ⚠️ Smaller free tier
- ⚠️ Requires separate job definitions

**Use Cases in PMS:**

- Bulk data exports/imports
- Report generation (PDF invoices, statements)
- Data synchronization with external systems
- Image processing (guest documents, property photos)
- Analytics calculations
- Database migrations

**Pricing:**

- Free: 1,000 job runs/month
- Starter: $20/month for 10k runs
- **Estimated Monthly Cost:** $0-20 for typical usage

---

### 4. Push Notifications Solutions

#### OneSignal (Recommended)

**Best For:** Web push, mobile push, in-app notifications

**Pros:**

- ✅ Unlimited free notifications
- ✅ Web + Mobile support
- ✅ Segmentation and targeting
- ✅ A/B testing
- ✅ Analytics dashboard

**Use Cases in PMS:**

- New approval request alerts
- Chat message notifications (when offline)
- Booking confirmations
- Payment received notifications
- Check-in/check-out reminders

**Pricing:**

- Free: Unlimited notifications
- **Estimated Monthly Cost:** $0

#### Knock (Alternative)

**Best For:** Multi-channel notifications (email + SMS + push + in-app)

**Pros:**

- ✅ Unified notification API
- ✅ Notification preferences management
- ✅ Delivery tracking
- ✅ Template management

**Pricing:**

- Free: 10,000 notifications/month
- Growth: $250/month for 100k notifications
- **Estimated Monthly Cost:** $0-250

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Replace BullMQ with serverless-compatible solution

**Tasks:**

1. ✅ Audit current BullMQ usage
2. ✅ Set up Upstash QStash account
3. ✅ Create webhook endpoints for job processing
4. ✅ Migrate simple jobs (email notifications, reminders)
5. ✅ Test in development environment
6. ✅ Deploy to production
7. ✅ Remove BullMQ dependencies

**Deliverables:**

- QStash integrated for simple background jobs
- All scheduled jobs working (check-in/check-out reminders)
- BullMQ completely removed

---

### Phase 2: Workflows (Week 3-4)

**Goal:** Implement complex workflows with Inngest

**Tasks:**

1. ✅ Set up Inngest account
2. ✅ Define event schemas
3. ✅ Implement approval request workflow
4. ✅ Implement payment processing workflow
5. ✅ Implement automated status transitions
6. ✅ Add error handling and retries
7. ✅ Test workflows end-to-end

**Deliverables:**

- Approval requests fully automated
- Payment processing pipeline
- Automated check-in/check-out flows
- Visual workflow monitoring

---

### Phase 3: Notifications (Week 5)

**Goal:** Add push notifications for real-time alerts

**Tasks:**

1. ✅ Set up OneSignal account
2. ✅ Integrate OneSignal SDK
3. ✅ Implement notification triggers
4. ✅ Add notification preferences UI
5. ✅ Test on multiple devices
6. ✅ Deploy to production

**Deliverables:**

- Push notifications for approval requests
- Chat message notifications
- Booking confirmations
- User notification preferences

---

### Phase 4: Optimization (Week 6)

**Goal:** Monitor, optimize, and document

**Tasks:**

1. ✅ Set up monitoring dashboards
2. ✅ Optimize job execution times
3. ✅ Add logging and error tracking
4. ✅ Document all workflows
5. ✅ Create runbooks for common issues
6. ✅ Train team on new architecture

**Deliverables:**

- Complete documentation
- Monitoring dashboards
- Team training materials
- Performance benchmarks

---

## Cost Analysis

### Current Stack (Monthly Estimates)

| Service       | Tier      | Cost      | Notes             |
| ------------- | --------- | --------- | ----------------- |
| Vercel        | Hobby/Pro | $0-20     | Hosting           |
| Ably          | Free      | $0        | 6M messages/month |
| Upstash Redis | Free      | $0        | 10k commands/day  |
| PostgreSQL    | Varies    | $5-50     | Database hosting  |
| **Total**     |           | **$5-70** |                   |

### Proposed Stack (Monthly Estimates)

| Service            | Tier          | Cost      | Notes                       |
| ------------------ | ------------- | --------- | --------------------------- |
| Vercel             | Hobby/Pro     | $0-20     | Hosting                     |
| Ably               | Free          | $0        | 6M messages/month           |
| Upstash Redis      | Free          | $0        | 10k commands/day            |
| **Upstash QStash** | **Free/Paid** | **$0-5**  | **500 msg/day free**        |
| **Inngest**        | **Free/Pro**  | **$0-20** | **50k runs/month free**     |
| **OneSignal**      | **Free**      | **$0**    | **Unlimited notifications** |
| PostgreSQL         | Varies        | $5-50     | Database hosting            |
| **Total**          |               | **$5-95** |                             |

**Additional Cost:** $0-25/month for serverless background jobs and notifications

**ROI:**

- ✅ No server maintenance costs
- ✅ No DevOps overhead
- ✅ Automatic scaling
- ✅ Better reliability
- ✅ Faster development

---

## Migration Strategy

### Pre-Migration Checklist

- [ ] Audit all current BullMQ jobs
- [ ] Document job dependencies
- [ ] Identify critical vs. non-critical jobs
- [ ] Set up monitoring for current jobs
- [ ] Create rollback plan
- [ ] Notify team of migration timeline

### Migration Steps

#### Step 1: Audit Current BullMQ Usage

**Action:** Find all BullMQ job definitions and usages

```bash
# Search for BullMQ imports
grep -r "bullmq" src/
grep -r "Queue" src/
grep -r "Worker" src/

# Search for job definitions
grep -r "addJob" src/
grep -r "process(" src/
```

**Document:**

- Job names
- Job frequencies
- Job dependencies
- Job payloads
- Error handling

#### Step 2: Set Up QStash

**Action:** Create Upstash QStash account and configure

```bash
# Install QStash SDK
npm install @upstash/qstash
```

**Environment Variables:**

```env
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=your_token_here
QSTASH_CURRENT_SIGNING_KEY=your_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key
```

#### Step 3: Create Webhook Endpoints

**Action:** Create API routes to handle job execution

```typescript
// src/app/api/jobs/send-reminder/route.ts
import { verifySignature } from "@upstash/qstash/nextjs";

export const POST = verifySignature(async (req) => {
  const body = await req.json();

  // Process job
  await sendReminderEmail(body);

  return Response.json({ success: true });
});

export const runtime = "edge"; // Optional: Use edge runtime
```

#### Step 4: Migrate Jobs One-by-One

**Strategy:** Blue-green deployment

1. Keep BullMQ job running
2. Add QStash job in parallel
3. Monitor both for 24-48 hours
4. Compare results
5. Remove BullMQ job if QStash works correctly
6. Repeat for next job

#### Step 5: Remove BullMQ

**Action:** Clean up after all jobs are migrated

```bash
# Remove BullMQ dependencies
npm uninstall bullmq

# Remove BullMQ configuration files
rm -rf src/lib/queue/
rm -rf src/workers/

# Remove BullMQ environment variables
# Remove from .env.local:
# - REDIS_URL (if only used for BullMQ)
# - BULL_BOARD_USERNAME
# - BULL_BOARD_PASSWORD
```

### Rollback Plan

**If migration fails:**

1. **Immediate Rollback** (< 1 hour)

   - Re-enable BullMQ jobs
   - Disable QStash webhooks
   - Monitor for job execution

2. **Data Recovery** (if needed)

   - Check QStash dead letter queue
   - Manually retry failed jobs
   - Verify data consistency

3. **Post-Mortem**
   - Document what went wrong
   - Identify root cause
   - Plan fixes before retry

---

## Code Examples

### Example 1: Simple Scheduled Job (QStash)

**Before (BullMQ):**

```typescript
// src/lib/queue/jobs/send-reminder.ts
import { Queue } from "bullmq";

const reminderQueue = new Queue("reminders", {
  connection: { host: "localhost", port: 6379 }
});

export async function scheduleReminder(reservationId: string, sendAt: Date) {
  await reminderQueue.add(
    "send-reminder",
    { reservationId },
    { delay: sendAt.getTime() - Date.now() }
  );
}
}
```

**After (QStash):**

```typescript
// src/lib/queue/jobs/send-reminder.ts
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

export async function scheduleReminder(reservationId: string, sendAt: Date) {
  await qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/send-reminder`,
    body: { reservationId },
    notBefore: Math.floor(sendAt.getTime() / 1000) // Unix timestamp
  });
}
```

**Webhook Handler:**

```typescript
// src/app/api/jobs/send-reminder/route.ts
import { verifySignature } from "@upstash/qstash/nextjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const POST = verifySignature(async (req) => {
  const { reservationId } = await req.json();

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { guest: true }
  });

  if (!reservation) {
    return Response.json({ error: "Reservation not found" }, { status: 404 });
  }

  await sendEmail({
    to: reservation.guest.email,
    subject: "Check-in Reminder",
    body: `Your check-in is tomorrow at ${reservation.checkInTime}`
  });

  return Response.json({ success: true });
});
```

---

### Example 2: CRON Job (QStash)

**Before (BullMQ):**

```typescript
// src/workers/cleanup.ts
import { Worker } from "bullmq";

const worker = new Worker(
  "cleanup",
  async (job) => {
    await cleanupExpiredReservations();
  },
  {
    connection: { host: "localhost", port: 6379 }
  }
);

// Separate scheduler
import { Queue } from "bullmq";
const cleanupQueue = new Queue("cleanup");
await cleanupQueue.add("cleanup", {}, { repeat: { cron: "0 6 * * *" } });
```

**After (QStash):**

```typescript
// No worker needed! Just create a schedule in QStash dashboard or via API

// src/lib/queue/schedules.ts
import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

export async function setupSchedules() {
  // Create CRON schedule (run once during deployment)
  await qstash.schedules.create({
    destination: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/cleanup`,
    cron: "0 6 * * *" // Every day at 6 AM
  });
}
```

**Webhook Handler:**

```typescript
// src/app/api/jobs/cleanup/route.ts
import { verifySignature } from "@upstash/qstash/nextjs";
import { prisma } from "@/lib/prisma";

export const POST = verifySignature(async (req) => {
  // Clean up expired reservations
  const result = await prisma.reservation.deleteMany({
    where: {
      status: "CANCELLED",
      updatedAt: {
        lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days old
      }
    }
  });

  console.log(`Cleaned up ${result.count} expired reservations`);

  return Response.json({ success: true, count: result.count });
});
```

---

### Example 3: Multi-Step Workflow (Inngest)

**Use Case:** Approval request workflow

```typescript
// src/inngest/functions/approval-workflow.ts
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const approvalWorkflow = inngest.createFunction(
  { id: "approval-workflow" },
  { event: "approval/request.created" },
  async ({ event, step }) => {
    const { requestId } = event.data;

    // Step 1: Get approval request details
    const request = await step.run("get-request", async () => {
      return await prisma.approvalRequest.findUnique({
        where: { id: requestId },
        include: {
          reservation: { include: { guest: true } },
          requestedBy: true
        }
      });
    });

    if (!request) {
      throw new Error("Approval request not found");
    }

    // Step 2: Notify managers
    await step.run("notify-managers", async () => {
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ["PROPERTY_MGR", "ORG_ADMIN"] },
          organizationId: request.reservation.organizationId
        }
      });

      await Promise.all(
        managers.map((manager) =>
          sendEmail({
            to: manager.email,
            subject: "New Approval Request",
            body: `${request.requestedBy.name} requested ${request.requestType}`
          })
        )
      );
    });

    // Step 3: Wait for approval (with timeout)
    const approval = await step.waitForEvent("wait-for-approval", {
      event: "approval/request.responded",
      timeout: "24h",
      match: "data.requestId"
    });

    if (!approval) {
      // Timeout - auto-reject
      await step.run("auto-reject", async () => {
        await prisma.approvalRequest.update({
          where: { id: requestId },
          data: {
            status: "REJECTED",
            responseReason: "Timeout - no response within 24 hours"
          }
        });
      });
      return { status: "timeout" };
    }

    // Step 4: Process approval/rejection
    await step.run("process-response", async () => {
      if (approval.data.status === "APPROVED") {
        // Update reservation based on request type
        if (request.requestType === "EARLY_CHECKIN") {
          await prisma.reservation.update({
            where: { id: request.reservationId },
            data: { checkInTime: request.requestedValue }
          });
        }
      }

      // Notify requester
      await sendEmail({
        to: request.requestedBy.email,
        subject: `Approval Request ${approval.data.status}`,
        body: `Your request has been ${approval.data.status.toLowerCase()}`
      });
    });

    return { status: "completed" };
  }
);
```

---

## FAQ

### Q: Can I use BullMQ in development and QStash in production?

**A:** Yes! This is actually recommended during migration.

```typescript
// src/lib/queue/client.ts
const isDevelopment = process.env.NODE_ENV === "development";

export const scheduleJob = isDevelopment
  ? scheduleJobWithBullMQ
  : scheduleJobWithQStash;
```

### Q: What happens if a QStash webhook fails?

**A:** QStash automatically retries with exponential backoff:

- Retry 1: After 3 seconds
- Retry 2: After 9 seconds
- Retry 3: After 27 seconds
- ... up to 7 retries total

After all retries fail, the message goes to the Dead Letter Queue (DLQ) for manual inspection.

### Q: How do I monitor job execution?

**A:** Each service provides dashboards:

- **QStash:** https://console.upstash.com/qstash
- **Inngest:** https://app.inngest.com
- **Trigger.dev:** https://cloud.trigger.dev

You can also add custom logging:

```typescript
export const POST = verifySignature(async (req) => {
  const startTime = Date.now();

  try {
    await processJob(req);
    console.log(`Job completed in ${Date.now() - startTime}ms`);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Job failed:", error);
    // Send to error tracking (Sentry, etc.)
    throw error; // QStash will retry
  }
});
```

### Q: Can I test webhooks locally?

**A:** Yes! Use ngrok or similar tools:

```bash
# Terminal 1: Start your dev server
npm run dev

# Terminal 2: Expose localhost to internet
npx ngrok http 3000

# Use the ngrok URL in QStash dashboard
# Example: https://abc123.ngrok.io/api/jobs/send-reminder
```

### Q: What about job priorities?

**A:** QStash doesn't support priorities directly. Use separate queues:

```typescript
// High priority
await qstash.publishJSON({
  url: `${baseUrl}/api/jobs/high-priority/send-reminder`,
  body: { reservationId }
});

// Low priority
await qstash.publishJSON({
  url: `${baseUrl}/api/jobs/low-priority/cleanup`,
  body: {}
});
```

---

## Next Steps

1. **Review this document** with your team
2. **Choose your migration strategy:**
   - Option A: QStash only (simplest)
   - Option B: QStash + Inngest (recommended)
   - Option C: QStash + Inngest + Trigger.dev (most powerful)
3. **Set up accounts** for chosen services
4. **Start with Phase 1** (Foundation)
5. **Monitor and iterate**

---

## Support & Resources

### Official Documentation

- [Upstash QStash Docs](https://upstash.com/docs/qstash)
- [Inngest Docs](https://www.inngest.com/docs)
- [Trigger.dev Docs](https://trigger.dev/docs)
- [OneSignal Docs](https://documentation.onesignal.com/)

### Community

- [Upstash Discord](https://discord.gg/upstash)
- [Inngest Discord](https://www.inngest.com/discord)
- [Trigger.dev Discord](https://trigger.dev/discord)

### Contact

For questions about this migration, contact your development team lead.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-15
**Author:** Development Team
**Status:** Draft - Pending Review
