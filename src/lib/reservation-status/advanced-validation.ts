// File: src/lib/reservation-status/advanced-validation.ts

import { ReservationStatus, PropertyRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRolePermission } from "@/lib/property-context";
import { ALLOWED_TRANSITIONS } from "@/types/reservation-status";

// Enhanced validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresApproval: boolean;
  approvalReason?: string;
  businessRuleViolations: string[];
  dataIntegrityIssues: string[];
}

// Status transition context
export interface StatusTransitionContext {
  reservationId: string;
  currentStatus: ReservationStatus;
  newStatus: ReservationStatus;
  reason: string;
  userId: string;
  userRole: PropertyRole;
  propertyId: string;
  organizationId: string;
  isAutomatic?: boolean;
  reservation?: {
    guestName: string;
    checkIn: Date;
    checkOut: Date;
    paymentStatus: string;
    amountCaptured?: number;
    paidAmount?: number;
    depositAmount?: number;
    totalAmount?: number;
    roomId: string;
    adults: number;
    children: number;
    createdAt: Date;
  };
}

// Business rule definitions for status transitions
const STATUS_BUSINESS_RULES = {
  // Check-in rules
  IN_HOUSE: {
    timeConstraints: {
      earliestCheckIn: -1, // 1 day before check-in date
      latestCheckIn: 1, // 1 day after check-in date
      warningThreshold: 0 // Same day warning
    },
    paymentRequirements: {
      minimumPayment: 0.5, // 50% of total amount
      allowedStatuses: ["PAID", "PARTIALLY_PAID"]
    },
    roomRequirements: {
      mustBeClean: true,
      mustBeAvailable: true
    }
  },

  // Check-out rules
  CHECKED_OUT: {
    timeConstraints: {
      earliestCheckOut: -1, // 1 day before check-out date
      latestCheckOut: 7, // 7 days after check-out date (late checkout)
      warningThreshold: 0 // Same day warning
    },
    paymentRequirements: {
      minimumPayment: 1.0, // 100% payment required
      allowedStatuses: ["PAID"]
    },
    additionalChecks: {
      requiresRoomInspection: true,
      requiresIncidentalCharges: true
    }
  },

  // Confirmation rules
  CONFIRMED: {
    paymentRequirements: {
      minimumPayment: 0.2, // 20% deposit minimum
      allowedStatuses: ["PAID", "PARTIALLY_PAID"]
    },
    timeConstraints: {
      bookingWindow: 365, // Can confirm up to 365 days in advance
      minimumAdvance: 0 // Can confirm same-day bookings
    }
  },

  // No-show rules
  NO_SHOW: {
    timeConstraints: {
      minimumHoursAfterCheckIn: 6, // Must be at least 6 hours after check-in time
      maximumDaysAfterCheckIn: 3 // Cannot mark no-show more than 3 days after
    },
    paymentHandling: {
      retainDeposit: true,
      refundPercentage: 0 // No refund for no-shows
    }
  },

  // Cancellation rules
  CANCELLED: {
    timeConstraints: {
      freeCancel: 24, // Free cancellation 24 hours before check-in
      partialRefund: 12, // Partial refund 12 hours before check-in
      noRefund: 0 // No refund after check-in time
    },
    refundRules: {
      freeCancelRefund: 1.0, // 100% refund
      partialRefundPercentage: 0.5, // 50% refund
      noRefundPercentage: 0 // 0% refund
    }
  }
};

