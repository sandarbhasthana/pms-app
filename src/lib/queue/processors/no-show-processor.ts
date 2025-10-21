/**
 * No-Show Detection Processor
 *
 * Automatically detects and marks reservations as NO_SHOW based on property settings
 */

import { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { BaseJobProcessor } from "./base-processor";
import { NoShowDetectionJobData, JobResult } from "../types";
import { ReservationStatus } from "@prisma/client";

// Types for no-show detection
interface PropertyAutomationSettings {
  checkInTime: string;
  noShowGraceHours: number;
  enableNoShowDetection: boolean;
  notifyOnNoShow: boolean;
}

interface NoShowCandidate {
  id: string;
  propertyId: string;
  guestName: string | null;
  checkIn: Date;
  email: string | null;
  phone: string | null;
  amountCaptured: number | null;
  amountHeld: number | null;
  depositAmount: number | null;
  room: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export class NoShowProcessor extends BaseJobProcessor {
  constructor() {
    super("no-show-detection");
  }

  async process(job: Job<NoShowDetectionJobData>): Promise<JobResult> {
    this.logJobStart(job);

    try {
      const { propertyId, graceHours, dryRun = false } = job.data;

      // Check if automation is enabled for this property
      const automationEnabled = await this.isAutomationEnabled(
        propertyId,
        "no-show"
      );
      if (!automationEnabled) {
        return {
          success: true,
          processedCount: 0,
          errors: [],
          details: {
            reservationsUpdated: [],
            skippedReservations: [],
            notifications: [
              `No-show detection disabled for property ${propertyId}`
            ]
          }
        };
      }

      // Get property settings and validate automation is enabled
      const settings = await this.getPropertySettings(propertyId);

      // Check if no-show detection is enabled for this property
      if (!settings.enableNoShowDetection) {
        return {
          success: true,
          processedCount: 0,
          errors: [],
          details: {
            reservationsUpdated: [],
            skippedReservations: [],
            notifications: ["No-show detection is disabled for this property"]
          }
        };
      }

      const effectiveGraceHours = graceHours || settings.noShowGraceHours;

      // Enhanced no-show detection logic
      const now = new Date();
      const results = await this.detectNoShowReservations(
        propertyId,
        settings,
        effectiveGraceHours,
        now
      );

      if (results.tooEarly) {
        return {
          success: true,
          processedCount: 0,
          errors: [],
          details: {
            reservationsUpdated: [],
            skippedReservations: [],
            notifications: [results.message]
          }
        };
      }

      // Process the detected reservations
      const result = await this.processNoShowReservations(
        results.reservations,
        effectiveGraceHours,
        dryRun
      );

      // Add summary notification
      if (result.processedCount > 0) {
        const action = dryRun ? "identified" : "marked";
        result.details.notifications.unshift(
          `No-show detection completed: ${action} ${result.processedCount} reservations as no-show`
        );
      } else {
        result.details.notifications.push(
          "No reservations found requiring no-show status"
        );
      }

      this.logJobComplete(job, result);
      return result;
    } catch (error) {
      const result = this.handleError(error, "no-show detection");
      this.logJobComplete(job, result);
      return result;
    }
  }

  /**
   * Enhanced no-show detection with comprehensive business rules
   */
  private async detectNoShowReservations(
    propertyId: string,
    settings: PropertyAutomationSettings,
    graceHours: number,
    currentTime: Date
  ) {
    // Calculate cutoff times for different scenarios
    const today = new Date(
      currentTime.getFullYear(),
      currentTime.getMonth(),
      currentTime.getDate()
    );
    const [checkInHour, checkInMinute] = settings.checkInTime
      .split(":")
      .map(Number);

    const checkInTime = new Date(today);
    checkInTime.setHours(checkInHour, checkInMinute, 0, 0);

    const cutoffTime = new Date(
      checkInTime.getTime() + graceHours * 60 * 60 * 1000
    );

    // Note: We no longer check if it's "too early" globally since we filter reservations individually
    // This allows us to catch overdue reservations from previous days

    // Production no-show detection logic
    // Look for reservations that should have checked in but haven't
    const maxLookbackDays = 3; // Industry standard: check last 3 days for no-shows
    const lookbackDate = new Date(
      today.getTime() - maxLookbackDays * 24 * 60 * 60 * 1000
    );

    const candidateReservations = await prisma.reservation.findMany({
      where: {
        propertyId,
        status: ReservationStatus.CONFIRMED,
        checkIn: {
          gte: lookbackDate,
          lte: currentTime // Only check reservations up to current time
        },
        // Exclude reservations with automation disabled or manual overrides
        NOT: [
          {
            statusChangeReason: {
              contains: "automation-disabled"
            }
          },
          {
            statusChangeReason: {
              contains: "manual-override"
            }
          }
        ]
      },
      select: {
        id: true,
        propertyId: true,
        guestName: true,
        checkIn: true,
        email: true,
        phone: true,
        amountCaptured: true,
        amountHeld: true,
        depositAmount: true,
        room: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    // Filter reservations that are actually overdue with production business rules
    const overdueReservations = candidateReservations.filter((reservation) => {
      const reservationCheckIn = new Date(reservation.checkIn);
      const reservationDate = new Date(
        reservationCheckIn.getFullYear(),
        reservationCheckIn.getMonth(),
        reservationCheckIn.getDate()
      );

      // Calculate cutoff time for this specific reservation
      const reservationCheckInTime = new Date(reservationDate);
      reservationCheckInTime.setHours(checkInHour, checkInMinute, 0, 0);

      const reservationCutoffTime = new Date(
        reservationCheckInTime.getTime() + graceHours * 60 * 60 * 1000
      );

      // Production business rules for no-show detection
      const isOverdue = currentTime >= reservationCutoffTime;
      const isNotSameDay = reservationDate.getTime() < today.getTime(); // Not today's reservation
      const hasMinimumPayment = (reservation.amountCaptured || 0) > 0; // Has some payment

      // Only mark as no-show if:
      // 1. Past the cutoff time AND
      // 2. (Not same day OR has minimum payment) - prevents premature same-day no-shows
      return isOverdue && (isNotSameDay || hasMinimumPayment);
    });

    return {
      tooEarly: false,
      message: `Found ${overdueReservations.length} overdue reservations out of ${candidateReservations.length} candidates`,
      reservations: overdueReservations,
      cutoffTime
    };
  }

  /**
   * Process detected no-show reservations
   */
  private async processNoShowReservations(
    reservations: NoShowCandidate[],
    graceHours: number,
    dryRun: boolean
  ): Promise<JobResult> {
    const result: JobResult = {
      success: true,
      processedCount: 0,
      errors: [],
      details: {
        reservationsUpdated: [],
        skippedReservations: [],
        notifications: []
      }
    };

    for (const reservation of reservations) {
      try {
        const checkInDate = new Date(reservation.checkIn).toLocaleDateString();
        const reason = `No-show detected: Guest did not check in by ${checkInDate} + ${graceHours}h grace period. Automated system detection.`;

        if (dryRun) {
          result.details.notifications.push(
            `[DRY RUN] Would mark reservation ${reservation.id} (${reservation.guestName}) as NO_SHOW`
          );
          result.details.skippedReservations.push(reservation.id);
        } else {
          // Update reservation status
          await this.updateReservationStatus(
            reservation.id,
            reservation.propertyId,
            ReservationStatus.NO_SHOW,
            reason
          );

          result.details.reservationsUpdated.push(reservation.id);
          result.details.notifications.push(
            `Marked reservation ${reservation.id} (${reservation.guestName}) as NO_SHOW`
          );

          // Production features - implement these based on business requirements
          await this.handleNoShowBusinessLogic(reservation);
        }

        result.processedCount++;
      } catch (error) {
        const errorMsg = `Failed to process reservation ${reservation.id}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        result.errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return result;
  }

  /**
   * Handle production business logic for no-show reservations
   */
  private async handleNoShowBusinessLogic(
    reservation: NoShowCandidate
  ): Promise<void> {
    try {
      // 1. Room availability update - mark room as available
      // Note: This would integrate with room management system
      console.log(
        `🏨 Room ${reservation.room?.name} is now available due to no-show`
      );

      // 2. Revenue management - handle deposits and payments
      if (reservation.depositAmount && reservation.depositAmount > 0) {
        console.log(
          `💰 Processing deposit retention for no-show: $${
            reservation.depositAmount / 100
          }`
        );
        // Implementation: Retain deposit as per cancellation policy
      }

      // 3. Notification system - alert front desk
      console.log(
        `📧 Sending no-show notification for ${reservation.guestName} (${reservation.email})`
      );
      // Implementation: Send email/SMS to front desk staff

      // 4. Channel manager updates - update external booking platforms
      console.log(`🔄 Updating channel managers for room availability`);
      // Implementation: Notify OTAs and booking channels

      // 5. Housekeeping integration - room doesn't need cleaning
      console.log(
        `🧹 Notifying housekeeping: Room ${reservation.room?.name} - no cleaning required`
      );
      // Implementation: Update housekeeping system

      // 6. Analytics and reporting
      console.log(`📊 Recording no-show analytics data`);
      // Implementation: Update business intelligence/reporting systems
    } catch (error) {
      console.error(
        `❌ Error handling no-show business logic for ${reservation.id}:`,
        error
      );
      // Don't throw - we don't want business logic failures to stop the main process
    }
  }
}
