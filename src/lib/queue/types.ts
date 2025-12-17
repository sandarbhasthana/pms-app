/**
 * Queue Job Types and Interfaces
 *
 * Type definitions for all queue jobs in the reservation system
 */

import { ReservationStatus } from "@prisma/client";
import { ReportGenerationRequest } from "../reports/types";

// Base job data interface
export interface BaseJobData {
  propertyId: string;
  triggeredBy?: string;
  timestamp: Date;
}

// No-show detection job data
export interface NoShowDetectionJobData extends BaseJobData {
  jobType: "no-show-detection";
  graceHours?: number; // Override property default
  dryRun?: boolean; // For testing - don't actually update
}

// Late checkout detection job data
export interface LateCheckoutDetectionJobData extends BaseJobData {
  jobType: "late-checkout-detection";
  graceHours?: number;
  applyFees?: boolean;
  dryRun?: boolean;
}

// Legacy alias for backward compatibility
export type LateCheckoutJobData = LateCheckoutDetectionJobData;

// Cleanup job data
export interface CleanupJobData extends BaseJobData {
  jobType: "cleanup";
  cleanupType?:
    | "full"
    | "stale-reservations"
    | "orphaned-data"
    | "audit-archive"
    | "performance";
  daysToKeep?: number; // For audit archival
  dryRun?: boolean;
}

// Auto check-in job data
export interface AutoCheckinJobData extends BaseJobData {
  jobType: "auto-checkin";
  reservationIds?: string[]; // Specific reservations or all eligible
  dryRun?: boolean;
}

// Status update job data
export interface StatusUpdateJobData extends BaseJobData {
  jobType: "status-update";
  reservationId: string;
  newStatus: ReservationStatus;
  reason: string;
  isAutomatic: boolean;
}

// Payment status job data
export interface PaymentStatusJobData extends BaseJobData {
  jobType: "payment-status-update";
  reservationId: string;
  paymentAmount: number;
  paymentIntentId?: string;
  paymentType?: "full" | "partial" | "deposit";
  dryRun?: boolean;
}

// Report generation job data
export interface ReportGenerationJobData {
  jobType: "generate-report";
  request: ReportGenerationRequest;
  propertyId?: string; // Optional since reports can be org-wide
  triggeredBy?: string;
  timestamp?: Date;
}

// Union type for all job data
export type QueueJobData =
  | NoShowDetectionJobData
  | LateCheckoutDetectionJobData
  | CleanupJobData
  | AutoCheckinJobData
  | StatusUpdateJobData
  | PaymentStatusJobData
  | ReportGenerationJobData;

// Job result interface
export interface JobResult {
  success: boolean;
  processedCount: number;
  errors: string[];
  details: {
    reservationsUpdated: string[];
    skippedReservations: string[];
    notifications: string[];
  };
}

// Queue configuration
export interface QueueConfig {
  name: string;
  defaultJobOptions: {
    removeOnComplete: number;
    removeOnFail: number;
    attempts: number;
    backoff: {
      type: "exponential";
      delay: number;
    };
    timeout?: number; // Optional timeout in milliseconds for job execution
  };
}

// Cron schedule configuration
export interface CronSchedule {
  development: string;
  testing: string;
  staging: string;
  production: string;
}

// Automation settings (from property settings)
export interface AutomationSettings {
  enabled: boolean;
  checkInTime: string; // "15:00"
  checkOutTime: string; // "11:00"
  noShowGraceHours: number; // 6
  lateCheckoutGraceHours: number; // 1
  autoConfirmThreshold: number; // 50 (percentage)
  sameDayPaymentRequired: number; // 100 (percentage)

  // Automation toggles
  enableNoShowDetection: boolean;
  enableLateCheckoutDetection: boolean;
  enableAutoCheckin: boolean;
  enableAutoConfirmation: boolean;

  // Notification settings
  notifyOnNoShow: boolean;
  notifyOnLateCheckout: boolean;
  notifyOnAutomationFailure: boolean;
}