// Role-based permissions for status transitions
const ROLE_PERMISSIONS = {
  [PropertyRole.PROPERTY_MGR]: {
    canOverrideBusinessRules: true,
    canApproveTransitions: true,
    restrictedTransitions: []
  },
  [PropertyRole.FRONT_DESK]: {
    canOverrideBusinessRules: false,
    canApproveTransitions: false,
    restrictedTransitions: [
      { from: ReservationStatus.IN_HOUSE, to: ReservationStatus.CANCELLED },
      { from: ReservationStatus.CONFIRMED, to: ReservationStatus.CANCELLED }
    ]
  },
  [PropertyRole.HOUSEKEEPING]: {
    canOverrideBusinessRules: false,
    canApproveTransitions: false,
    restrictedTransitions: [
      {
        from: ReservationStatus.CONFIRMATION_PENDING,
        to: ReservationStatus.CONFIRMED
      },
      { from: ReservationStatus.CONFIRMED, to: ReservationStatus.CANCELLED },
      { from: ReservationStatus.IN_HOUSE, to: ReservationStatus.CANCELLED }
    ]
  },
  [PropertyRole.MAINTENANCE]: {
    canOverrideBusinessRules: false,
    canApproveTransitions: false,
    restrictedTransitions: [
      {
        from: ReservationStatus.CONFIRMATION_PENDING,
        to: ReservationStatus.CONFIRMED
      },
      { from: ReservationStatus.CONFIRMED, to: ReservationStatus.CANCELLED },
      { from: ReservationStatus.IN_HOUSE, to: ReservationStatus.CANCELLED },
      { from: ReservationStatus.IN_HOUSE, to: ReservationStatus.CHECKED_OUT }
    ]
  },
  [PropertyRole.SECURITY]: {
    canOverrideBusinessRules: false,
    canApproveTransitions: false,
    restrictedTransitions: [
      {
        from: ReservationStatus.CONFIRMATION_PENDING,
        to: ReservationStatus.CONFIRMED
      },
      { from: ReservationStatus.CONFIRMED, to: ReservationStatus.CANCELLED },
      { from: ReservationStatus.IN_HOUSE, to: ReservationStatus.CANCELLED },
      { from: ReservationStatus.IN_HOUSE, to: ReservationStatus.CHECKED_OUT }
    ]
  },
  [PropertyRole.GUEST_SERVICES]: {
    canOverrideBusinessRules: false,
    canApproveTransitions: false,
    restrictedTransitions: [
      { from: ReservationStatus.IN_HOUSE, to: ReservationStatus.CANCELLED }
    ]
  },
  [PropertyRole.ACCOUNTANT]: {
    canOverrideBusinessRules: false,
    canApproveTransitions: false,
    restrictedTransitions: [
      { from: ReservationStatus.IN_HOUSE, to: ReservationStatus.CHECKED_OUT }
    ]
  },
  [PropertyRole.IT_SUPPORT]: {
    canOverrideBusinessRules: false,
    canApproveTransitions: false,
    restrictedTransitions: [
      {
        from: ReservationStatus.CONFIRMATION_PENDING,
        to: ReservationStatus.CONFIRMED
      },
      { from: ReservationStatus.CONFIRMED, to: ReservationStatus.CANCELLED },
      { from: ReservationStatus.IN_HOUSE, to: ReservationStatus.CANCELLED },
      { from: ReservationStatus.IN_HOUSE, to: ReservationStatus.CHECKED_OUT }
    ]
  }
};

/**
 * Advanced Status Transition Validator
 */
export class StatusTransitionValidator {
  /**
   * Comprehensive validation of status transition
   */
  async validateTransition(
    context: StatusTransitionContext
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresApproval: false,
      businessRuleViolations: [],
      dataIntegrityIssues: []
    };

    // 1. Basic transition validation
    await this.validateBasicTransition(context, result);

    // 2. Role-based permission validation
    await this.validateRolePermissions(context, result);

    // 3. Business rule validation
    await this.validateBusinessRules(context, result);

    // 4. Data integrity validation
    await this.validateDataIntegrity(context, result);

    // 5. Time-based validation
    await this.validateTimeConstraints(context, result);

    // 6. Payment validation
    await this.validatePaymentRequirements(context, result);

    // 7. Room and resource validation
    await this.validateRoomRequirements(context, result);

    // Determine if approval is required
    this.determineApprovalRequirement(context, result);

