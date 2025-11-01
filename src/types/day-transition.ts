/**
 * Day Transition Blocker Types
 * Defines types for preventing calendar day transitions when booking issues exist
 */

/**
 * Types of issues that can block day transitions
 */
export type DayTransitionIssueType =
  | 'PARTIAL_PAYMENT'
  | 'CHECKOUT_DUE_NOT_COMPLETED'
  | 'CHECKOUT_DUE_TODAY';

/**
 * Severity levels for issues
 */
export type IssueSeverity = 'warning' | 'critical';

/**
 * Represents a single booking issue that blocks day transition
 */
export interface DayTransitionIssue {
  /** Unique reservation ID */
  reservationId: string;

  /** Guest name */
  guestName: string;

  /** Room number */
  roomNumber: string;

  /** Type of issue */
  issueType: DayTransitionIssueType;

  /** Human-readable description of the issue */
  description: string;

  /** Severity level (warning or critical) */
  severity: IssueSeverity;

  /** Checkout date of the reservation */
  checkOutDate: string;

  /** Payment status (if applicable) */
  paymentStatus?: string;

  /** Current reservation status */
  reservationStatus?: string;
}

/**
 * Response from day transition validation API
 */
export interface DayTransitionValidationResponse {
  /** Whether day transition can proceed */
  canTransition: boolean;

  /** Array of issues blocking transition (empty if canTransition is true) */
  issues: DayTransitionIssue[];

  /** Timestamp of validation */
  timestamp: string;
}

/**
 * Request parameters for day transition validation
 */
export interface DayTransitionValidationRequest {
  /** Property ID to validate */
  propertyId: string;

  /** Property timezone (e.g., 'America/New_York') */
  timezone: string;
}

/**
 * Issue type descriptions for UI display
 */
export const ISSUE_TYPE_DESCRIPTIONS: Record<DayTransitionIssueType, string> = {
  PARTIAL_PAYMENT: 'Incomplete payment from yesterday\'s checkout',
  CHECKOUT_DUE_NOT_COMPLETED: 'Guest marked for checkout yesterday but never checked out',
  CHECKOUT_DUE_TODAY: 'Guest marked for checkout today but not yet checked out'
};

/**
 * Issue type labels for UI display
 */
export const ISSUE_TYPE_LABELS: Record<DayTransitionIssueType, string> = {
  PARTIAL_PAYMENT: 'Payment Due',
  CHECKOUT_DUE_NOT_COMPLETED: 'Checkout Not Completed',
  CHECKOUT_DUE_TODAY: 'Checkout Due Today'
};

/**
 * Severity level colors for UI display
 */
export const SEVERITY_COLORS: Record<IssueSeverity, { light: string; dark: string }> = {
  warning: {
    light: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    dark: 'dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200'
  },
  critical: {
    light: 'bg-red-50 border-red-200 text-red-900',
    dark: 'dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
  }
};

/**
 * Severity level icons for UI display
 */
export const SEVERITY_ICONS: Record<IssueSeverity, string> = {
  warning: '⚠️',
  critical: '🔴'
};

