// File: src/lib/hooks/useDashboardData.ts
import useSWR from "swr";

/**
 * Fetcher function for SWR
 */
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("Failed to fetch dashboard data");
    throw error;
  }
  return res.json();
};

/**
 * SWR hook for dashboard data
 * Provides automatic caching, revalidation, and optimistic updates
 */
export function useDashboardData(propertyId: string | null) {
  const { data, error, mutate, isLoading } = useSWR(
    propertyId ? `/api/dashboard/unified?propertyId=${propertyId}` : null,
    fetcher,
    {
      revalidateOnFocus: false, // Don't revalidate on window focus
      revalidateOnReconnect: true, // Revalidate on reconnect
      dedupingInterval: 60000, // 1 minute deduplication
      refreshInterval: 300000, // Auto-refresh every 5 minutes
      shouldRetryOnError: true, // Retry on error
      errorRetryCount: 3, // Max 3 retries
      errorRetryInterval: 5000 // 5 seconds between retries
    }
  );

  /**
   * Manual refresh function that bypasses cache
   */
  const refresh = async () => {
    if (!propertyId) return;
    
    // Force revalidation with cache bypass
    await mutate(
      fetch(`/api/dashboard/unified?propertyId=${propertyId}&refresh=true`).then(
        (res) => res.json()
      ),
      {
        revalidate: false // Don't revalidate again after mutation
      }
    );
  };

  return {
    dashboardData: data,
    isLoading,
    isError: error,
    mutate,
    refresh
  };
}