    // Final validation result
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate basic transition rules
   */
  private async validateBasicTransition(
    context: StatusTransitionContext,
    result: ValidationResult
  ): Promise<void> {
    const allowedTransitions = ALLOWED_TRANSITIONS[context.currentStatus] || [];

    if (!allowedTransitions.includes(context.newStatus)) {
      result.errors.push(
        `Invalid transition from ${context.currentStatus} to ${context.newStatus}`
      );
    }

    // Check for same status
    if (context.currentStatus === context.newStatus) {
      result.errors.push("Cannot transition to the same status");
    }
  }

  /**
   * Validate role-based permissions
   */
  private async validateRolePermissions(
    context: StatusTransitionContext,
    result: ValidationResult
  ): Promise<void> {
    const rolePermissions = ROLE_PERMISSIONS[context.userRole];

    if (!rolePermissions) {
      result.errors.push(`Unknown role: ${context.userRole}`);
      return;
    }

    // Check for restricted transitions
    const isRestricted = rolePermissions.restrictedTransitions.some(
      (restriction) =>
        restriction.from === context.currentStatus &&
        restriction.to === context.newStatus
    );

    if (isRestricted) {
      result.requiresApproval = true;
      result.approvalReason = `Role ${context.userRole} requires approval for this transition`;
    }

    // Check minimum role requirements for specific transitions
    const criticalTransitions = [
      { from: ReservationStatus.CONFIRMED, to: ReservationStatus.CANCELLED },
      { from: ReservationStatus.IN_HOUSE, to: ReservationStatus.CANCELLED }
    ];

    const isCritical = criticalTransitions.some(
      (transition) =>
        transition.from === context.currentStatus &&
        transition.to === context.newStatus
    );

    if (
      isCritical &&
      !hasRolePermission(context.userRole, PropertyRole.PROPERTY_MGR)
    ) {
      result.requiresApproval = true;
      result.approvalReason =
        "Critical status change requires manager approval";
    }
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    context: StatusTransitionContext,
    result: ValidationResult
  ): Promise<void> {
    const rules =
      STATUS_BUSINESS_RULES[
        context.newStatus as keyof typeof STATUS_BUSINESS_RULES
      ];
    if (!rules || !context.reservation) return;

    const reservation = context.reservation;
    const now = new Date();

    // Payment requirements validation
    if ("paymentRequirements" in rules && rules.paymentRequirements) {
      const { minimumPayment, allowedStatuses } = rules.paymentRequirements;

      if (!allowedStatuses.includes(reservation.paymentStatus)) {
        result.businessRuleViolations.push(
          `Payment status must be one of: ${allowedStatuses.join(", ")}`
        );
      }

      // Check minimum payment amount
      const paidAmount = this.calculatePaidAmount(reservation);
      const totalAmount =
        reservation.totalAmount || this.calculateEstimatedTotal(reservation);
      const requiredAmount = totalAmount * minimumPayment;

      if (paidAmount < requiredAmount) {
        result.businessRuleViolations.push(
          `Minimum payment of ${
            minimumPayment * 100
          }% (₹${requiredAmount.toFixed(2)}) required`
        );
      }
    }

    // Time constraints validation
    if ("timeConstraints" in rules && rules.timeConstraints) {
      const checkInDate = new Date(reservation.checkIn);
      const checkOutDate = new Date(reservation.checkOut);

      if (context.newStatus === ReservationStatus.IN_HOUSE) {
        // Type guard to check if timeConstraints has check-in properties
        if (
          "earliestCheckIn" in rules.timeConstraints &&
          "latestCheckIn" in rules.timeConstraints
        ) {
          const daysDiff = Math.ceil(
            (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff < rules.timeConstraints.earliestCheckIn) {
            result.businessRuleViolations.push(
              `Cannot check in more than ${Math.abs(
                rules.timeConstraints.earliestCheckIn
              )} day(s) early`
            );
          }

          if (daysDiff > rules.timeConstraints.latestCheckIn) {
            result.businessRuleViolations.push(
              `Cannot check in more than ${rules.timeConstraints.latestCheckIn} day(s) late`
            );
          }
        }
      }

      if (context.newStatus === ReservationStatus.CHECKED_OUT) {
        // Type guard to check if timeConstraints has check-out properties
        if (
          "earliestCheckOut" in rules.timeConstraints &&
          "latestCheckOut" in rules.timeConstraints
        ) {
          const daysDiff = Math.ceil(
            (now.getTime() - checkOutDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff < rules.timeConstraints.earliestCheckOut) {
            result.businessRuleViolations.push(
              `Cannot check out more than ${Math.abs(
                rules.timeConstraints.earliestCheckOut
              )} day(s) early`
            );
          }

          if (daysDiff > rules.timeConstraints.latestCheckOut) {
            result.businessRuleViolations.push(
              `Cannot check out more than ${rules.timeConstraints.latestCheckOut} day(s) late`
            );
          }
        }
      }

      if (context.newStatus === ReservationStatus.NO_SHOW) {
        // Type guard to check if timeConstraints has no-show properties
        if (
          "minimumHoursAfterCheckIn" in rules.timeConstraints &&
          "maximumDaysAfterCheckIn" in rules.timeConstraints
        ) {
          const hoursAfterCheckIn =
            (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
          const daysAfterCheckIn = hoursAfterCheckIn / 24;

          if (
            hoursAfterCheckIn < rules.timeConstraints.minimumHoursAfterCheckIn
          ) {
            result.businessRuleViolations.push(
              `Cannot mark as no-show until ${rules.timeConstraints.minimumHoursAfterCheckIn} hours after check-in time`
            );
          }

          if (
            daysAfterCheckIn > rules.timeConstraints.maximumDaysAfterCheckIn
          ) {
            result.businessRuleViolations.push(
              `Cannot mark as no-show more than ${rules.timeConstraints.maximumDaysAfterCheckIn} days after check-in`
            );
          }
        }
      }
    }
  }

  /**
   * Validate data integrity
   */
  private async validateDataIntegrity(
    context: StatusTransitionContext,
    result: ValidationResult
  ): Promise<void> {
    try {
      // Check if reservation exists and is accessible
      const reservation = await prisma.reservation.findFirst({
        where: {
          id: context.reservationId,
          propertyId: context.propertyId
        },
        include: {
          room: true,
          property: true
        }
      });

      if (!reservation) {
        result.dataIntegrityIssues.push(
          "Reservation not found or access denied"
        );
        return;
      }

      // Check for conflicting reservations
      if (context.newStatus === ReservationStatus.IN_HOUSE) {
        const conflictingReservations = await prisma.reservation.findMany({
          where: {
            roomId: reservation.roomId,
            status: ReservationStatus.IN_HOUSE,
            id: { not: context.reservationId },
            OR: [
              {
                checkIn: { lte: reservation.checkOut },
                checkOut: { gte: reservation.checkIn }
              }
            ]
          }
        });

        if (conflictingReservations.length > 0) {
          result.dataIntegrityIssues.push(
            "Room has conflicting in-house reservations"
          );
        }
      }

      // Check room availability and status
      if (
        context.newStatus === ReservationStatus.IN_HOUSE &&
        reservation.room
      ) {
        // This would integrate with a room status system if available
        result.warnings.push("Room status should be verified before check-in");
      }
    } catch {
      result.dataIntegrityIssues.push("Database validation failed");
    }
  }

  /**
   * Validate time constraints
   */
  private async validateTimeConstraints(
    context: StatusTransitionContext,
    result: ValidationResult
  ): Promise<void> {
    if (!context.reservation) return;

    const now = new Date();
    const checkIn = new Date(context.reservation.checkIn);

    // No-show specific validations
    if (context.newStatus === ReservationStatus.NO_SHOW) {
      const hoursAfterCheckIn =
        (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

      if (hoursAfterCheckIn < 6) {
        result.errors.push(
          "Cannot mark as no-show until 6 hours after check-in time"
        );
      }

      if (hoursAfterCheckIn > 72) {
        // 3 days
        result.warnings.push(
          "No-show marking is very late - consider cancellation instead"
        );
      }
    }

    // Early/late check-in warnings
    if (context.newStatus === ReservationStatus.IN_HOUSE) {
      const daysDiff = Math.ceil(
        (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff < 0) {
        result.warnings.push(
          `Early check-in: ${Math.abs(daysDiff)} day(s) before scheduled date`
        );
      }

      if (daysDiff > 0) {
        result.warnings.push(
          `Late check-in: ${daysDiff} day(s) after scheduled date`
        );
      }
    }
  }

  /**
   * Validate payment requirements
   */
  private async validatePaymentRequirements(
    context: StatusTransitionContext,
    result: ValidationResult
  ): Promise<void> {
    // This would integrate with the payment system
    // For now, we'll add basic validation

    if (
      context.newStatus === ReservationStatus.CONFIRMED &&
      context.reservation
    ) {
      if (context.reservation.paymentStatus === "UNPAID") {
        result.warnings.push(
          "Confirming reservation without payment - ensure payment is processed"
        );
      }
    }
  }

  /**
   * Validate room and resource requirements
   */
  private async validateRoomRequirements(
    context: StatusTransitionContext,
    result: ValidationResult
  ): Promise<void> {
    // This would integrate with housekeeping and room management systems
    // For now, we'll add placeholder validations

    if (context.newStatus === ReservationStatus.IN_HOUSE) {
      result.warnings.push("Verify room is clean and ready for guest arrival");
    }

    if (context.newStatus === ReservationStatus.CHECKED_OUT) {
      result.warnings.push("Schedule room inspection and cleaning");
    }
  }

  /**
   * Determine if approval is required
   */
  private determineApprovalRequirement(
    context: StatusTransitionContext,
    result: ValidationResult
  ): void {
    // Already set by role validation, but we can add more conditions

    if (result.businessRuleViolations.length > 0) {
      const rolePermissions = ROLE_PERMISSIONS[context.userRole];
      if (!rolePermissions?.canOverrideBusinessRules) {
        result.requiresApproval = true;
        result.approvalReason =
          "Business rule violations require manager approval";
      }
    }

    if (result.dataIntegrityIssues.length > 0) {
      result.requiresApproval = true;
      result.approvalReason = "Data integrity issues require manager review";
    }
  }

  /**
   * Calculate paid amount from reservation
   */
  private calculatePaidAmount(
    reservation: StatusTransitionContext["reservation"]
  ): number {
    if (!reservation) return 0;

    // Use explicit paid amount if available
    if (reservation.paidAmount !== undefined) {
      return reservation.paidAmount;
    }

    // This would integrate with the payment system
    // For now, return estimated amount based on payment status
    const totalAmount =
      reservation.totalAmount || this.calculateEstimatedTotal(reservation);

    switch (reservation.paymentStatus) {
      case "PAID":
        return totalAmount;
      case "PARTIALLY_PAID":
        return reservation.depositAmount || totalAmount * 0.5;
      case "UNPAID":
      default:
        return 0;
    }
  }

  /**
   * Calculate estimated total amount for a reservation
   */
  private calculateEstimatedTotal(
    reservation: StatusTransitionContext["reservation"],
    checkInDate?: Date,
    checkOutDate?: Date
  ): number {
    if (!reservation) return 0;

    // Use provided dates or create new ones
    const checkIn = checkInDate || new Date(reservation.checkIn);
    const checkOut = checkOutDate || new Date(reservation.checkOut);
    const nights = Math.max(
      1,
      Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    // Use a default rate per night (this would ideally come from room pricing)
    const defaultRatePerNight = 2500; // Fallback rate in INR

    return defaultRatePerNight * nights;
  }
}

// Export singleton instance
export const statusTransitionValidator = new StatusTransitionValidator();
