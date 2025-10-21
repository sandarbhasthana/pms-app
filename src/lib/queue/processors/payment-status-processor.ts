/**
 * Payment Status Processor
 *
 * Handles payment-triggered reservation status updates with smart business logic
 */

import { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { BaseJobProcessor } from "./base-processor";
import { PaymentStatusJobData, JobResult } from "../types";
import { ReservationStatus } from "@prisma/client";

// Types for payment processing
type ReservationWithRelations = {
  id: string;
  status: ReservationStatus;
  guestName: string | null;
  checkIn: Date;
  checkOut: Date;
  paidAmount: number | null;
  paymentStatus: string | null;
  propertyId: string;
  room: {
    id: string;
    name: string;
    pricing: {
      basePrice: number;
      weekdayPrice: number | null;
      weekendPrice: number | null;
      currency: string;
    } | null;
  } | null;
  property: {
    id: string;
    name: string;
    settings: {
      enableAutoConfirmation: boolean | null;
      enableAutoCheckin: boolean | null;
      checkInTime: string | null;
      autoConfirmThreshold: number | null;
    } | null;
  } | null;
};
interface PaymentProcessingContext {
  reservation: {
    id: string;
    status: ReservationStatus;
    guestName: string;
    checkIn: Date;
    checkOut: Date;
    paidAmount: number;
    paymentStatus: string;
    propertyId: string;
  };
  paymentAmount: number;
  paymentType: "full" | "partial" | "deposit";
  newPaidAmount: number;
  totalBookingAmount: number;
  paymentPercentage: number;
  isSameDay: boolean;
}

interface PaymentBusinessLogic {
  shouldUpdateStatus: boolean;
  newStatus: ReservationStatus | null;
  reason: string;
  notifications: string[];
  actions: string[];
}

export class PaymentStatusProcessor extends BaseJobProcessor {
  constructor() {
    super("payment-status-update");
  }

  async process(job: Job<PaymentStatusJobData>): Promise<JobResult> {
    const {
      reservationId,
      paymentAmount,
      paymentIntentId,
      dryRun = false
    } = job.data;

    console.log(
      `🔄 Processing payment status update for reservation: ${reservationId}`
    );

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

    try {
      // Get reservation details with payment information
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        select: {
          id: true,
          status: true,
          guestName: true,
          checkIn: true,
          checkOut: true,
          paidAmount: true,
          paymentStatus: true,
          propertyId: true,
          room: {
            select: {
              id: true,
              name: true,
              pricing: {
                select: {
                  basePrice: true,
                  weekdayPrice: true,
                  weekendPrice: true,
                  currency: true
                }
              }
            }
          },
          property: {
            select: {
              id: true,
              name: true,
              settings: {
                select: {
                  enableAutoConfirmation: true,
                  enableAutoCheckin: true,
                  checkInTime: true,
                  autoConfirmThreshold: true
                }
              }
            }
          }
        }
      });

      if (!reservation) {
        const error = `Reservation not found: ${reservationId}`;
        result.errors.push(error);
        result.success = false;
        return result;
      }

      // Create payment processing context
      const context = this.createPaymentContext(reservation, paymentAmount);

      // Apply smart business logic
      const businessLogic = this.applyPaymentBusinessLogic(
        context,
        reservation.property.settings
      );

      if (!businessLogic.shouldUpdateStatus) {
        result.details.skippedReservations.push(reservationId);
        result.details.notifications.push(
          `No status update needed for ${reservation.guestName} (${reservationId})`
        );
        return result;
      }

      // Execute status update
      if (dryRun) {
        result.details.notifications.push(
          `[DRY RUN] Would update ${reservation.guestName} from ${reservation.status} to ${businessLogic.newStatus}`
        );
        result.details.notifications.push(
          `[DRY RUN] Reason: ${businessLogic.reason}`
        );
        result.details.notifications.push(
          `[DRY RUN] Actions: ${businessLogic.actions.join(", ")}`
        );
      } else {
        await this.executeStatusUpdate(
          reservation,
          businessLogic,
          paymentIntentId,
          context.newPaidAmount
        );
        result.details.reservationsUpdated.push(reservationId);
        result.processedCount = 1;
      }

      // Add business logic notifications
      result.details.notifications.push(...businessLogic.notifications);

      console.log(
        `✅ Payment status processing completed for ${reservationId}`
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `❌ Payment status processing failed for ${reservationId}:`,
        error
      );

      result.errors.push(`Payment processing failed: ${errorMessage}`);
      result.success = false;
      return result;
    }
  }

  /**
   * Create payment processing context with business logic data
   */
  private createPaymentContext(
    reservation: ReservationWithRelations,
    paymentAmount: number
  ): PaymentProcessingContext {
    const now = new Date();
    const checkInDate = new Date(reservation.checkIn);
    const checkOutDate = new Date(reservation.checkOut);
    const isSameDay = now.toDateString() === checkInDate.toDateString();

    const currentPaidAmount = reservation.paidAmount || 0;
    const newPaidAmount = currentPaidAmount + paymentAmount;

    // Calculate total booking amount based on room pricing
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const roomPricing = reservation.room?.pricing;
    const ratePerNight = roomPricing?.basePrice || 2000; // fallback if missing
    const totalBookingAmount = ratePerNight * nights;

    // Calculate payment percentage
    const paymentPercentage =
      totalBookingAmount > 0 ? (newPaidAmount / totalBookingAmount) * 100 : 0;

    // Determine payment type based on percentage of total booking amount
    let paymentType: "full" | "partial" | "deposit";
    if (paymentPercentage >= 100) {
      paymentType = "full";
    } else if (paymentPercentage >= 50) {
      paymentType = "deposit";
    } else {
      paymentType = "partial";
    }

    return {
      reservation: {
        id: reservation.id,
        status: reservation.status as ReservationStatus,
        guestName: reservation.guestName || "Unknown Guest",
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        paidAmount: currentPaidAmount,
        paymentStatus: reservation.paymentStatus || "PENDING",
        propertyId: reservation.propertyId
      },
      paymentAmount,
      paymentType,
      newPaidAmount,
      totalBookingAmount,
      paymentPercentage,
      isSameDay
    };
  }

  /**
   * Apply smart business logic for payment-triggered status updates
   */
  private applyPaymentBusinessLogic(
    context: PaymentProcessingContext,
    propertySettings: {
      enableAutoConfirmation: boolean | null;
      enableAutoCheckin: boolean | null;
      checkInTime: string | null;
      autoConfirmThreshold: number | null;
    } | null
  ): PaymentBusinessLogic {
    const {
      reservation,
      paymentPercentage,
      totalBookingAmount,
      isSameDay,
      paymentType
    } = context;
    const currentStatus = reservation.status;

    // Initialize business logic result
    const logic: PaymentBusinessLogic = {
      shouldUpdateStatus: false,
      newStatus: null,
      reason: "",
      notifications: [],
      actions: []
    };

    // Check if auto-confirmation is enabled
    if (!propertySettings?.enableAutoConfirmation) {
      logic.notifications.push("Auto-confirmation disabled for this property");
      return logic;
    }

    // Business Logic: CONFIRMATION_PENDING → CONFIRMED
    if (currentStatus === "CONFIRMATION_PENDING") {
      const percentageThreshold = propertySettings?.autoConfirmThreshold || 50; // Default 50%

      // Use payment percentage and type to determine if we should confirm
      let shouldConfirm = false;
      let reasonText = "";

      if (paymentType === "full") {
        shouldConfirm = true;
        reasonText = `Full payment received (${paymentPercentage.toFixed(
          1
        )}% of ₹${totalBookingAmount})`;
      } else if (paymentType === "deposit") {
        shouldConfirm = true;
        reasonText = `Deposit payment received (${paymentPercentage.toFixed(
          1
        )}% of ₹${totalBookingAmount})`;
      } else if (paymentPercentage >= percentageThreshold) {
        shouldConfirm = true;
        reasonText = `Payment threshold met (${paymentPercentage.toFixed(
          1
        )}% ≥ ${percentageThreshold}%)`;
      }

      if (shouldConfirm) {
        logic.shouldUpdateStatus = true;
        logic.newStatus = "CONFIRMED";
        logic.reason = reasonText;

        if (isSameDay) {
          logic.notifications.push(
            `🏨 Same-day booking confirmed - Guest can check in upon arrival`
          );
          logic.actions.push("notify-front-desk", "pre-assign-room");
        } else {
          logic.notifications.push(
            `✅ Future booking confirmed - Payment secured`
          );
          logic.actions.push("send-confirmation-email");
        }
      } else {
        logic.notifications.push(
          `Payment received but below confirmation threshold (${paymentPercentage.toFixed(
            1
          )}% < ${percentageThreshold}%)`
        );
      }
    }

    // Business Logic: CONFIRMED → Stay CONFIRMED (no auto check-in)
    else if (currentStatus === "CONFIRMED") {
      if (isSameDay && paymentType === "full") {
        logic.notifications.push(
          `💰 Same-day booking fully paid - Ready for express check-in`
        );
        logic.actions.push("notify-front-desk", "prepare-express-checkin");
      } else {
        logic.notifications.push(
          `Additional payment received - Reservation remains confirmed`
        );
      }
    }

    // Other statuses don't change based on payment
    else {
      logic.notifications.push(
        `Payment received for ${currentStatus} reservation - No status change needed`
      );
    }

    return logic;
  }

  /**
   * Execute the status update with all business logic actions
   */
  private async executeStatusUpdate(
    reservation: ReservationWithRelations,
    businessLogic: PaymentBusinessLogic,
    paymentIntentId?: string,
    newPaidAmount?: number
  ): Promise<void> {
    if (!businessLogic.newStatus) return;

    // Update reservation status and paid amount
    await this.updateReservationStatus(
      reservation.id,
      reservation.propertyId,
      businessLogic.newStatus,
      businessLogic.reason,
      {
        // Add payment-specific data
        ...(paymentIntentId && { stripePaymentIntentId: paymentIntentId }),
        ...(newPaidAmount !== undefined && { paidAmount: newPaidAmount })
      }
    );

    // Execute business logic actions
    await this.executeBusinessActions(reservation, businessLogic.actions);

    console.log(
      `✅ Status updated: ${reservation.guestName} → ${businessLogic.newStatus}`
    );
  }

  /**
   * Execute business logic actions (notifications, room assignment, etc.)
   */
  private async executeBusinessActions(
    reservation: ReservationWithRelations,
    actions: string[]
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action) {
          case "notify-front-desk":
            // TODO: Implement front desk notification
            console.log(
              `📢 Front desk notified: ${reservation.guestName} ready for check-in`
            );
            break;

          case "pre-assign-room":
            // TODO: Implement room pre-assignment logic
            console.log(
              `🏠 Room pre-assignment triggered for ${reservation.guestName}`
            );
            break;

          case "prepare-express-checkin":
            // TODO: Implement express check-in preparation
            console.log(
              `⚡ Express check-in prepared for ${reservation.guestName}`
            );
            break;

          case "send-confirmation-email":
            // TODO: Implement confirmation email
            console.log(
              `📧 Confirmation email queued for ${reservation.guestName}`
            );
            break;

          default:
            console.log(`⚠️ Unknown action: ${action}`);
        }
      } catch (error) {
        console.error(`❌ Failed to execute action ${action}:`, error);
        // Don't throw - actions are supplementary
      }
    }
  }
}
