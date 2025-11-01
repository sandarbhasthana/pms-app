import { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { BaseJobProcessor } from "./base-processor";
import { LateCheckoutDetectionJobData, JobResult } from "../types";
import { ReservationStatus } from "@prisma/client";
import {
  getOperationalDayStart,
  getOperationalDate
} from "@/lib/timezone/day-boundaries";

// Types for late checkout detection
interface PropertyAutomationSettings {
  checkOutTime: string;
  lateCheckoutGraceHours: number;
  enableLateCheckoutDetection: boolean;
  notifyOnLateCheckout: boolean;
  lateCheckoutLookbackDays: number;
  lateCheckoutFee: number;
  lateCheckoutFeeType: string;
}

interface LateCheckoutCandidate {
  id: string;
  guestName: string | null;
  checkOut: Date;
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

export class LateCheckoutProcessor extends BaseJobProcessor {
  constructor() {
    super("late-checkout-detection");
  }

  async process(job: Job<LateCheckoutDetectionJobData>): Promise<JobResult> {
    try {
      const { propertyId, dryRun = false, graceHours } = job.data;

      this.logJobStart(job);

      if (!propertyId) {
        return {
          success: false,
          processedCount: 0,
          errors: ["Property ID is required"],
          details: {
            reservationsUpdated: [],
            skippedReservations: [],
            notifications: []
          }
        };
      }

      // Get property settings and validate automation is enabled
      const settings = await this.getPropertySettings(propertyId);

      // Check if late checkout detection is enabled for this property
      if (!settings.enableLateCheckoutDetection) {
        return {
          success: true,
          processedCount: 0,
          errors: [],
          details: {
            reservationsUpdated: [],
            skippedReservations: [],
            notifications: [
              "Late checkout detection is disabled for this property"
            ]
          }
        };
      }

      const effectiveGraceHours = graceHours || settings.lateCheckoutGraceHours;

      // Enhanced late checkout detection logic
      const now = new Date();
      const results = await this.detectLateCheckoutReservations(
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
      const result = await this.processLateCheckoutReservations(
        results.reservations,
        effectiveGraceHours,
        dryRun,
        settings
      );

      // Add summary notification
      if (result.processedCount > 0) {
        const action = dryRun ? "identified" : "processed";
        result.details.notifications.unshift(
          `Late checkout detection completed: ${action} ${result.processedCount} reservations with late checkout`
        );
      } else {
        result.details.notifications.push(
          "No reservations found requiring late checkout processing"
        );
      }

      this.logJobComplete(job, result);
      return result;
    } catch (error) {
      const result = this.handleError(error, "late checkout detection");
      this.logJobComplete(job, result);
      return result;
    }
  }

  /**
   * Enhanced late checkout detection with comprehensive business rules
   */
  private async detectLateCheckoutReservations(
    propertyId: string,
    settings: PropertyAutomationSettings,
    graceHours: number,
    currentTime: Date
  ) {
    // Calculate checkout times for different scenarios
    const today = new Date(
      currentTime.getFullYear(),
      currentTime.getMonth(),
      currentTime.getDate()
    );
    const [checkOutHour, checkOutMinute] = settings.checkOutTime
      .split(":")
      .map(Number);

    const checkOutTime = new Date(today);
    checkOutTime.setHours(checkOutHour, checkOutMinute, 0, 0);

    const cutoffTime = new Date(
      checkOutTime.getTime() + graceHours * 60 * 60 * 1000
    );

    // Note: We no longer check if it's "too early" globally since we filter reservations individually
    // This allows us to catch overdue checkouts from previous days

    // Production late checkout detection logic
    // Look for reservations that should have checked out but haven't
    // Use configurable lookback days from property settings
    const maxLookbackDays = settings.lateCheckoutLookbackDays;
    const lookbackDate = new Date(
      today.getTime() - maxLookbackDays * 24 * 60 * 60 * 1000
    );

    const candidateReservations = await prisma.reservation.findMany({
      where: {
        propertyId,
        status: ReservationStatus.IN_HOUSE, // Only guests currently in-house
        // Exclude soft-deleted reservations
        deletedAt: null,
        checkOut: {
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
        guestName: true,
        checkOut: true,
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
    // Get property timezone for operational day calculations
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { timezone: true }
    });
    const timezone = property?.timezone || "UTC";

    const overdueReservations = candidateReservations.filter((reservation) => {
      const reservationCheckOut = new Date(reservation.checkOut);

      // Use operational date (6 AM boundary) instead of midnight
      const operationalDate = getOperationalDate(reservationCheckOut, timezone);
      const operationalDayStart = getOperationalDayStart(
        new Date(operationalDate),
        timezone
      );

      // Calculate cutoff time for this specific reservation
      const reservationCheckOutTime = new Date(operationalDayStart);
      reservationCheckOutTime.setHours(checkOutHour, checkOutMinute, 0, 0);

      const reservationCutoffTime = new Date(
        reservationCheckOutTime.getTime() + graceHours * 60 * 60 * 1000
      );

      // Production business rules for late checkout detection
      const isOverdue = currentTime >= reservationCutoffTime;

      // Get operational date for today
      const todayOperationalDate = getOperationalDate(today, timezone);

      // Check if checkout is on today's operational day or earlier
      const isCheckoutDay =
        new Date(operationalDate) <= new Date(todayOperationalDate);

      // Only mark as late checkout if:
      // 1. Past the cutoff time AND
      // 2. It's the checkout day or later
      return isOverdue && isCheckoutDay;
    });

    return {
      tooEarly: false,
      message: `Found ${overdueReservations.length} late checkout reservations out of ${candidateReservations.length} candidates`,
      reservations: overdueReservations,
      cutoffTime
    };
  }

  /**
   * Process detected late checkout reservations
   */
  private async processLateCheckoutReservations(
    reservations: LateCheckoutCandidate[],
    graceHours: number,
    dryRun: boolean,
    settings: PropertyAutomationSettings
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
        const checkOutDate = new Date(
          reservation.checkOut
        ).toLocaleDateString();
        const reason = `Late checkout detected: Guest has not checked out by ${checkOutDate} + ${graceHours}h grace period. Automated system detection.`;

        if (dryRun) {
          result.details.notifications.push(
            `[DRY RUN] Would process late checkout for reservation ${reservation.id} (${reservation.guestName}): ${reason}`
          );
          result.details.skippedReservations.push(reservation.id);
        } else {
          // Note: We don't change the reservation status for late checkout
          // Instead, we handle the business logic (fees, notifications, etc.)
          result.details.reservationsUpdated.push(reservation.id);
          result.details.notifications.push(
            `Processed late checkout for reservation ${reservation.id} (${reservation.guestName}): ${reason}`
          );

          // Production features - implement these based on business requirements
          await this.handleLateCheckoutBusinessLogic(
            reservation,
            graceHours,
            reason,
            settings
          );
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
   * Handle production business logic for late checkout reservations
   */
  private async handleLateCheckoutBusinessLogic(
    reservation: LateCheckoutCandidate,
    graceHours: number,
    reason: string,
    settings: PropertyAutomationSettings
  ): Promise<void> {
    try {
      console.log(`🚨 Processing late checkout business logic: ${reason}`);

      // 1. Late checkout fee calculation and billing
      const lateCheckoutFee = await this.calculateLateCheckoutFee(
        reservation,
        graceHours,
        settings
      );
      if (lateCheckoutFee > 0) {
        console.log(
          `💰 Applying late checkout fee: $${lateCheckoutFee} for ${reservation.guestName} - ${reason}`
        );

        // Add late checkout fee to reservation as a pending payment
        await prisma.payment.create({
          data: {
            reservationId: reservation.id,
            type: "LATE_CHECKOUT_FEE",
            method: "PENDING",
            status: "PENDING",
            amount: lateCheckoutFee,
            currency: "USD",
            description: `Late Checkout Fee - ${reason}`,
            notes: `Automatically added by system. Fee type: ${settings.lateCheckoutFeeType}`
          }
        });

        console.log(
          `✅ Late checkout fee of $${lateCheckoutFee} added to reservation ${reservation.id}`
        );
      }

      // 2. Housekeeping notification - room needs priority cleaning
      console.log(
        `🧹 Priority housekeeping alert: Room ${reservation.room?.name} - ${reason}`
      );
      // Implementation: Notify housekeeping system for priority cleaning

      // 3. Front desk notification - guest still in room
      console.log(
        `📧 Late checkout alert for ${reservation.guestName} in room ${reservation.room?.name} - ${reason}`
      );
      // Implementation: Send alert to front desk staff

      // 4. Room availability delay - update availability systems
      console.log(
        `🏨 Room ${reservation.room?.name} availability delayed due to late checkout`
      );
      // Implementation: Update room availability in PMS and channel managers

      // 5. Revenue management - potential upsell opportunity
      console.log(
        `📊 Late checkout revenue opportunity for ${reservation.guestName}`
      );
      // Implementation: Trigger upsell notifications or automatic late checkout packages

      // 6. Guest communication - courtesy notification
      console.log(
        `📱 Sending courtesy late checkout notification to ${reservation.email}`
      );
      // Implementation: Send SMS/email to guest about late checkout and fees
    } catch (error) {
      console.error(
        `❌ Error handling late checkout business logic for ${reservation.id}:`,
        error
      );
      // Don't throw - we don't want business logic failures to stop the main process
    }
  }

  /**
   * Calculate late checkout fee based on property settings and duration
   */
  private async calculateLateCheckoutFee(
    reservation: LateCheckoutCandidate,
    graceHours: number,
    settings: PropertyAutomationSettings
  ): Promise<number> {
    // If no fee configured, return 0
    if (!settings.lateCheckoutFee || settings.lateCheckoutFee === 0) {
      return 0;
    }

    // Calculate hours over grace period
    const now = new Date();
    const checkOutTime = new Date(reservation.checkOut);
    const graceEndTime = new Date(
      checkOutTime.getTime() + graceHours * 60 * 60 * 1000
    );

    if (now <= graceEndTime) {
      return 0; // Still within grace period
    }

    const overageHours = Math.ceil(
      (now.getTime() - graceEndTime.getTime()) / (60 * 60 * 1000)
    );

    let totalFee = 0;

    // Calculate fee based on fee type
    switch (settings.lateCheckoutFeeType) {
      case "FLAT_RATE":
        // One-time flat fee regardless of duration
        totalFee = Number(settings.lateCheckoutFee);
        break;

      case "HOURLY":
        // Fee per hour over grace period
        totalFee = Number(settings.lateCheckoutFee) * overageHours;
        break;

      case "PERCENTAGE_OF_ROOM_RATE":
      case "PERCENTAGE_OF_TOTAL_BILL":
        // TODO: Implement percentage-based fees when room rate tracking is added
        // For now, fall back to flat rate
        console.warn(
          `Percentage-based fee type ${settings.lateCheckoutFeeType} not yet implemented. Using flat rate instead.`
        );
        totalFee = Number(settings.lateCheckoutFee);
        break;

      default:
        console.warn(
          `Unknown late checkout fee type: ${settings.lateCheckoutFeeType}`
        );
        totalFee = 0;
    }

    return Math.round(totalFee * 100) / 100; // Round to 2 decimal places
  }
}
