/**
 * Queue Definitions and Management
 *
 * Central management for all BullMQ queues in the reservation system
 */

import { Queue, QueueOptions, JobsOptions } from "bullmq";
import { redisConnection } from "./redis";
import { QueueJobData, QueueConfig, CronSchedule } from "./types";

// Queue configurations
const queueConfigs: Record<string, QueueConfig> = {
  "reservation-automation": {
    name: "reservation-automation",
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000
      }
    }
  },
  "status-updates": {
    name: "status-updates",
    defaultJobOptions: {
      removeOnComplete: 200,
      removeOnFail: 100,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000
      }
    }
  },
  notifications: {
    name: "notifications",
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 25,
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 500
      }
    }
  },
  reports: {
    name: "reports",
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 3000
      }
    }
  }
};

// Cron schedules for different environments
export const cronSchedules: Record<string, CronSchedule> = {
  "no-show-detection": {
    development: "*/2 * * * *", // Every 2 minutes
    testing: "*/15 * * * *", // Every 15 minutes
    staging: "0 */1 * * *", // Every hour
    production: "0 */4 * * *" // Every 4 hours
  },
  "late-checkout-detection": {
    development: "*/3 * * * *", // Every 3 minutes
    testing: "*/20 * * * *", // Every 20 minutes
    staging: "0 */2 * * *", // Every 2 hours
    production: "0 */4 * * *" // Every 4 hours
  },
  cleanup: {
    development: "*/10 * * * *", // Every 10 minutes
    testing: "0 */1 * * *", // Every hour
    staging: "5 6,18 * * *", // Daily at 6:05 AM and 6:05 PM
    production: "5 6,18 * * *" // Daily at 6:05 AM and 6:05 PM
  },
  "auto-checkin": {
    development: "*/5 * * * *", // Every 5 minutes
    testing: "*/30 * * * *", // Every 30 minutes
    staging: "0 */3 * * *", // Every 3 hours
    production: "0 */4 * * *" // Every 4 hours
  },
  "report-cleanup": {
    development: "*/15 * * * *", // Every 15 minutes
    testing: "0 */2 * * *", // Every 2 hours
    staging: "0 2 * * *", // Daily at 2:00 AM
    production: "0 2 * * *" // Daily at 2:00 AM
  }
};

// Create queue instances
const createQueue = (config: QueueConfig): Queue => {
  const queueOptions: QueueOptions = {
    connection: redisConnection,
    defaultJobOptions: config.defaultJobOptions
  };

  return new Queue(config.name, queueOptions);
};

// Initialize all queues
export const reservationAutomationQueue = createQueue(
  queueConfigs["reservation-automation"]
);
export const statusUpdatesQueue = createQueue(queueConfigs["status-updates"]);
export const notificationsQueue = createQueue(queueConfigs["notifications"]);
export const reportsQueue = createQueue(queueConfigs["reports"]);

// Queue registry for easy access
export const queues = {
  "reservation-automation": reservationAutomationQueue,
  "status-updates": statusUpdatesQueue,
  notifications: notificationsQueue,
  reports: reportsQueue
} as const;

// Helper function to get current environment cron schedule
export const getCronSchedule = (jobType: string): string => {
  const environment = process.env.NODE_ENV || "development";
  const schedule = cronSchedules[jobType];

  if (!schedule) {
    throw new Error(`No cron schedule defined for job type: ${jobType}`);
  }

  return schedule[environment as keyof CronSchedule] || schedule.development;
};

// Helper function to add job to appropriate queue
export const addJobToQueue = async (
  queueName: keyof typeof queues,
  jobName: string,
  data: QueueJobData,
  options?: JobsOptions
) => {
  const queue = queues[queueName];
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  return await queue.add(jobName, data, options);
};

// Graceful shutdown for all queues
export const closeAllQueues = async () => {
  console.log("🛑 Closing all queues...");

  const closePromises = Object.values(queues).map((queue) => queue.close());
  await Promise.all(closePromises);

  console.log("✅ All queues closed successfully");
};

// Handle process termination
process.on("SIGINT", closeAllQueues);
process.on("SIGTERM", closeAllQueues);
