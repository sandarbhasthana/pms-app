/**
 * Report Generation Worker
 *
 * BullMQ worker for processing report generation jobs
 */

import { Worker, Job } from "bullmq";
import { redisConnection } from "../redis";
import {
  processReportGeneration,
  processReportCleanup
} from "../processors/report-processor";
import { ReportGenerationJobData } from "../types";

// Create worker for report generation
export const reportWorker = new Worker(
  "reports",
  async (job: Job) => {
    console.log(`🔄 Report worker processing job: ${job.name} (${job.id})`);

    try {
      switch (job.name) {
        case "generate-report":
          await processReportGeneration(job as Job<ReportGenerationJobData>);
          break;
        case "cleanup-expired-reports":
          await processReportCleanup(job);
          break;
        default:
          console.warn(`⚠️ Unknown job type: ${job.name}`);
      }
    } catch (error) {
      console.error(`❌ Report worker error for job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process 2 reports at a time
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000 // Per minute
    },
    // Increased timeout settings for long-running report generation
    lockDuration: 180000, // 3 minutes - how long a job can run before being considered stalled
    lockRenewTime: 30000, // 30 seconds - renew lock every 30s to prevent premature timeout
    settings: {
      stalledInterval: 60000, // Check for stalled jobs every 60 seconds
      maxStalledCount: 2 // Retry stalled jobs up to 2 times
    }
  }
);

// Event handlers
reportWorker.on("completed", (job) => {
  console.log(`✅ Report job completed: ${job.id}`);
});

reportWorker.on("failed", (job, error) => {
  console.error(`❌ Report job failed: ${job?.id}`, error);
});

reportWorker.on("error", (error) => {
  console.error("❌ Report worker error:", error);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down report worker...");
  await reportWorker.close();
  console.log("✅ Report worker closed");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Shutting down report worker...");
  await reportWorker.close();
  console.log("✅ Report worker closed");
  process.exit(0);
});

console.log("🚀 Report worker started and listening for jobs...");
