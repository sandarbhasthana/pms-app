/**
 * Base Job Processor
 *
 * Abstract base class for all job processors with common functionality
 */

import { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { QueueJobData, JobResult } from "../types";
import { ReservationStatus } from "@prisma/client";

export abstract class BaseJobProcessor {
  protected jobName: string;

  constructor(jobName: string) {
    this.jobName = jobName;
  }

  /**
   * Abstract method that must be implemented by each processor
   */
  abstract process(job: Job<QueueJobData>): Promise<JobResult>;

  /**
   * Common error handling for all processors
   */
  protected handleError(error: Error | unknown, context: string): JobResult {
    console.error(`❌ Error in ${this.jobName} - ${context}:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      processedCount: 0,
      errors: [errorMessage],
      details: {
        reservationsUpdated: [],
        skippedReservations: [],
        notifications: [`Error in ${context}: ${errorMessage}`]
      }
    };
  }

  /**
   * Log job start
   */
  protected logJobStart(job: Job<QueueJobData>): void {
    console.log(
      `🚀 Starting ${this.jobName} job ${job.id} for property ${job.data.propertyId}`
    );
  }

  /**
   * Log job completion
   */
  protected logJobComplete(job: Job<QueueJobData>, result: JobResult): void {
    const status = result.success ? "✅" : "❌";
    console.log(`${status} Completed ${this.jobName} job ${job.id}:`, {
      success: result.success,
      processed: result.processedCount,
      errors: result.errors.length
    });
  }

  /**
   * Get property automation settings
   */
  protected async getPropertySettings(propertyId: string) {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          settings: true
        }
      });

      if (!property) {
        throw new Error(`Property not found: ${propertyId}`);
      }

      // Return settings with defaults
      const settings = property.settings;
      return {
        checkInTime: settings?.checkInTime || "15:00",
        checkOutTime: settings?.checkOutTime || "11:00",
        noShowGraceHours: settings?.noShowGraceHours || 6,
        lateCheckoutGraceHours: settings?.lateCheckoutGraceHours || 1,
        autoConfirmThreshold: settings?.autoConfirmThreshold || 50,
        sameDayPaymentRequired: settings?.sameDayPaymentRequired || 100,

        // Automation toggles (default to true if not set)
        enableNoShowDetection: settings?.enableNoShowDetection ?? true,
        enableLateCheckoutDetection:
          settings?.enableLateCheckoutDetection ?? true,
        enableAutoCheckin: settings?.enableAutoCheckin ?? true,
        enableAutoConfirmation: settings?.enableAutoConfirmation ?? true,

        // Notification settings
        notifyOnNoShow: settings?.notifyOnNoShow ?? true,
        notifyOnLateCheckout: settings?.notifyOnLateCheckout ?? true,
        notifyOnAutomationFailure: settings?.notifyOnAutomationFailure ?? true
      };
    } catch (error) {
      console.error(
        `Error fetching property settings for ${propertyId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create status history entry
   */
  protected async createStatusHistory(
    reservationId: string,
    propertyId: string,
    previousStatus: ReservationStatus | null,
    newStatus: ReservationStatus,
    reason: string,
    changedBy: string = "system-automation"
  ) {
    try {
      await prisma.reservationStatusHistory.create({
        data: {
          reservationId,
          propertyId,
          previousStatus,
          newStatus,
          changedBy,
          changeReason: reason,
          changedAt: new Date(),
          isAutomatic: true
        }
      });
    } catch (error) {
      console.error("Error creating status history:", error);
      // Don't throw - status history is important but shouldn't fail the main operation
    }
  }

  /**
   * Update reservation status with history
   */
  protected async updateReservationStatus(
    reservationId: string,
    propertyId: string,
    newStatus: ReservationStatus,
    reason: string,
    additionalData: Record<string, unknown> = {}
  ) {
    return await prisma.$transaction(async (tx) => {
      // Get current reservation
      const currentReservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        select: { status: true }
      });

      if (!currentReservation) {
        throw new Error(`Reservation not found: ${reservationId}`);
      }

      // Update reservation
      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: newStatus,
          statusUpdatedAt: new Date(),
          statusUpdatedBy: "system-automation",
          statusChangeReason: reason,
          ...additionalData
        }
      });

      // Create status history
      await tx.reservationStatusHistory.create({
        data: {
          reservationId,
          propertyId,
          previousStatus: currentReservation.status,
          newStatus: newStatus,
          changedBy: "system-automation",
          changeReason: reason,
          changedAt: new Date(),
          isAutomatic: true
        }
      });

      return updatedReservation;
    });
  }

  /**
   * Check if automation is enabled for property
   */
  protected async isAutomationEnabled(
    propertyId: string,
    automationType: string
  ): Promise<boolean> {
    try {
      const settings = await this.getPropertySettings(propertyId);

      switch (automationType) {
        case "no-show":
          return settings.enableNoShowDetection;
        case "late-checkout":
          return settings.enableLateCheckoutDetection;
        case "auto-checkin":
          return settings.enableAutoCheckin;
        case "auto-confirmation":
          return settings.enableAutoConfirmation;
        default:
          return true; // Default to enabled
      }
    } catch (error) {
      console.error(
        `Error checking automation status for ${propertyId}:`,
        error
      );
      return false; // Default to disabled on error
    }
  }
}
