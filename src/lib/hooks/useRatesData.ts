"use client";

import useSWR from "swr";
import { useState, useCallback, useMemo } from "react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { fetchWithPropertyContext } from "@/lib/api-client";

// Types for rates data
export interface RateRestrictions {
  minLOS?: number;
  maxLOS?: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
}

export interface RateCell {
  basePrice: number;
  finalPrice: number;
  availability: number;
  isOverride: boolean;
  isSeasonal: boolean;
  restrictions: RateRestrictions;
}

export interface RoomTypeRates {
  roomTypeId: string;
  roomTypeName: string;
  totalRooms: number;
  dates: Record<string, RateCell>;
}

export interface RatesResponse {
  success: boolean;
  data: RoomTypeRates[];
  dateRange: {
    startDate: string;
    endDate: string;
    dates: string[];
  };
}

export interface RateLogsPagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface RateChangeLog {
  id: string;
  roomType: {
    id: string;
    name: string;
  };
  date: string | null;
  oldPrice: number | null;
  newPrice: number;
  changeType: string;
  reason: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: string;
}

export interface RateLogsResponse {
  success: boolean;
  data: RateChangeLog[];
  pagination: RateLogsPagination;
}

export interface SeasonalRate {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  isActive: boolean;
  roomTypeId?: string;
  roomType?: {
    id: string;
    name: string;
  };
}

export interface SeasonalRatesResponse {
  success: boolean;
  data: SeasonalRate[];
}

// Fetcher function with error handling
const fetcher = async (url: string): Promise<RatesResponse> => {
  const res = await fetchWithPropertyContext(url, {
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    const errorData = await res
      .json()
      .catch(() => ({ error: "Network error" }));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "API returned unsuccessful response");
  }

  return data;
};

// Fetcher for logs API
const logsFetcher = async (url: string): Promise<RateLogsResponse> => {
  const res = await fetchWithPropertyContext(url, {
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    const errorData = await res
      .json()
      .catch(() => ({ error: "Network error" }));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "API returned unsuccessful response");
  }

  return data;
};

// Fetcher for seasonal rates API
const seasonalRatesFetcher = async (
  url: string
): Promise<SeasonalRatesResponse> => {
  const res = await fetchWithPropertyContext(url, {
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    const errorData = await res
      .json()
      .catch(() => ({ error: "Network error" }));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "API returned unsuccessful response");
  }

  return data;
};

// Main hook for rates data
export function useRatesData(
  startDate: Date,
  days: number = 7,
  ratePlan: string = "base",
  applyBusinessRules: boolean = true
) {
  const startDateStr = format(startDate, "yyyy-MM-dd");

  // Build stable SWR key (memoized to prevent infinite re-renders)
  const swrKey = useMemo(() => {
    const params = new URLSearchParams({
      startDate: startDateStr,
      days: days.toString(),
      ratePlan,
      applyRules: applyBusinessRules.toString()
    });
    return `/api/rates?${params.toString()}`;
  }, [startDateStr, days, ratePlan, applyBusinessRules]);

  const { data, error, isLoading, mutate } = useSWR<RatesResponse>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false, // Reduce reconnect revalidation
      revalidateIfStale: false, // Don't revalidate if data is stale
      refreshInterval: 0, // No auto-refresh to prevent conflicts during editing
      dedupingInterval: 10000, // Increase cache duration to 10 seconds
      errorRetryCount: 2, // Reduce retry attempts
      errorRetryInterval: 2000, // Increase retry interval
      onError: (error) => {
        console.error("Rates data fetch error:", error);
        toast.error(`Failed to load rates: ${error.message}`);
      }
    }
  );

  // Generate date array for UI (memoized to prevent unnecessary re-renders)
  const dates = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(startDate, i)),
    [startDate, days]
  );

  return {
    data: data?.data || [],
    dateRange: data?.dateRange,
    dates,
    isLoading,
    error,
    mutate // For manual revalidation after updates
  };
}

