// File: src/lib/gravatar.ts
import crypto from 'crypto';

/**
 * Generate a gravatar URL from an email address
 * @param email - The email address to generate gravatar for
 * @param size - The size of the avatar (default: 40)
 * @param defaultImage - The default image type if no gravatar exists (default: 'identicon')
 * @returns The gravatar URL
 */
export function getGravatarUrl(
  email: string | null | undefined,
  size: number = 40,
  defaultImage: string = 'identicon'
): string {
  if (!email) {
    // Return a default avatar URL if no email provided
    return `https://www.gravatar.com/avatar/00000000000000000000000000000000?s=${size}&d=${defaultImage}`;
  }

  // Create MD5 hash of the email (trimmed and lowercased)
  const hash = crypto
    .createHash('md5')
    .update(email.trim().toLowerCase())
    .digest('hex');

  // Return the gravatar URL
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
}

/**
 * Get user initials from name for fallback avatar
 * @param name - The user's full name
 * @returns The initials (max 2 characters)
 */
export function getUserInitials(name: string | null | undefined): string {
  if (!name) return '??';
  
  const names = name.trim().split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a consistent background color for initials based on the user's name
 * @param name - The user's name
 * @returns A CSS color value
 */
export function getInitialsBackgroundColor(name: string | null | undefined): string {
  if (!name) return '#6b7280'; // gray-500
  
  // Generate a hash from the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to a color
  const colors = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
  ];
  
  return colors[Math.abs(hash) % colors.length];
}
