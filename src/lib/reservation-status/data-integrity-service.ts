// File: src/lib/reservation-status/data-integrity-service.ts

import { ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { StatusTransitionContext } from "./advanced-validation";

// Data integrity check result
export interface DataIntegrityResult {
  isValid: boolean;
  issues: DataIntegrityIssue[];
  warnings: string[];
  autoFixable: DataIntegrityIssue[];
}

export interface DataIntegrityIssue {
  type:
    | "CONFLICT"
    | "INCONSISTENCY"
    | "MISSING_DATA"
    | "INVALID_REFERENCE"
    | "BUSINESS_RULE_VIOLATION";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  affectedFields: string[];
  suggestedFix?: string;
  autoFixable: boolean;
  relatedRecords?: string[];
}

/**
 * Data Integrity Service for Reservation Status Management
 */
export class DataIntegrityService {
  /**
   * Comprehensive data integrity check for status transition
   */
  async checkDataIntegrity(
    context: StatusTransitionContext
  ): Promise<DataIntegrityResult> {
    const result: DataIntegrityResult = {
      isValid: true,
      issues: [],
      warnings: [],
      autoFixable: []
    };

    // Run all integrity checks
    await Promise.all([
      this.checkReservationConsistency(context, result),
      this.checkRoomAvailability(context, result),
      this.checkPaymentConsistency(context, result),
      this.checkGuestDataIntegrity(context, result),
      this.checkStatusHistoryIntegrity(context, result),
      this.checkBusinessRuleCompliance(context, result),
      this.checkRelatedRecordsIntegrity(context, result)
    ]);

    // Determine overall validity
    result.isValid = !result.issues.some(
      (issue) => issue.severity === "CRITICAL" || issue.severity === "HIGH"
    );

    // Separate auto-fixable issues
    result.autoFixable = result.issues.filter((issue) => issue.autoFixable);

    return result;
  }

  /**
   * Check reservation data consistency
   */
  private async checkReservationConsistency(
    context: StatusTransitionContext,
    result: DataIntegrityResult
  ): Promise<void> {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: context.reservationId },
        include: {
          room: {
            include: {
              roomType: true
            }
          },
          property: true,
          organization: true
        }
      });

      if (!reservation) {
        result.issues.push({
          type: "MISSING_DATA",
          severity: "CRITICAL",
          description: "Reservation record not found",
          affectedFields: ["reservation"],
          autoFixable: false
        });
        return;
      }

      // Check date consistency
      if (reservation.checkIn >= reservation.checkOut) {
        result.issues.push({
          type: "INCONSISTENCY",
          severity: "HIGH",
          description: "Check-in date is not before check-out date",
          affectedFields: ["checkIn", "checkOut"],
          suggestedFix: "Correct the check-in or check-out dates",
          autoFixable: false
        });
      }

      // Check guest count consistency
      if (reservation.adults < 1) {
        result.issues.push({
          type: "INCONSISTENCY",
          severity: "MEDIUM",
          description: "Adult count must be at least 1",
          affectedFields: ["adults"],
          suggestedFix: "Set adults count to 1",
          autoFixable: true
        });
      }

      // Check room capacity
      if (reservation.room) {
        const totalGuests = reservation.adults + (reservation.children || 0);
        // Use roomType maxOccupancy if available, otherwise fall back to room capacity
        const roomCapacity =
          reservation.room.roomType?.maxOccupancy || reservation.room.capacity;

        if (totalGuests > roomCapacity) {
          result.issues.push({
            type: "BUSINESS_RULE_VIOLATION",
            severity: "HIGH",
            description: `Guest count (${totalGuests}) exceeds room capacity (${roomCapacity})`,
            affectedFields: ["adults", "children", "roomId"],
            suggestedFix: "Assign a larger room or reduce guest count",
            autoFixable: false
          });
        }
      }

      // Check property ownership
      if (reservation.propertyId !== context.propertyId) {
        result.issues.push({
          type: "INVALID_REFERENCE",
          severity: "CRITICAL",
          description: "Reservation does not belong to the specified property",
          affectedFields: ["propertyId"],
          autoFixable: false
        });
      }
    } catch (error) {
      result.issues.push({
        type: "MISSING_DATA",
        severity: "CRITICAL",
        description: `Failed to validate reservation data: ${error}`,
        affectedFields: ["reservation"],
        autoFixable: false
      });
    }
  }

  /**
   * Check room availability and conflicts
   */
  private async checkRoomAvailability(
    context: StatusTransitionContext,
    result: DataIntegrityResult
  ): Promise<void> {
    if (context.newStatus !== ReservationStatus.IN_HOUSE) {
      return; // Only check for check-in
    }

    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: context.reservationId },
        select: { roomId: true, checkIn: true, checkOut: true }
      });

      if (!reservation) return;

      // Check for overlapping reservations
      const conflictingReservations = await prisma.reservation.findMany({
        where: {
          roomId: reservation.roomId,
          // Only check active reservations - exclude CANCELLED and NO_SHOW
          status: {
            in: [
              ReservationStatus.IN_HOUSE,
              ReservationStatus.CONFIRMED,
              ReservationStatus.CONFIRMATION_PENDING
            ]
          },
          id: { not: context.reservationId },
          // Exclude soft-deleted reservations
          deletedAt: null,
          OR: [
            {
              checkIn: { lte: reservation.checkOut },
              checkOut: { gte: reservation.checkIn }
            }
          ]
        },
        select: {
          id: true,
          guestName: true,
          checkIn: true,
          checkOut: true,
          status: true
        }
      });

      if (conflictingReservations.length > 0) {
        result.issues.push({
          type: "CONFLICT",
          severity: "HIGH",
          description: `Room has ${conflictingReservations.length} conflicting reservation(s)`,
          affectedFields: ["roomId", "checkIn", "checkOut"],
          suggestedFix: "Resolve room conflicts or assign different room",
          autoFixable: false,
          relatedRecords: conflictingReservations.map((r) => r.id)
        });
      }

      // Check room maintenance status (if room maintenance system exists)
      // This would integrate with a room management system
      result.warnings.push("Room maintenance status should be verified");
    } catch (error) {
      result.issues.push({
        type: "MISSING_DATA",
        severity: "MEDIUM",
        description: `Failed to check room availability: ${error}`,
        affectedFields: ["roomId"],
        autoFixable: false
      });
    }
  }

  /**
   * Check payment data consistency
   */
  private async checkPaymentConsistency(
    context: StatusTransitionContext,
    result: DataIntegrityResult
  ): Promise<void> {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: context.reservationId },
        select: {
          amountCaptured: true,
          depositAmount: true,
          paidAmount: true,
          paymentStatus: true
        }
      });

      if (!reservation) return;

      // Check payment amounts
      if (reservation.amountCaptured && reservation.amountCaptured < 0) {
        result.issues.push({
          type: "INCONSISTENCY",
          severity: "HIGH",
          description: "Captured amount cannot be negative",
          affectedFields: ["amountCaptured"],
          suggestedFix: "Correct the captured amount",
          autoFixable: false
        });
      }

      if (reservation.paidAmount && reservation.paidAmount < 0) {
        result.issues.push({
          type: "INCONSISTENCY",
          severity: "HIGH",
          description: "Paid amount cannot be negative",
          affectedFields: ["paidAmount"],
          suggestedFix: "Correct the paid amount",
          autoFixable: false
        });
      }

      // Check if deposit amount is reasonable compared to captured amount
      if (reservation.depositAmount && reservation.amountCaptured) {
        // Convert amountCaptured from cents to currency units for comparison
        const capturedAmountInCurrency = reservation.amountCaptured / 100;
        if (reservation.depositAmount > capturedAmountInCurrency) {
          result.issues.push({
            type: "INCONSISTENCY",
            severity: "MEDIUM",
            description: "Deposit amount exceeds captured amount",
            affectedFields: ["depositAmount", "amountCaptured"],
            suggestedFix: "Adjust deposit amount to not exceed captured amount",
            autoFixable: true
          });
        }
      }

      // Check payment status consistency
      if (context.newStatus === ReservationStatus.CONFIRMED) {
        if (
          reservation.paymentStatus === "UNPAID" &&
          !reservation.depositAmount
        ) {
          result.warnings.push(
            "Confirming reservation without any payment received"
          );
        }
      }

      if (context.newStatus === ReservationStatus.CHECKED_OUT) {
        if (reservation.paymentStatus !== "PAID") {
          result.warnings.push("Checking out guest with outstanding payment");
        }
      }
    } catch (error) {
      result.issues.push({
        type: "MISSING_DATA",
        severity: "MEDIUM",
        description: `Failed to validate payment data: ${error}`,
        affectedFields: ["payment"],
        autoFixable: false
      });
    }
  }

  /**
   * Check guest data integrity
   */
  private async checkGuestDataIntegrity(
    context: StatusTransitionContext,
    result: DataIntegrityResult
  ): Promise<void> {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: context.reservationId },
        select: {
          guestName: true,
          email: true,
          phone: true,
          adults: true,
          children: true
        }
      });

      if (!reservation) return;

      // Check required guest information
      if (!reservation.guestName || reservation.guestName.trim().length < 2) {
        result.issues.push({
          type: "MISSING_DATA",
          severity: "HIGH",
          description: "Guest name is missing or too short",
          affectedFields: ["guestName"],
          suggestedFix: "Provide valid guest name",
          autoFixable: false
        });
      }

      // Check contact information for check-in
      if (context.newStatus === ReservationStatus.IN_HOUSE) {
        if (!reservation.email && !reservation.phone) {
          result.warnings.push("No contact information available for guest");
        }
      }
    } catch (error) {
      result.issues.push({
        type: "MISSING_DATA",
        severity: "LOW",
        description: `Failed to validate guest data: ${error}`,
        affectedFields: ["guest"],
        autoFixable: false
      });
    }
  }

  /**
   * Check status history integrity
   */
  private async checkStatusHistoryIntegrity(
    context: StatusTransitionContext,
    result: DataIntegrityResult
  ): Promise<void> {
    try {
      const statusHistory = await prisma.reservationStatusHistory.findMany({
        where: { reservationId: context.reservationId },
        orderBy: { changedAt: "desc" },
        take: 5
      });

      // Check for duplicate status changes
      const recentSameStatus = statusHistory.filter(
        (h) =>
          h.newStatus === context.newStatus &&
          h.changedAt > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      );

      if (recentSameStatus.length > 0) {
        result.warnings.push("Similar status change was made recently");
      }

      // Check status progression logic
      if (statusHistory.length > 0) {
        const lastStatus = statusHistory[0];
        if (lastStatus.newStatus !== context.currentStatus) {
          result.issues.push({
            type: "INCONSISTENCY",
            severity: "MEDIUM",
            description:
              "Current status does not match last status history entry",
            affectedFields: ["status", "statusHistory"],
            suggestedFix: "Synchronize status with history",
            autoFixable: true
          });
        }
      }
    } catch (error) {
      result.warnings.push(`Failed to validate status history: ${error}`);
    }
  }

  /**
   * Check business rule compliance
   */
  private async checkBusinessRuleCompliance(
    context: StatusTransitionContext,
    result: DataIntegrityResult
  ): Promise<void> {
    // This would integrate with the business rules engine
    // For now, we'll add basic compliance checks

    if (context.newStatus === ReservationStatus.CANCELLED) {
      const now = new Date();
      const checkIn = context.reservation
        ? new Date(context.reservation.checkIn)
        : now;
      const hoursUntilCheckIn =
        (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilCheckIn < 24) {
        result.warnings.push("Cancellation within 24 hours may incur fees");
      }
    }

    if (context.newStatus === ReservationStatus.NO_SHOW) {
      const now = new Date();
      const checkIn = context.reservation
        ? new Date(context.reservation.checkIn)
        : now;
      const hoursAfterCheckIn =
        (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

      // Allow front desk to mark as no-show anytime after check-in time
      // They have direct knowledge of whether guest showed up or not
      if (hoursAfterCheckIn < 0) {
        result.issues.push({
          type: "BUSINESS_RULE_VIOLATION",
          severity: "HIGH",
          description: "No-show cannot be marked before check-in time",
          affectedFields: ["status"],
          suggestedFix: "Wait until after check-in time",
          autoFixable: false
        });
      }
    }
  }

  /**
   * Check related records integrity
   */
  private async checkRelatedRecordsIntegrity(
    context: StatusTransitionContext,
    result: DataIntegrityResult
  ): Promise<void> {
    try {
      // Check if room exists
      const reservation = await prisma.reservation.findUnique({
        where: { id: context.reservationId },
        include: { room: true, property: true }
      });

      if (!reservation) return;

      if (!reservation.room) {
        result.issues.push({
          type: "INVALID_REFERENCE",
          severity: "HIGH",
          description: "Referenced room does not exist",
          affectedFields: ["roomId"],
          suggestedFix: "Assign valid room to reservation",
          autoFixable: false
        });
      }

      if (!reservation.property) {
        result.issues.push({
          type: "INVALID_REFERENCE",
          severity: "CRITICAL",
          description: "Referenced property does not exist",
          affectedFields: ["propertyId"],
          autoFixable: false
        });
      }
    } catch (error) {
      result.warnings.push(`Failed to validate related records: ${error}`);
    }
  }

  /**
   * Auto-fix data integrity issues where possible
   */
  async autoFixIssues(
    reservationId: string,
    issues: DataIntegrityIssue[]
  ): Promise<{ fixed: number; failed: number; errors: string[] }> {
    const result = { fixed: 0, failed: 0, errors: [] as string[] };

    for (const issue of issues.filter((i) => i.autoFixable)) {
      try {
        await this.applyAutoFix(reservationId, issue);
        result.fixed++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to fix ${issue.description}: ${error}`);
      }
    }

    return result;
  }

  /**
   * Apply auto-fix for a specific issue
   */
  private async applyAutoFix(
    reservationId: string,
    issue: DataIntegrityIssue
  ): Promise<void> {
    switch (issue.type) {
      case "INCONSISTENCY":
        if (
          issue.affectedFields.includes("adults") &&
          issue.description.includes("Adult count")
        ) {
          await prisma.reservation.update({
            where: { id: reservationId },
            data: { adults: 1 }
          });
        }
        break;

      case "INCONSISTENCY":
        if (
          issue.affectedFields.includes("depositAmount") &&
          issue.description.includes("exceeds captured")
        ) {
          const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            select: { amountCaptured: true }
          });
          if (reservation?.amountCaptured) {
            // Convert from cents to currency units
            const capturedAmountInCurrency = reservation.amountCaptured / 100;
            await prisma.reservation.update({
              where: { id: reservationId },
              data: { depositAmount: capturedAmountInCurrency }
            });
          }
        }
        break;

      default:
        throw new Error(`No auto-fix available for issue type: ${issue.type}`);
    }
  }
}

// Export singleton instance
export const dataIntegrityService = new DataIntegrityService();
