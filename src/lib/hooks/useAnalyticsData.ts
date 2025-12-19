// File: src/lib/hooks/useAnalyticsData.ts
import { useState, useEffect, useCallback } from "react";
import { ReservationStatus } from "@/types/reservation-status";

interface StatusSummary {
  [ReservationStatus.CONFIRMATION_PENDING]: number;
  [ReservationStatus.CONFIRMED]: number;
  [ReservationStatus.CHECKIN_DUE]: number;
  [ReservationStatus.IN_HOUSE]: number;
  [ReservationStatus.CHECKOUT_DUE]: number;
  [ReservationStatus.CHECKED_OUT]: number;
  [ReservationStatus.NO_SHOW]: number;
  [ReservationStatus.CANCELLED]: number;
}

interface UnifiedAnalyticsData {
  statusOverview: {
    statusCounts: StatusSummary;
    todayActivity: {
      checkInsToday: number;
      checkOutsToday: number;
      arrivalsToday: number;
      departuresScheduled: number;
    };
    summary: {
      totalReservations: number;
      activeReservations: number;
      completedReservations: number;
      cancelledReservations: number;
      occupancyRate: number;
      confirmationRate: number;
      noShowRate: number;
    };
    recentChanges?: Array<{
      id: string;
      reservationId: string;
      previousStatus: ReservationStatus | null;
      newStatus: ReservationStatus;
      changedBy: string | null;
      changeReason: string | null;
      changedAt: string;
      isAutomatic: boolean;
      reservation: {
        id: string;
        guestName: string | null;
        checkIn: string;
        checkOut: string;
      };
    }>;
  };
  chartData: {
    statusDistribution: Array<{
      status: ReservationStatus;
      count: number;
      percentage: number;
    }>;
    dailyTrends: Array<{
      date: string;
      [key: string]: number | string;
    }>;
    conversionRates: {
      pendingToConfirmed: number;
      confirmedToCheckedIn: number;
      checkedInToCheckedOut: number;
      cancellationRate: number;
      noShowRate: number;
    };
    averageTimeInStatus: Array<{
      status: ReservationStatus;
      averageHours: number;
    }>;
  };
}

/**
 * Hook to fetch unified analytics data
 * Combines status overview and chart data in a single API call
 */
export function useAnalyticsData(
  propertyId: string | null,
  includeRecentActivity: boolean = true,
  refreshInterval: number = 300000 // 5 minutes
) {
  const [data, setData] = useState<UnifiedAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!propertyId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/dashboard/analytics?propertyId=${propertyId}&includeRecentActivity=${includeRecentActivity}`,
        {
          credentials: "include",
          cache: "no-cache"
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch analytics data");
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, includeRecentActivity]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh interval
  useEffect(() => {
    if (!propertyId) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval, propertyId]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData
  };
}
