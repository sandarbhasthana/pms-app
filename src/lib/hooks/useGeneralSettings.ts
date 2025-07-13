"use client";

import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();

  // If the response contains an error field, throw it as an error instead of returning it as data
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

export function useGeneralSettings(orgId?: string) {
  const shouldFetch = !!orgId;
  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? `/api/settings/general?orgId=${orgId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Disable automatic refresh
      dedupingInterval: 60000, // Cache for 1 minute
      // FIX: Add these options to prevent infinite rebuilding
      revalidateIfStale: false, // Don't revalidate if data is stale
      revalidateOnMount: true, // Only revalidate on mount
      fallbackData: undefined, // Ensure consistent fallback
      keepPreviousData: true, // Keep previous data during revalidation
      // Disable error retry that might cause rebuilding
      errorRetryCount: 0,
      errorRetryInterval: 0
    }
  );

  return {
    settings: data,
    isLoading,
    error,
    mutate
  };
}
