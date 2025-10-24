// In-memory cache for reservations
export const reservationsCache = new Map<
  string,
  { data: unknown; timestamp: number }
>();

export const RESERVATIONS_CACHE_DURATION = 5000; // 5 seconds

/**
 * Helper function to clear cache for a specific property
 */
export function clearReservationsCacheForProperty(propertyId: string) {
  console.log(`🔍 Clearing cache for property: ${propertyId}`);
  console.log(`📊 Current cache size: ${reservationsCache.size}`);

  const keysToDelete: string[] = [];
  for (const key of reservationsCache.keys()) {
    console.log(`  Checking key: ${key}`);
    if (key.includes(`reservations-${propertyId}-`)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => {
    reservationsCache.delete(key);
    console.log(`🗑️ Cleared cache key: ${key}`);
  });

  if (keysToDelete.length > 0) {
    console.log(
      `✅ Cleared ${keysToDelete.length} cache entries for property ${propertyId}`
    );
  } else {
    console.log(`⚠️ No cache entries found for property ${propertyId}`);
  }

  console.log(`📊 Cache size after clearing: ${reservationsCache.size}`);
}

