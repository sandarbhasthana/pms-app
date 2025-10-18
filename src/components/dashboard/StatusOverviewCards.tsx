// File: src/components/dashboard/StatusOverviewCards.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ReservationStatus } from "@prisma/client";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/reservation-status";
import { getStatusConfig } from "@/lib/reservation-status/utils";
import {
  apiDeduplicator,
  createStatusSummaryKey
} from "@/lib/api-deduplication";

interface StatusSummary {
  [ReservationStatus.CONFIRMATION_PENDING]: number;
  [ReservationStatus.CONFIRMED]: number;
  [ReservationStatus.IN_HOUSE]: number;
  [ReservationStatus.CHECKED_OUT]: number;
  [ReservationStatus.NO_SHOW]: number;
  [ReservationStatus.CANCELLED]: number;
}

interface TodayActivity {
  checkInsToday: number;
  checkOutsToday: number;
  arrivalsToday: number;
  departuresScheduled: number;
}

interface StatusAnalytics {
  totalReservations: number;
  activeReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  occupancyRate: number;
  confirmationRate: number;
  noShowRate: number;
}

interface StatusOverviewData {
  statusCounts: StatusSummary;
  todayActivity: TodayActivity;
  summary: StatusAnalytics;
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
}

interface StatusOverviewCardsProps {
  propertyId: string;
  refreshInterval?: number;
  showRecentActivity?: boolean;
}

export default function StatusOverviewCards({
  propertyId,
  refreshInterval = 30000, // 30 seconds
  showRecentActivity = true
}: StatusOverviewCardsProps) {
  const [data, setData] = useState<StatusOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch status overview data with deduplication
  const fetchStatusData = useCallback(async () => {
    try {
      const dedupeKey = createStatusSummaryKey(propertyId, showRecentActivity);

      const result = await apiDeduplicator.deduplicate(dedupeKey, async () => {
        const response = await fetch(
          `/api/reservations/status-summary?propertyId=${propertyId}&includeHistorical=${showRecentActivity}`,
          {
            credentials: "include",
            cache: "no-cache"
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch status data");
        }

        return response.json();
      });

      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, showRecentActivity]);

  // Initial load and refresh interval with debouncing
  useEffect(() => {
    // Debounce the initial fetch to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      fetchStatusData();
    }, 200);

    const interval = setInterval(fetchStatusData, refreshInterval);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [propertyId, refreshInterval, showRecentActivity, fetchStatusData]);

  // Calculate status metrics
  const statusMetrics = useMemo(() => {
    if (!data) return null;

    const { statusCounts, summary } = data;

    return [
      {
        title: "Active Reservations",
        value: summary.activeReservations,
        icon: Calendar,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        description: `${summary.totalReservations} total reservations`
      },
      {
        title: "In-House Guests",
        value: statusCounts[ReservationStatus.IN_HOUSE],
        icon: Users,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        description: `${summary.occupancyRate.toFixed(1)}% occupancy rate`
      },
      {
        title: "Pending Confirmations",
        value: statusCounts[ReservationStatus.CONFIRMATION_PENDING],
        icon: Clock,
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        description: `${summary.confirmationRate.toFixed(1)}% confirmation rate`
      },
      {
        title: "No-Shows",
        value: statusCounts[ReservationStatus.NO_SHOW],
        icon: AlertTriangle,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        description: `${summary.noShowRate.toFixed(1)}% no-show rate`
      }
    ];
  }, [data]);

  // Today's activity metrics
  const activityMetrics = useMemo(() => {
    if (!data) return null;

    const { todayActivity } = data;

    return [
      {
        title: "Today's Check-ins",
        value: todayActivity.checkInsToday,
        subtitle: `${todayActivity.arrivalsToday} arrivals scheduled`,
        icon: CheckCircle,
        color: "text-green-600 dark:text-green-400"
      },
      {
        title: "Today's Check-outs",
        value: todayActivity.checkOutsToday,
        subtitle: `${todayActivity.departuresScheduled} departures scheduled`,
        icon: XCircle,
        color: "text-blue-600 dark:text-blue-400"
      }
    ];
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Failed to load status data: {error}
            </p>
            <button
              type="button"
              onClick={fetchStatusData}
              className="mt-2 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusMetrics?.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="card-hover purple-accent-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-primary number-hover cursor-pointer">
                  {metric.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Today's Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activityMetrics?.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="card-hover purple-accent-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-primary number-hover cursor-pointer">
                  {metric.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metric.subtitle}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Status Breakdown */}
      {data && (
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(data.statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <StatusBadge
                    status={status as ReservationStatus}
                    size="sm"
                    showLabel={false}
                  />
                  <p className="text-2xl font-bold text-purple-primary mt-2">
                    {count}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getStatusConfig(status as ReservationStatus).label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="flex items-center justify-end text-xs text-muted-foreground">
          <Activity className="h-3 w-3 mr-1" />
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
