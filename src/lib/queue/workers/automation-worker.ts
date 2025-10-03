/**
 * Automation Worker
 *
 * BullMQ worker that processes reservation automation jobs
 */

import { Worker, Job } from "bullmq";
import { redisConnection } from "../redis";
import {
  QueueJobData,
  JobResult,
  NoShowDetectionJobData,
  LateCheckoutDetectionJobData,
  CleanupJobData,
  PaymentStatusJobData
} from "../types";
import { NoShowProcessor } from "../processors/no-show-processor";
import { LateCheckoutProcessor } from "../processors/late-checkout-processor";
import { CleanupProcessor } from "../processors/cleanup-processor";
import { PaymentStatusProcessor } from "../processors/payment-status-processor";

// Initialize processors
const noShowProcessor = new NoShowProcessor();
const lateCheckoutProcessor = new LateCheckoutProcessor();
const cleanupProcessor = new CleanupProcessor();
const paymentStatusProcessor = new PaymentStatusProcessor();

// Job processor function
const processJob = async (job: Job<QueueJobData>): Promise<JobResult> => {
  console.log(`🔄 Processing job: ${job.name} (ID: ${job.id})`);

  try {
    switch (job.data.jobType) {
      case "no-show-detection":
        return await noShowProcessor.process(
          job as Job<NoShowDetectionJobData>
        );

      case "late-checkout-detection":
        return await lateCheckoutProcessor.process(
          job as Job<LateCheckoutDetectionJobData>
        );

      case "cleanup":
        return await cleanupProcessor.process(job as Job<CleanupJobData>);

      case "payment-status-update":
        return await paymentStatusProcessor.process(
          job as Job<PaymentStatusJobData>
        );

      case "auto-checkin":
        // TODO: Implement auto check-in processor
        throw new Error("Auto check-in not yet implemented");

      case "status-update":
        // TODO: Implement status update processor
        throw new Error("Status update not yet implemented");

      default:
        throw new Error(
          `Unknown job type: ${(job.data as { jobType: string }).jobType}`
        );
    }
  } catch (error) {
    console.error(`❌ Job processing failed:`, error);
    throw error; // Re-throw to trigger BullMQ retry mechanism
  }
};

// Create worker
export const automationWorker = new Worker(
  "reservation-automation",
  processJob,
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 }
  }
);

// Worker event handlers
automationWorker.on("ready", () => {
  console.log("🚀 Automation worker is ready");
});

automationWorker.on("active", (job) => {
  console.log(`⚡ Job ${job.id} is now active`);
});

automationWorker.on("completed", (job, result: JobResult) => {
  const status = result.success ? "✅" : "⚠️";
  console.log(`${status} Job ${job.id} completed:`, {
    processed: result.processedCount,
    errors: result.errors.length
  });
});

automationWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

automationWorker.on("error", (err) => {
  console.error("❌ Worker error:", err);
});

// Graceful shutdown
const shutdown = async () => {
  console.log("🛑 Shutting down automation worker...");
  await automationWorker.close();
  console.log("✅ Automation worker shut down successfully");
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default automationWorker;
