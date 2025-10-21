/**
 * Reservation Status System Types
 *
 * This file contains all TypeScript types, enums, and interfaces
 * related to the reservation status management system.
 */

// Import and re-export the Prisma enum for consistency
import { ReservationStatus } from "@prisma/client";
export { ReservationStatus };

/**
 * Status update payload for API calls
 */
export interface StatusUpdatePayload {
  reservationId: string;
  newStatus: ReservationStatus;
  reason?: string;
  updatedBy?: string;
  isAutomatic?: boolean;
}

/**
 * Status history entry
 */
export interface StatusHistoryEntry {
  id: string;
  reservationId: string;
  previousStatus: ReservationStatus | null;
  newStatus: ReservationStatus;
  changedBy: string | null;
  changeReason: string | null;
  changedAt: Date;
  isAutomatic: boolean;
}

/**
 * Status configuration for UI display
 */
export interface StatusConfig {
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
  label: string;
  description: string;
}

/**
 * Complete status configuration mapping
 * Color scheme:
 * - Confirmed: Teal (#14b8a6)
 * - Confirmation Pending: Pink (#ec4899)
 * - In-House: Green (#22c55e)
 * - Cancelled: Gray (#6b7280)
 * - Checked Out: Purple (#8b5cf6)
 * - No-Show: Orange (#f97316)
 */
export const STATUS_CONFIG: Record<ReservationStatus, StatusConfig> = {
  CONFIRMATION_PENDING: {
    color: "#ec4899",
    bgColor: "bg-pink-100 dark:bg-pink-900/20",
    textColor: "text-pink-800 dark:text-pink-200",
    icon: "clock",
    label: "Confirmation Pending",
    description: "Awaiting confirmation"
  },
  CONFIRMED: {
    color: "#14b8a6",
    bgColor: "bg-teal-100 dark:bg-teal-900/20",
    textColor: "text-teal-800 dark:text-teal-200",
    icon: "check-circle",
    label: "Confirmed",
    description: "Payment received"
  },
  IN_HOUSE: {
    color: "#22c55e",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    textColor: "text-green-800 dark:text-green-200",
    icon: "home",
    label: "In-House",
    description: "Guest checked in"
  },
  CHECKED_OUT: {
    color: "#8b5cf6",
    bgColor: "bg-purple-100 dark:bg-purple-900/20",
    textColor: "text-purple-800 dark:text-purple-200",
    icon: "logout",
    label: "Checked Out",
    description: "Stay completed"
  },
  NO_SHOW: {
    color: "#f97316",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    textColor: "text-orange-800 dark:text-orange-200",
    icon: "x-circle",
    label: "No-Show",
    description: "Guest did not arrive"
  },
  CANCELLED: {
    color: "#6b7280",
    bgColor: "bg-gray-100 dark:bg-gray-900/20",
    textColor: "text-gray-800 dark:text-gray-200",
    icon: "ban",
    label: "Cancelled",
    description: "Reservation cancelled"
  }
};

/**
 * Allowed status transitions
 */
export const ALLOWED_TRANSITIONS: Record<
  ReservationStatus,
  ReservationStatus[]
> = {
  CONFIRMATION_PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_HOUSE", "NO_SHOW", "CANCELLED"],
  IN_HOUSE: ["CHECKED_OUT"],
  CHECKED_OUT: [], // Final state
  NO_SHOW: ["CONFIRMED"], // Recovery option
  CANCELLED: ["CONFIRMED"] // Reactivation option
};

/**
 * Status transition validation
 */
export interface StatusTransitionValidation {
  isValid: boolean;
  reason?: string;
}

/**
 * Bulk status update payload
 */
export interface BulkStatusUpdatePayload {
  reservationIds: string[];
  newStatus: ReservationStatus;
  reason?: string;
  updatedBy?: string;
}

/**
 * Status summary for dashboard
 */
export type StatusSummary = {
  [key in ReservationStatus]: number;
};

/**
 * Status filter options
 */
export interface StatusFilterOptions {
  statuses: ReservationStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  propertyId?: string;
}

/**
 * Automatic status rule configuration
 */
export interface AutoStatusRule {
  id: string;
  name: string;
  description: string;
  trigger:
    | "payment_received"
    | "check_in_time"
    | "check_out_time"
    | "no_show_timeout";
  condition: {
    paymentThreshold?: number; // Percentage of total amount
    timeOffset?: number; // Hours before/after check-in/out time
  };
  action: {
    newStatus: ReservationStatus;
    reason: string;
  };
  isActive: boolean;
}

/**
 * Status change notification
 */
export interface StatusChangeNotification {
  reservationId: string;
  guestName: string;
  previousStatus: ReservationStatus | null;
  newStatus: ReservationStatus;
  reason?: string;
  timestamp: Date;
  isAutomatic: boolean;
}

/**
 * Extended reservation interface with status fields
 */
export interface ReservationWithStatus {
  id: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  status: ReservationStatus;
  checkedInAt?: Date | null;
  checkedOutAt?: Date | null;
  statusUpdatedBy?: string | null;
  statusUpdatedAt: Date;
  statusChangeReason?: string | null;
  statusHistory?: StatusHistoryEntry[];
}

/**
 * Status management permissions
 */
export interface StatusPermissions {
  canUpdate: boolean;
  canBulkUpdate: boolean;
  canViewHistory: boolean;
  canOverride: boolean;
  restrictedTransitions: ReservationStatus[];
}

/**
 * Status analytics data
 */
export interface StatusAnalytics {
  totalReservations: number;
  statusDistribution: StatusSummary;
  conversionRates: {
    pendingToConfirmed: number;
    confirmedToInHouse: number;
    inHouseToCheckedOut: number;
  };
  averageTimeInStatus: Record<ReservationStatus, number>; // in hours
  noShowRate: number;
  cancellationRate: number;
}
