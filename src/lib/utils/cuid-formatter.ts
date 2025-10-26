/**
 * Utility functions for formatting CUIDs/UUIDs for display
 */

/**
 * Shorten a CUID/UUID for display purposes
 * @param id - Full CUID/UUID string
 * @param length - Number of characters to show (default: 8)
 * @returns Shortened ID without ellipsis
 * @example
 * shortenId('clz4f9k2x0000qz8h8k9j2m3n') // Returns 'clz4f9k2'
 * shortenId('clz4f9k2x0000qz8h8k9j2m3n', 6) // Returns 'clz4f9'
 */
export function shortenId(id: string, length: number = 8): string {
  if (!id) return "";
  return id.substring(0, Math.min(length, id.length));
}

/**
 * Get a short ID without ellipsis (just the prefix)
 * @param id - Full CUID/UUID string
 * @param length - Number of characters to show (default: 8)
 * @returns Shortened ID without ellipsis
 * @example
 * getShortId('clz4f9k2x0000qz8h8k9j2m3n') // Returns 'clz4f9k2'
 * getShortId('clz4f9k2x0000qz8h8k9j2m3n', 6) // Returns 'clz4f9'
 */
export function getShortId(id: string, length: number = 8): string {
  if (!id) return "";
  return id.substring(0, Math.min(length, id.length));
}

/**
 * Format ID for display with optional tooltip text
 * @param id - Full CUID/UUID string
 * @param length - Number of characters to show (default: 8)
 * @returns Object with short and full ID for tooltip
 * @example
 * const { short, full } = formatIdForDisplay('clz4f9k2x0000qz8h8k9j2m3n')
 * // { short: 'clz4f9k2', full: 'clz4f9k2x0000qz8h8k9j2m3n' }
 */
export function formatIdForDisplay(
  id: string,
  length: number = 8
): { short: string; full: string } {
  return {
    short: shortenId(id, length),
    full: id
  };
}

/**
 * Copy ID to clipboard
 * @param id - Full CUID/UUID string
 * @returns Promise that resolves when copy is complete
 */
export async function copyIdToClipboard(id: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(id);
  } catch (error) {
    console.error("Failed to copy ID to clipboard:", error);
    throw error;
  }
}

/**
 * Format multiple IDs for display (useful for lists)
 * @param ids - Array of CUID/UUID strings
 * @param length - Number of characters to show (default: 8)
 * @returns Array of formatted IDs
 */
export function formatIdsForDisplay(
  ids: string[],
  length: number = 8
): Array<{ short: string; full: string }> {
  return ids.map((id) => formatIdForDisplay(id, length));
}
