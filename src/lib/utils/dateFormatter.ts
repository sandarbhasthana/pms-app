/**
 * Date Formatting Utilities with Locale Support
 * 
 * This module provides consistent date formatting across the application
 * using the user's locale (derived from their location/browser settings).
 */

/**
 * Get the user's locale from localStorage (cached location) or browser settings
 */
export function getUserLocale(): string {
  // Try to get locale from cached location data
  try {
    const cachedLocation = localStorage.getItem("user_location");
    if (cachedLocation) {
      const locationData = JSON.parse(cachedLocation);
      const countryCode = locationData.countryCode;
      
      // Map country codes to common locales
      const localeMap: Record<string, string> = {
        US: "en-US",
        GB: "en-GB",
        IN: "en-IN",
        CA: "en-CA",
        AU: "en-AU",
        DE: "de-DE",
        FR: "fr-FR",
        ES: "es-ES",
        IT: "it-IT",
        JP: "ja-JP",
        CN: "zh-CN",
        BR: "pt-BR",
        MX: "es-MX",
        // Add more mappings as needed
      };
      
      if (countryCode && localeMap[countryCode]) {
        return localeMap[countryCode];
      }
    }
  } catch {
    // Fall through to browser locale
  }
  
  // Fallback to browser's locale
  return navigator.language || "en-US";
}

/**
 * Format a date for display using the user's locale
 * 
 * @param date - Date string, Date object, or null/undefined
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string or empty string if invalid
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "";
    
    const locale = getUserLocale();
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...options
    };
    
    return dateObj.toLocaleDateString(locale, defaultOptions);
  } catch {
    return "";
  }
}

/**
 * Format a date with time using the user's locale
 * 
 * @param date - Date string, Date object, or null/undefined
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date and time string or empty string if invalid
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "";
    
    const locale = getUserLocale();
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...options
    };
    
    return dateObj.toLocaleDateString(locale, defaultOptions);
  } catch {
    return "";
  }
}

/**
 * Format a date range using the user's locale
 * 
 * @param startDate - Start date string or Date object
 * @param endDate - End date string or Date object
 * @returns Formatted date range string (e.g., "Jan 15 - Jan 20, 2024")
 */
export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string {
  if (!startDate || !endDate) return "";
  
  try {
    const start = typeof startDate === "string" ? new Date(startDate) : startDate;
    const end = typeof endDate === "string" ? new Date(endDate) : endDate;
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";
    
    const locale = getUserLocale();
    
    // If same year, don't repeat it
    const sameYear = start.getFullYear() === end.getFullYear();
    
    const startFormatted = start.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: sameYear ? undefined : "numeric"
    });
    
    const endFormatted = end.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    
    return `${startFormatted} - ${endFormatted}`;
  } catch {
    return "";
  }
}

/**
 * Format a date with weekday using the user's locale
 * 
 * @param date - Date string, Date object, or null/undefined
 * @returns Formatted date with weekday (e.g., "Mon, Jan 15, 2024")
 */
export function formatDateWithWeekday(
  date: string | Date | null | undefined
): string {
  return formatDate(date, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/**
 * Format a date for input fields (always YYYY-MM-DD format)
 * This is required for HTML date inputs
 * 
 * @param date - Date string, Date object, or null/undefined
 * @returns Date in YYYY-MM-DD format or empty string
 */
export function formatDateForInput(
  date: string | Date | null | undefined
): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "";
    
    // Always return ISO format for input fields
    return dateObj.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 * 
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(
  date: string | Date | null | undefined
): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "";
    
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
    } else {
      // For older dates, show the actual date
      return formatDateTime(dateObj);
    }
  } catch {
    return "";
  }
}

/**
 * Format a date for short display (e.g., "Jan 15")
 * 
 * @param date - Date string, Date object, or null/undefined
 * @returns Short formatted date string
 */
export function formatDateShort(
  date: string | Date | null | undefined
): string {
  return formatDate(date, {
    month: "short",
    day: "numeric"
  });
}

/**
 * Format a date for calendar headers (e.g., "Mon 15")
 * 
 * @param date - Date string, Date object, or null/undefined
 * @returns Calendar header formatted date string
 */
export function formatDateForCalendar(
  date: string | Date | null | undefined
): string {
  return formatDate(date, {
    weekday: "short",
    day: "numeric"
  });
}

