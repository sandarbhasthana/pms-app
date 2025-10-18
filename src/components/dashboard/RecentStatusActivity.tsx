// File: src/components/dashboard/RecentStatusActivity.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ReservationStatus } from "@prisma/client";
import {
  Clock,
  User,
  Calendar,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/reservation-status";
import { getStatusConfig } from "@/lib/reservation-status/utils";
import { formatDistanceToNow } from "date-fns";
import {
  apiDeduplicator,
  createStatusSummaryKey
} from "@/lib/api-deduplication";

interface RecentStatusChange {
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
}

interface RecentStatusActivityProps {
  propertyId: string;
  limit?: number;
  refreshInterval?: number;
  showFilters?: boolean;
  // Optional: Accept pre-fetched data to avoid duplicate API calls
  preloadedData?: RecentStatusChange[];
}

export default function RecentStatusActivity({
  propertyId,
  limit = 20,
  refreshInterval = 30000, // 30 seconds
  showFilters = true,
  preloadedData
}: RecentStatusActivityProps) {
  const [activities, setActivities] = useState<RecentStatusChange[]>(
    preloadedData || []
  );
  const [isLoading, setIsLoading] = useState(!preloadedData);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "manual" | "automatic">("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch recent activity with deduplication - memoized with useCallback to prevent unnecessary re-renders
  const fetchActivity = useCallback(async () => {
    try {
      const dedupeKey = createStatusSummaryKey(propertyId, true);

      const result = await apiDeduplicator.deduplicate(dedupeKey, async () => {
        const response = await fetch(
          `/api/reservations/status-summary?propertyId=${propertyId}&includeHistorical=true`,
          {
            credentials: "include",
            cache: "no-cache"
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch activity data");
        }

        return response.json();
      });

      // Apply client-side limit to the activities
      const limitedActivities = (result.recentChanges || []).slice(0, limit);
      setActivities(limitedActivities);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, limit]); // Dependencies: only values used inside the function

  useEffect(() => {
    // Skip initial fetch if we have preloaded data
    if (preloadedData && preloadedData.length > 0) {
      setLastUpdated(new Date());
      return;
    }

    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce the initial fetch
    fetchTimeoutRef.current = setTimeout(() => {
      fetchActivity();
    }, 100);

    // Only set up interval if refreshInterval > 0
    if (refreshInterval > 0) {
      const interval = setInterval(fetchActivity, refreshInterval);
      return () => {
        clearInterval(interval);
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
      };
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchActivity, refreshInterval, preloadedData]); // Now includes fetchActivity safely

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    if (filter === "manual") return !activity.isAutomatic;
    if (filter === "automatic") return activity.isAutomatic;
    return true;
  });

  // Get activity icon
  const getActivityIcon = (activity: RecentStatusChange) => {
    if (activity.isAutomatic) {
      return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
    return <User className="h-4 w-4 text-purple-500" />;
  };

  // Get status change description
  const getStatusChangeDescription = (activity: RecentStatusChange) => {
    const fromStatus = activity.previousStatus
      ? getStatusConfig(activity.previousStatus).label
      : "New";
    const toStatus = getStatusConfig(activity.newStatus).label;

    return `${fromStatus} → ${toStatus}`;
  };

  // Get activity priority/severity
  const getActivitySeverity = (activity: RecentStatusChange) => {
    switch (activity.newStatus) {
      case ReservationStatus.NO_SHOW:
      case ReservationStatus.CANCELLED:
        return "high";
      case ReservationStatus.CONFIRMATION_PENDING:
        return "medium";
      default:
        return "low";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Status Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Status Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Failed to load activity: {error}
              </p>
              <button
                type="button"
                onClick={fetchActivity}
                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              >
                Try again
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Status Activity</span>
          </CardTitle>

          {showFilters && (
            <div className="flex items-center space-x-2">
              <select
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value as "all" | "manual" | "automatic")
                }
                className="text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-800"
              >
                <option value="all">All Changes</option>
                <option value="manual">Manual Only</option>
                <option value="automatic">Automatic Only</option>
              </select>

              <button
                type="button"
                onClick={fetchActivity}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No recent status activity
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredActivities.map((activity) => {
                const severity = getActivitySeverity(activity);

                return (
                  <div
                    key={activity.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border ${
                      severity === "high"
                        ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                        : severity === "medium"
                        ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
                        : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
                    }`}
                  >
                    {/* Activity Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity)}
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {activity.reservation.guestName || "Guest"}
                        </p>

                        <div className="flex items-center space-x-1">
                          {activity.previousStatus && (
                            <StatusBadge
                              status={activity.previousStatus}
                              size="sm"
                              showIcon={false}
                            />
                          )}
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                          <StatusBadge
                            status={activity.newStatus}
                            size="sm"
                            showIcon={false}
                          />
                        </div>
                      </div>

                      {/* Status Change Description */}
                      <p className="text-xs text-muted-foreground mb-1">
                        Status: {getStatusChangeDescription(activity)}
                      </p>

                      <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(
                            activity.reservation.checkIn
                          ).toLocaleDateString()}{" "}
                          -{" "}
                          {new Date(
                            activity.reservation.checkOut
                          ).toLocaleDateString()}
                        </span>
                      </div>

                      {activity.changeReason && (
                        <p className="text-xs text-muted-foreground mb-1">
                          Reason: {activity.changeReason}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              activity.isAutomatic ? "secondary" : "default"
                            }
                            className="text-xs"
                          >
                            {activity.isAutomatic ? "Automatic" : "Manual"}
                          </Badge>

                          {activity.changedBy && (
                            <span className="text-xs text-muted-foreground">
                              by {activity.changedBy}
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.changedAt), {
                            addSuffix: true
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <div className="flex items-center justify-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
