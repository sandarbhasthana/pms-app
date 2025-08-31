// lib/utils/nameFormatter.ts

/**
 * @param fullName - The full guest name to format
 * @returns Formatted name suitable for calendar display
 */
export const formatGuestNameForCalendar = (fullName: string): string => {
  if (!fullName || fullName.trim() === '') return '';
  
  const nameParts = fullName.trim().split(/\s+/);
  
  if (nameParts.length === 1) {
    // Single name - truncate if too long
    return nameParts[0].length > 10 
      ? nameParts[0].substring(0, 7) + '...' 
      : nameParts[0];
  }
  
  // Multiple names - use first initial + last name format
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  const formattedName = `${firstName.charAt(0)}. ${lastName}`;
  
  // If still too long, truncate the last name
  if (formattedName.length > 12) {
    const maxLastNameLength = 12 - 3; // Account for "X. " and "..."
    const truncatedLastName = lastName.substring(0, maxLastNameLength) + '...';
    return `${firstName.charAt(0)}. ${truncatedLastName}`;
  }
  
  return formattedName;
};
