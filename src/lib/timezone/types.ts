/**
 * Type definitions for timezone utilities
 */

/**
 * Operational day boundary information
 */
export interface OperationalDayBoundary {
  /** Start of operational day (6:00 AM) in UTC */
  start: Date;
  
  /** End of operational day (5:59:59 AM next day) in UTC */
  end: Date;
  
  /** Operational date in YYYY-MM-DD format */
  date: string;
  
  /** Property timezone (IANA format) */
  timezone: string;
}

/**
 * Reservation date information with operational day context
 */
export interface ReservationDateInfo {
  /** Check-in timestamp (UTC) */
  checkIn: Date;
  
  /** Check-out timestamp (UTC) */
  checkOut: Date;
  
  /** Operational date of check-in (YYYY-MM-DD) */
  checkInOperationalDate: string;
  
  /** Operational date of check-out (YYYY-MM-DD) */
  checkOutOperationalDate: string;
  
  /** Number of nights (operational days) */
  nights: number;
  
  /** Property timezone (IANA format) */
  timezone: string;
}

/**
 * Conflict detection result
 */
export interface ConflictCheckResult {
  /** Whether a conflict exists */
  hasConflict: boolean;
  
  /** Conflicting reservation IDs (if any) */
  conflictingReservationIds: string[];
  
  /** Operational day boundaries used for check */
  operationalDayStart: Date;
  operationalDayEnd: Date;
}

/**
 * Timezone validation result
 */
export interface TimezoneValidationResult {
  /** Whether the timezone is valid */
  isValid: boolean;
  
  /** Error message (if invalid) */
  error?: string;
  
  /** Timezone offset from UTC (in minutes) */
  offset?: number;
}

