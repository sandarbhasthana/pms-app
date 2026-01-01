/**
 * Channex Queue Helpers
 *
 * Helper functions for queueing Channex sync jobs.
 * Provides a clean API for triggering sync operations from other parts of the application.
 */

import { channexSyncQueue, getCronSchedule } from "@/lib/queue/queues";
import { format } from "date-fns";
import type {
  ChannexARISyncJobData,
  ChannexFullSyncJobData,
  ChannexReservationSyncJobData
} from "@/lib/queue/types";

/**
 * Queue an incremental ARI sync for a specific room type and date range
 */
export async function queueARISync(params: {
  propertyId: string;
  roomTypeId?: string;
  startDate: Date;
  endDate: Date;
  triggeredBy?: string;
  priority?: number;
}) {
  const { propertyId, roomTypeId, startDate, endDate, triggeredBy, priority } =
    params;

  const jobData: ChannexARISyncJobData = {
    jobType: "channex-ari-sync",
    propertyId,
    roomTypeId,
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
    triggeredBy,
    timestamp: new Date()
  };

  const jobId = roomTypeId
    ? `ari-sync-${propertyId}-${roomTypeId}-${format(startDate, "yyyyMMdd")}`
    : `ari-sync-${propertyId}-${format(startDate, "yyyyMMdd")}`;

  return channexSyncQueue.add("channex-ari-sync", jobData, {
    jobId,
    priority,
    removeOnComplete: 100,
    removeOnFail: 50
  });
}

/**
 * Queue a full property sync (typically 365 days ahead)
 */
export async function queueFullSync(params: {
  propertyId: string;
  daysAhead?: number;
  triggeredBy?: string;
}) {
  const { propertyId, daysAhead = 365, triggeredBy } = params;

  const jobData: ChannexFullSyncJobData = {
    jobType: "channex-full-sync",
    propertyId,
    daysAhead,
    triggeredBy,
    timestamp: new Date()
  };

  return channexSyncQueue.add("channex-full-sync", jobData, {
    jobId: `full-sync-${propertyId}-${Date.now()}`,
    removeOnComplete: 50,
    removeOnFail: 25
  });
}

/**
 * Queue a reservation sync to push status updates to Channex
 */
export async function queueReservationSync(params: {
  reservationId: string;
  propertyId: string;
  action: "create" | "update" | "cancel";
  triggeredBy?: string;
}) {
  const { reservationId, propertyId, action, triggeredBy } = params;

  const jobData: ChannexReservationSyncJobData = {
    jobType: "channex-reservation-sync",
    reservationId,
    propertyId,
    action,
    triggeredBy,
    timestamp: new Date()
  };

  return channexSyncQueue.add("channex-reservation-sync", jobData, {
    jobId: `res-sync-${reservationId}-${action}`,
    priority: 1, // High priority for reservation updates
    removeOnComplete: 200,
    removeOnFail: 100
  });
}

/**
 * Queue ARI sync for a single date (commonly used after reservation changes)
 */
export async function queueSingleDateSync(params: {
  propertyId: string;
  roomTypeId: string;
  date: Date;
  triggeredBy?: string;
}) {
  const { propertyId, roomTypeId, date, triggeredBy } = params;

  return queueARISync({
    propertyId,
    roomTypeId,
    startDate: date,
    endDate: date,
    triggeredBy,
    priority: 2 // Medium-high priority
  });
}

/**
 * Queue ARI sync for a date range (commonly used after rate changes)
 */
export async function queueDateRangeSync(params: {
  propertyId: string;
  roomTypeId?: string;
  startDate: Date;
  endDate: Date;
  triggeredBy?: string;
}) {
  return queueARISync({
    ...params,
    priority: 3 // Normal priority
  });
}

/**
 * Schedule recurring full sync for a property
 */
export async function scheduleRecurringFullSync(propertyId: string) {
  const jobData: ChannexFullSyncJobData = {
    jobType: "channex-full-sync",
    propertyId,
    daysAhead: 365,
    triggeredBy: "scheduler",
    timestamp: new Date()
  };

  return channexSyncQueue.add("channex-full-sync", jobData, {
    jobId: `scheduled-full-sync-${propertyId}`,
    repeat: {
      pattern: getCronSchedule("channex-full-sync")
    }
  });
}

/**
 * Remove scheduled recurring sync for a property
 */
export async function removeRecurringFullSync(propertyId: string) {
  return channexSyncQueue.removeRepeatableByKey(
    `scheduled-full-sync-${propertyId}`
  );
}