// Hook for updating individual rates
export function useRateUpdates() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateRate = useCallback(
    async (
      roomTypeId: string,
      date: string | null,
      price: number,
      options?: {
        availability?: number;
        restrictions?: Partial<RateRestrictions>;
        ratePlan?: string;
      }
    ) => {
      setIsUpdating(true);

      try {
        const body = {
          date,
          price,
          availability: options?.availability,
          restrictions: options?.restrictions,
          ratePlan: options?.ratePlan || "base"
        };

        const response = await fetchWithPropertyContext(
          `/api/rates/${roomTypeId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
          }
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Network error" }));
          console.error("Rate update API error:", {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const result = await response.json();

        if (!result.success) {
          console.error("Rate update failed:", result);
          throw new Error(result.error || "Update failed");
        }

        toast.success(result.message || "Rate updated successfully");
        return result.data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to update rate: ${errorMessage}`);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  const bulkUpdateRates = useCallback(
    async (
      updates: Array<{
        roomTypeId: string;
        date: string;
        price: number;
        availability?: number;
        restrictions?: Partial<RateRestrictions>;
      }>
    ) => {
      setIsUpdating(true);

      try {
        const response = await fetchWithPropertyContext("/api/rates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ updates })
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Network error" }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Bulk update failed");
        }

        toast.success(`Successfully updated ${result.updatedCount} rates`);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to bulk update rates: ${errorMessage}`);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  const deleteRate = useCallback(async (roomTypeId: string, date: string) => {
    setIsUpdating(true);

    try {
      const response = await fetchWithPropertyContext(
        `/api/rates/${roomTypeId}?date=${date}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Network error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Delete failed");
      }

      toast.success("Daily rate override removed");
      return result.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to delete rate: ${errorMessage}`);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    updateRate,
    bulkUpdateRates,
    deleteRate,
    isUpdating
  };
}

// Hook for seasonal rates
export function useSeasonalRates(roomTypeId?: string) {
  // Build stable SWR key (memoized to prevent infinite re-renders)
  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    if (roomTypeId) params.set("roomTypeId", roomTypeId);
    return `/api/rates/seasonal?${params.toString()}`;
  }, [roomTypeId]);

  const { data, error, isLoading, mutate } = useSWR<SeasonalRatesResponse>(
    swrKey,
    seasonalRatesFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false, // Fixed: Disable reconnect revalidation
      revalidateIfStale: false, // Don't revalidate stale data
      refreshInterval: 0,
      dedupingInterval: 30000, // Cache for 30 seconds
      errorRetryCount: 1, // Reduce retry attempts
      onError: (error) => {
        console.error("Seasonal rates fetch error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to load seasonal rates: ${errorMessage}`);
      }
    }
  );

  const createSeasonalRate = useCallback(
    async (seasonalRate: {
      name: string;
      startDate: string;
      endDate: string;
      multiplier: number;
      roomTypeId?: string;
    }) => {
      try {
        const response = await fetch("/api/rates/seasonal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(seasonalRate)
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Network error" }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Creation failed");
        }

        toast.success("Seasonal rate created successfully");
        mutate(); // Revalidate the list
        return result.data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to create seasonal rate: ${errorMessage}`);
        throw error;
      }
    },
    [mutate]
  );

  return {
    seasonalRates: data?.data || [],
    isLoading,
    error,
    mutate,
    createSeasonalRate
  };
}

// Hook for rate change logs
export function useRateLogs(filters?: {
  roomTypeId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  // Build stable SWR key (memoized to prevent infinite re-renders)
  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    if (filters?.roomTypeId) params.set("roomTypeId", filters.roomTypeId);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    if (filters?.limit) params.set("limit", filters.limit.toString());
    return `/api/rates/logs?${params.toString()}`;
  }, [
    filters?.roomTypeId,
    filters?.startDate,
    filters?.endDate,
    filters?.limit
  ]);

  const { data, error, isLoading, mutate } = useSWR<RateLogsResponse>(
    swrKey,
    logsFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Disable auto-refresh to prevent Fast Refresh issues
      dedupingInterval: 30000, // Cache for 30 seconds
      onError: (error) => {
        console.error("Rate logs fetch error:", error);
        // Don't show toast for logs errors as they're less critical
      }
    }
  );

  return {
    logs: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate
  };
}

// Hook for exporting rates
export function useRatesExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportRates = useCallback(
    async (options: {
      format: "csv" | "excel";
      startDate: string;
      days: number;
      roomTypeIds?: string[];
    }) => {
      setIsExporting(true);

      try {
        const params = new URLSearchParams({
          format: options.format,
          startDate: options.startDate,
          days: options.days.toString()
        });

        if (options.roomTypeIds?.length) {
          params.set("roomTypeIds", options.roomTypeIds.join(","));
        }

        const response = await fetchWithPropertyContext(
          `/api/rates/export?${params.toString()}`
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Network error" }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        if (options.format === "csv") {
          // Handle CSV download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `rates_export_${options.startDate}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          toast.success("CSV export downloaded successfully");
        } else {
          // Handle Excel data (would need frontend Excel library)
          const data = await response.json();
          toast.success("Excel export data ready");
          return data;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Export failed: ${errorMessage}`);
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return {
    exportRates,
    isExporting
  };
}
