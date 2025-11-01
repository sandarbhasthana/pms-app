/**
 * Job Scheduler
 *
 * Manages recurring jobs for reservation automation
 */

import { reservationAutomationQueue, getCronSchedule } from "./queues";
import { prisma } from "@/lib/prisma";
import {
  NoShowDetectionJobData,
  LateCheckoutDetectionJobData,
  CleanupJobData,
  AutoCheckinJobData
} from "./types";

// Note: QueueScheduler is deprecated in BullMQ v5+
// Recurring jobs are now handled directly by the Queue instance

/**
 * Initialize all recurring jobs
 */
export const initializeScheduledJobs = async () => {
  console.log("🕐 Initializing scheduled jobs...");

  try {
    // Clear existing repeatable jobs (for clean restart)
    const repeatableJobs = await reservationAutomationQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await reservationAutomationQueue.removeRepeatableByKey(job.key);
    }

    // Get all active properties
    const activeProperties = await prisma.property.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });

    console.log(`📋 Found ${activeProperties.length} active properties`);

    // Schedule jobs for each property
    for (const property of activeProperties) {
      await schedulePropertyJobs(property.id);
    }

    console.log("✅ All scheduled jobs initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize scheduled jobs:", error);
    throw error;
  }
};

/**
 * Schedule jobs for a specific property
 */
export const schedulePropertyJobs = async (propertyId: string) => {
  console.log(`📅 Scheduling jobs for property: ${propertyId}`);

  try {
    // Schedule no-show detection job
    await reservationAutomationQueue.add(
      `no-show-detection-${propertyId}`,
      {
        jobType: "no-show-detection",
        propertyId,
        timestamp: new Date()
      } as NoShowDetectionJobData,
      {
        repeat: {
          pattern: getCronSchedule("no-show-detection")
        },
        jobId: `no-show-${propertyId}` // Unique ID to prevent duplicates
      }
    );

    // Schedule late checkout detection job
    await reservationAutomationQueue.add(
      `late-checkout-detection-${propertyId}`,
      {
        jobType: "late-checkout-detection",
        propertyId,
        timestamp: new Date()
      } as LateCheckoutDetectionJobData,
      {
        repeat: {
          pattern: getCronSchedule("late-checkout-detection")
        },
        jobId: `late-checkout-${propertyId}` // Unique ID to prevent duplicates
      }
    );

    // Schedule cleanup job (handles CHECKOUT_DUE transitions and stale reservations)
    await reservationAutomationQueue.add(
      `cleanup-${propertyId}`,
      {
        jobType: "cleanup",
        propertyId,
        cleanupType: "stale-reservations", // Focus on stale reservation cleanup
        dryRun: false,
        timestamp: new Date()
      } as CleanupJobData,
      {
        repeat: {
          pattern: getCronSchedule("cleanup")
        },
        jobId: `cleanup-${propertyId}` // Unique ID to prevent duplicates
      }
    );

    console.log(`✅ Jobs scheduled for property: ${propertyId}`);
  } catch (error) {
    console.error(
      `❌ Failed to schedule jobs for property ${propertyId}:`,
      error
    );
    throw error;
  }
};

/**
 * Remove scheduled jobs for a property (when property is deactivated)
 */
export const removePropertyJobs = async (propertyId: string) => {
  console.log(`🗑️ Removing jobs for property: ${propertyId}`);

  try {
    const repeatableJobs = await reservationAutomationQueue.getRepeatableJobs();

    for (const job of repeatableJobs) {
      if (job.id?.includes(propertyId)) {
        await reservationAutomationQueue.removeRepeatableByKey(job.key);
        console.log(`🗑️ Removed job: ${job.id}`);
      }
    }

    console.log(`✅ Jobs removed for property: ${propertyId}`);
  } catch (error) {
    console.error(
      `❌ Failed to remove jobs for property ${propertyId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get status of all scheduled jobs
 */
export const getScheduledJobsStatus = async () => {
  try {
    const repeatableJobs = await reservationAutomationQueue.getRepeatableJobs();
    const waiting = await reservationAutomationQueue.getWaiting();
    const active = await reservationAutomationQueue.getActive();
    const completed = await reservationAutomationQueue.getCompleted();
    const failed = await reservationAutomationQueue.getFailed();

    return {
      repeatableJobs: repeatableJobs.length,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      jobs: repeatableJobs.map((job) => ({
        id: job.id,
        pattern: job.pattern,
        next: job.next
      }))
    };
  } catch (error) {
    console.error("❌ Failed to get scheduled jobs status:", error);
    throw error;
  }
};

/**
 * Manually trigger a job for testing
 */
export const triggerManualJob = async (
  jobType:
    | "no-show-detection"
    | "late-checkout-detection"
    | "auto-checkin"
    | "cleanup",
  propertyId: string,
  options: { dryRun?: boolean; cleanupType?: string } = {}
) => {
  console.log(`🔧 Manually triggering ${jobType} for property: ${propertyId}`);

  try {
    const jobData:
      | NoShowDetectionJobData
      | LateCheckoutDetectionJobData
      | AutoCheckinJobData
      | CleanupJobData = {
      jobType,
      propertyId,
      timestamp: new Date(),
      dryRun: options.dryRun || false,
      triggeredBy: "manual-trigger",
      ...(jobType === "cleanup" && {
        cleanupType: options.cleanupType || "stale-reservations"
      })
    } as
      | NoShowDetectionJobData
      | LateCheckoutDetectionJobData
      | AutoCheckinJobData
      | CleanupJobData;

    const job = await reservationAutomationQueue.add(
      `manual-${jobType}-${propertyId}`,
      jobData,
      {
        priority: 1 // High priority for manual jobs
      }
    );

    console.log(`✅ Manual job triggered: ${job.id}`);
    return job;
  } catch (error) {
    console.error(`❌ Failed to trigger manual job:`, error);
    throw error;
  }
};

// Graceful shutdown is handled by the queue instances in queues.ts
// No separate scheduler shutdown needed in BullMQ v5+
