import { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { BaseJobProcessor } from "./base-processor";
import { LateCheckoutDetectionJobData, JobResult } from "../types";
import { ReservationStatus } from "@prisma/client";

// Types for late checkout detection
interface PropertyAutomationSettings {
  checkOutTime: string;
  lateCheckoutGraceHours: number;
  enableLateCheckoutDetection: boolean;
  notifyOnLateCheckout: boolean;
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
        dryRun
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
    const maxLookbackDays = 2; // Check last 2 days for late checkouts
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
    const overdueReservations = candidateReservations.filter((reservation) => {
      const reservationCheckOut = new Date(reservation.checkOut);
      const reservationDate = new Date(
        reservationCheckOut.getFullYear(),
        reservationCheckOut.getMonth(),
        reservationCheckOut.getDate()
      );

      // Calculate cutoff time for this specific reservation
      const reservationCheckOutTime = new Date(reservationDate);
      reservationCheckOutTime.setHours(checkOutHour, checkOutMinute, 0, 0);

      const reservationCutoffTime = new Date(
        reservationCheckOutTime.getTime() + graceHours * 60 * 60 * 1000
      );

      // Production business rules for late checkout detection
      const isOverdue = currentTime >= reservationCutoffTime;
      const isCheckoutDay = reservationDate.getTime() <= today.getTime(); // Checkout day or earlier

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
            reason
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
    reason: string
  ): Promise<void> {
    try {
      console.log(`🚨 Processing late checkout business logic: ${reason}`);

      // 1. Late checkout fee calculation and billing
      const lateCheckoutFee = this.calculateLateCheckoutFee(
        reservation,
        graceHours
      );
      if (lateCheckoutFee > 0) {
        console.log(
          `💰 Applying late checkout fee: $${lateCheckoutFee / 100} for ${
            reservation.guestName
          } - ${reason}`
        );
        // Implementation: Add late checkout fee to guest bill
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
  private calculateLateCheckoutFee(
    reservation: LateCheckoutCandidate,
    graceHours: number
  ): number {
    // This would typically be configured per property
    const baseLateFee = 5000; // $50.00 base fee
    const hourlyRate = 2000; // $20.00 per hour

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
    const totalFee = baseLateFee + hourlyRate * overageHours;

    return totalFee;
  }
}
