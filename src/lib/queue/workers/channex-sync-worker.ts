/**
 * Channex Sync Worker
 *
 * BullMQ worker for processing Channex ARI sync jobs.
 * Handles full syncs, incremental syncs, and reservation syncs.
 */

import { Worker, Job } from "bullmq";
import { redisConnection } from "../redis";
import { getARISyncService } from "@/lib/channex/ari-sync-service";
import { isChannexEnabledForProperty } from "@/lib/channex/context";
import { addDays } from "date-fns";
import type {
  ChannexARISyncJobData,
  ChannexFullSyncJobData,
  ChannexReservationSyncJobData
} from "../types";

const QUEUE_NAME = "channex-sync";

/**
 * Process Channex ARI sync job
 */
async function processARISync(job: Job<ChannexARISyncJobData>) {
  const { propertyId, roomTypeId, startDate, endDate } = job.data;

  // Check if Channex is enabled for this property
  const isEnabled = await isChannexEnabledForProperty(propertyId);
  if (!isEnabled) {
    console.log(`⏭️ Channex not enabled for property ${propertyId}, skipping`);
    return { success: true, skipped: true, reason: "Channex not enabled" };
  }

  const syncService = getARISyncService();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (roomTypeId) {
    // Sync specific room type
    return syncService.syncRoomTypeARI({
      propertyId,
      roomTypeId,
      startDate: start,
      endDate: end
    });
  } else {
    // Sync all room types for property
    return syncService.syncPropertyARI({
      propertyId,
      startDate: start,
      endDate: end
    });
  }
}

/**
 * Process full Channex sync job (typically scheduled daily)
 */
async function processFullSync(job: Job<ChannexFullSyncJobData>) {
  const { propertyId, daysAhead = 365 } = job.data;

  // Check if Channex is enabled for this property
  const isEnabled = await isChannexEnabledForProperty(propertyId);
  if (!isEnabled) {
    console.log(`⏭️ Channex not enabled for property ${propertyId}, skipping`);
    return { success: true, skipped: true, reason: "Channex not enabled" };
  }

  const syncService = getARISyncService();
  const startDate = new Date();
  const endDate = addDays(startDate, daysAhead);

  console.log(
    `🔄 Starting full Channex sync for property ${propertyId} (${daysAhead} days)`
  );

  return syncService.syncPropertyARI({
    propertyId,
    startDate,
    endDate
  });
}

/**
 * Process reservation sync to Channex
 */
async function processReservationSync(job: Job<ChannexReservationSyncJobData>) {
  const { reservationId, propertyId, action } = job.data;

  // Check if Channex is enabled for this property
  const isEnabled = await isChannexEnabledForProperty(propertyId);
  if (!isEnabled) {
    return { success: true, skipped: true, reason: "Channex not enabled" };
  }

  // TODO: Implement reservation sync to Channex
  // This would push reservation status updates back to OTAs
  console.log(
    `📤 Reservation sync: ${action} reservation ${reservationId} to Channex`
  );

  return { success: true, action, reservationId };
}

/**
 * Main job processor
 */
async function processJob(job: Job) {
  console.log(`🔄 Processing Channex job: ${job.name} (${job.id})`);

  switch (job.data.jobType) {
    case "channex-ari-sync":
      return processARISync(job as Job<ChannexARISyncJobData>);

    case "channex-full-sync":
      return processFullSync(job as Job<ChannexFullSyncJobData>);

    case "channex-reservation-sync":
      return processReservationSync(job as Job<ChannexReservationSyncJobData>);

    default:
      throw new Error(`Unknown Channex job type: ${job.data.jobType}`);
  }
}

// Create the worker
export const channexSyncWorker = new Worker(QUEUE_NAME, processJob, {
  connection: redisConnection,
  concurrency: 3, // Process 3 jobs concurrently
  limiter: {
    max: 60, // Max 60 jobs per minute (Channex API rate limiting)
    duration: 60000
  }
});

// Event handlers
channexSyncWorker.on("ready", () => {
  console.log("🚀 Channex sync worker is ready");
});

channexSyncWorker.on("active", (job) => {
  console.log(`⚡ Channex job ${job.id} is now active`);
});

channexSyncWorker.on("completed", (job, result) => {
  console.log(`✅ Channex job ${job.id} completed:`, result);
});

channexSyncWorker.on("failed", (job, error) => {
  console.error(`❌ Channex job ${job?.id} failed:`, error.message);
});

channexSyncWorker.on("error", (error) => {
  console.error("❌ Channex sync worker error:", error);
});

// Graceful shutdown
const shutdown = async () => {
  console.log("🛑 Shutting down Channex sync worker...");
  await channexSyncWorker.close();
  console.log("✅ Channex sync worker closed");
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("🚀 Channex sync worker started and listening for jobs...");

