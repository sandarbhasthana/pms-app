/**
 * Reservation Status Utility Functions
 *
 * This file contains utility functions for managing reservation statuses,
 * validating transitions, and handling status-related business logic.
 */

import { ReservationStatus } from "@prisma/client";
import {
  ALLOWED_TRANSITIONS,
  STATUS_CONFIG,
  StatusTransitionValidation,
  StatusConfig
} from "@/types/reservation-status";

/**
 * Validates if a status transition is allowed
 */
export function validateStatusTransition(
  currentStatus: ReservationStatus,
  newStatus: ReservationStatus
): StatusTransitionValidation {
  const allowedTransitions = ALLOWED_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    return {
      isValid: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}`
    };
  }

  return { isValid: true };
}

/**
 * Gets the configuration for a specific status
 */
export function getStatusConfig(status: ReservationStatus): StatusConfig {
  return STATUS_CONFIG[status];
}

/**
 * Gets all allowed next statuses for a given current status
 */
export function getAllowedNextStatuses(
  currentStatus: ReservationStatus
): ReservationStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus];
}

/**
 * Checks if a status is a final state (no further transitions allowed)
 */
export function isFinalStatus(status: ReservationStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/**
 * Gets the display label for a status
 */
export function getStatusLabel(status: ReservationStatus): string {
  return STATUS_CONFIG[status].label;
}

/**
 * Gets the display description for a status
 */
export function getStatusDescription(status: ReservationStatus): string {
  return STATUS_CONFIG[status].description;
}

/**
 * Determines if a status change should trigger automatic actions
 */
export function shouldTriggerAutomaticActions(
  previousStatus: ReservationStatus | null,
  newStatus: ReservationStatus
): boolean {
  // Define status changes that should trigger automatic actions
  const automaticTriggers: Array<{
    from: ReservationStatus | null;
    to: ReservationStatus;
  }> = [
    { from: "CONFIRMATION_PENDING", to: "CONFIRMED" },
    { from: "CONFIRMED", to: "IN_HOUSE" },
    { from: "IN_HOUSE", to: "CHECKED_OUT" }
  ];

  return automaticTriggers.some(
    (trigger) => trigger.from === previousStatus && trigger.to === newStatus
  );
}

/**
 * Gets the appropriate status based on payment and date conditions
 */
export function getAutomaticStatus(
  currentStatus: ReservationStatus,
  paymentPercentage: number,
  checkInDate: Date,
  checkOutDate: Date,
  now: Date = new Date()
): ReservationStatus {
  const isAfterCheckIn = now >= checkInDate;
  const isAfterCheckOut = now >= checkOutDate;
  const isFullyPaid = paymentPercentage >= 100;

  // If already checked out, no change needed
  if (currentStatus === "CHECKED_OUT") {
    return currentStatus;
  }

  // Auto check-out if past checkout time
  if (currentStatus === "IN_HOUSE" && isAfterCheckOut) {
    return "CHECKED_OUT";
  }

  // Auto check-in if confirmed and it's check-in time or later with full payment
  if (currentStatus === "CONFIRMED" && isAfterCheckIn && isFullyPaid) {
    return "IN_HOUSE";
  }

  // Auto confirm if pending and payment received
  if (currentStatus === "CONFIRMATION_PENDING" && isFullyPaid) {
    return isAfterCheckIn ? "IN_HOUSE" : "CONFIRMED";
  }

  return currentStatus;
}

/**
 * Formats status for display in different contexts
 */
export function formatStatusForDisplay(
  status: ReservationStatus,
  context: "badge" | "list" | "detail" = "badge"
): string {
  const config = STATUS_CONFIG[status];

  switch (context) {
    case "badge":
      return config.label;
    case "list":
      return `${config.label} - ${config.description}`;
    case "detail":
      return config.description;
    default:
      return config.label;
  }
}

/**
 * Gets CSS classes for status styling
 */
export function getStatusClasses(status: ReservationStatus): {
  badge: string;
  text: string;
  background: string;
} {
  const config = STATUS_CONFIG[status];

  return {
    badge: `${config.bgColor} ${config.textColor}`,
    text: config.textColor,
    background: config.bgColor
  };
}

/**
 * Determines if a user can perform a status transition
 */
export function canUserUpdateStatus(
  userRole: string,
  currentStatus: ReservationStatus,
  newStatus: ReservationStatus
): boolean {
  // Define role-based permissions
  const rolePermissions: Record<
    string,
    {
      canUpdate: boolean;
      restrictedTransitions?: Array<{
        from: ReservationStatus;
        to: ReservationStatus;
      }>;
    }
  > = {
    FRONT_DESK: {
      canUpdate: true,
      restrictedTransitions: []
    },
    PROPERTY_MGR: {
      canUpdate: true,
      restrictedTransitions: []
    },
    HOUSEKEEPING: {
      canUpdate: true,
      restrictedTransitions: [
        { from: "CONFIRMED", to: "CANCELLED" },
        { from: "IN_HOUSE", to: "CANCELLED" }
      ]
    }
  };

  const permissions = rolePermissions[userRole];
  if (!permissions || !permissions.canUpdate) {
    return false;
  }

  // Check if transition is restricted for this role
  if (permissions.restrictedTransitions) {
    const isRestricted = permissions.restrictedTransitions.some(
      (restriction) =>
        restriction.from === currentStatus && restriction.to === newStatus
    );
    if (isRestricted) {
      return false;
    }
  }

  // Check if transition is generally allowed
  return validateStatusTransition(currentStatus, newStatus).isValid;
}

/**
 * Gets status priority for sorting (lower number = higher priority)
 */
export function getStatusPriority(status: ReservationStatus): number {
  const priorities: Record<ReservationStatus, number> = {
    CONFIRMATION_PENDING: 1,
    CONFIRMED: 2,
    IN_HOUSE: 3,
    CHECKED_OUT: 4,
    NO_SHOW: 5,
    CANCELLED: 6,
    CHECKIN_DUE: 0,
    CHECKOUT_DUE: 0
  };

  return priorities[status] || 999;
}

/**
 * Sorts reservations by status priority
 */
export function sortByStatusPriority<T extends { status: ReservationStatus }>(
  reservations: T[]
): T[] {
  return [...reservations].sort(
    (a, b) => getStatusPriority(a.status) - getStatusPriority(b.status)
  );
}
