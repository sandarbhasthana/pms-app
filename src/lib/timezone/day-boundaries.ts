/**
 * Timezone-aware day boundary utilities for 6 AM operational day start
 * Operational day: 6:00 AM to 5:59:59 AM (next day) in property's local timezone
 */

import { toZonedTime, fromZonedTime, format } from "date-fns-tz";

/**
 * Validate if a timezone string is valid
 * @param timezone - IANA timezone string to validate
 * @throws Error if timezone is invalid
 */
function validateTimezone(timezone: string): void {
  // Try to convert a date with the timezone
  // date-fns-tz returns Invalid Date for invalid timezones
  const testDate = toZonedTime(new Date(), timezone);

  if (isNaN(testDate.getTime())) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}

/**
 * Get the start of operational day (6:00 AM) in property's local timezone
 * Returns UTC timestamp for database queries
 *
 * @param date - The date to get the operational day start for
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns UTC Date object representing 6:00 AM in the property's timezone
 *
 * @example
 * // For Jan 15 in New York (EST = UTC-5)
 * // Returns: Jan 15 11:00 AM UTC (which is 6 AM EST)
 * getOperationalDayStart(new Date("2025-01-15"), "America/New_York")
 */
export function getOperationalDayStart(date: Date, timezone: string): Date {
  try {
    // Validate timezone first
    validateTimezone(timezone);

    // Convert UTC date to property's local timezone
    const zonedDate = toZonedTime(date, timezone);

    // Set time to 6:00 AM in the local timezone
    zonedDate.setHours(6, 0, 0, 0);

    // Convert back to UTC
    const utcDate = fromZonedTime(zonedDate, timezone);

    return utcDate;
  } catch (error) {
    console.error(
      `Error calculating operational day start for timezone ${timezone}:`,
      error
    );
    throw error;
  }
}

/**
 * Get the end of operational day (5:59:59 AM next day) in property's local timezone
 * Returns UTC timestamp for database queries
 *
 * @param date - The date to get the operational day end for
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns UTC Date object representing 5:59:59 AM (next day) in the property's timezone
 *
 * @example
 * // For Jan 15 in New York (EST = UTC-5)
 * // Returns: Jan 16 10:59:59 AM UTC (which is 5:59:59 AM EST on Jan 16)
 * getOperationalDayEnd(new Date("2025-01-15"), "America/New_York")
 */
export function getOperationalDayEnd(date: Date, timezone: string): Date {
  try {
    // Get the start of the next day
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Convert UTC date to property's local timezone
    const zonedDate = toZonedTime(nextDay, timezone);

    // Set time to 5:59:59 AM in the local timezone
    zonedDate.setHours(5, 59, 59, 999);

    // Convert back to UTC
    const utcDate = fromZonedTime(zonedDate, timezone);

    return utcDate;
  } catch (error) {
    console.error(
      `Error calculating operational day end for timezone ${timezone}:`,
      error
    );
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}

/**
 * Get the operational date (YYYY-MM-DD) for a given timestamp in property's timezone
 * Determines which operational day a timestamp belongs to
 *
 * @param timestamp - The timestamp to convert
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Date string in YYYY-MM-DD format representing the operational day
 *
 * @example
 * // For 2025-01-16T10:00:00Z in New York (EST = UTC-5)
 * // 10 AM UTC = 5 AM EST (still within Jan 15 operational day)
 * // Returns: "2025-01-15"
 * getOperationalDate(new Date("2025-01-16T10:00:00Z"), "America/New_York")
 */
export function getOperationalDate(timestamp: Date, timezone: string): string {
  try {
    // Convert UTC timestamp to property's local timezone
    const zonedDate = toZonedTime(timestamp, timezone);

    // If time is before 6 AM, it belongs to the previous operational day
    const hour = zonedDate.getHours();

    if (hour < 6) {
      // Subtract one day
      zonedDate.setDate(zonedDate.getDate() - 1);
    }

    // Format as YYYY-MM-DD
    return format(zonedDate, "yyyy-MM-dd");
  } catch (error) {
    console.error(
      `Error calculating operational date for timezone ${timezone}:`,
      error
    );
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}

/**
 * Calculate number of nights between check-in and check-out using 6 AM boundaries
 *
 * @param checkIn - Check-in timestamp (UTC)
 * @param checkOut - Check-out timestamp (UTC)
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Number of nights (operational days) between check-in and check-out
 *
 * @example
 * // Guest checks in 2 PM EST, checks out 10 AM EST next day
 * // Both within same operational day (6 AM - 5:59 AM)
 * // Returns: 1
 * calculateNightsWithSixAMBoundary(
 *   new Date("2025-01-15T19:00:00Z"),
 *   new Date("2025-01-16T15:00:00Z"),
 *   "America/New_York"
 * )
 */
export function calculateNightsWithSixAMBoundary(
  checkIn: Date,
  checkOut: Date,
  timezone: string
): number {
  try {
    // Get operational dates for check-in and check-out
    const checkInOperationalDate = getOperationalDate(checkIn, timezone);
    const checkOutOperationalDate = getOperationalDate(checkOut, timezone);

    // Parse dates
    const checkInDate = new Date(checkInOperationalDate);
    const checkOutDate = new Date(checkOutOperationalDate);

    // Calculate difference in milliseconds
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();

    // Convert to days
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    // Round up to get number of nights (at least 1)
    return Math.max(1, Math.ceil(diffDays));
  } catch (error) {
    console.error(`Error calculating nights for timezone ${timezone}:`, error);
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}

/**
 * Check if a timestamp falls within a specific operational day
 *
 * @param timestamp - The timestamp to check (UTC)
 * @param operationalDate - The operational date to check against (YYYY-MM-DD)
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns true if timestamp is within the operational day, false otherwise
 *
 * @example
 * // Check if 5 AM EST on Jan 16 is within Jan 15 operational day
 * // (Jan 15 operational day: 6 AM Jan 15 - 5:59 AM Jan 16)
 * // Returns: true
 * isWithinOperationalDay(
 *   new Date("2025-01-16T10:00:00Z"),
 *   "2025-01-15",
 *   "America/New_York"
 * )
 */
export function isWithinOperationalDay(
  timestamp: Date,
  operationalDate: string,
  timezone: string
): boolean {
  try {
    // Get the operational date for this timestamp
    const timestampOperationalDate = getOperationalDate(timestamp, timezone);

    // Compare with the provided operational date
    return timestampOperationalDate === operationalDate;
  } catch (error) {
    console.error(
      `Error checking if timestamp is within operational day for timezone ${timezone}:`,
      error
    );
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}
