"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { StatusHistoryEntry } from "@/types/reservation-status";
import StatusBadge from "./StatusBadge";
import {
  ClockIcon,
  UserIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { formatDateTime } from "@/lib/utils/dateFormatter";

interface StatusHistoryProps {
  reservationId: string;
  className?: string;
  maxItems?: number;
  showAutomatic?: boolean;
}

const StatusHistory: React.FC<StatusHistoryProps> = ({
  reservationId,
  className = "",
  maxItems = 10,
  showAutomatic = true
}) => {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent rapid duplicate calls with time-based throttling
  const lastFetchTimeRef = useRef<number>(0);
  const lastFetchParamsRef = useRef<string>("");
  const controllerRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async () => {
    // Don't fetch if no reservationId
    if (!reservationId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    // Create cache key from parameters
    const cacheKey = `${reservationId}-${maxItems}-${showAutomatic}`;
    const now = Date.now();

    // Skip if we fetched the same parameters within the last 1 second (throttling)
    if (
      lastFetchParamsRef.current === cacheKey &&
      now - lastFetchTimeRef.current < 1000
    ) {
      return;
    }

    // Cancel any ongoing request
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    // Create new controller for this request
    controllerRef.current = new AbortController();
    const controller = controllerRef.current;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/reservations/${reservationId}/status-history?limit=${maxItems}&includeAutomatic=${showAutomatic}`,
        {
          credentials: "include",
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch status history");
      }

      const data = await response.json();

      // Only update state if the request wasn't cancelled
      if (!controller.signal.aborted) {
        setHistory(data.statusHistory || []);
        lastFetchParamsRef.current = cacheKey; // Cache successful fetch
        lastFetchTimeRef.current = now; // Record fetch time
      }
    } catch (err) {
      // Don't update state if request was aborted
      if (
        !controller.signal.aborted &&
        err instanceof Error &&
        err.name !== "AbortError"
      ) {
        setError(err.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [reservationId, maxItems, showAutomatic]);

  useEffect(() => {
    fetchHistory();

    // Cleanup function to cancel ongoing requests
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [fetchHistory]);

  const formatDate = (date: Date | string) => {
    return formatDateTime(date, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ClockIcon className="h-4 w-4 animate-spin" />
          Loading status history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-red-500">
          <ExclamationTriangleIcon className="h-4 w-4" />
          {error}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="text-sm text-gray-500 text-center py-4">
          No status history available
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Status History
      </h4>

      <div className="space-y-3">
        {history.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`
                w-2 h-2 rounded-full mt-2
                ${entry.isAutomatic ? "bg-blue-400" : "bg-purple-400"}
              `}
              />
              {index < history.length - 1 && (
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-600 mt-1" />
              )}
            </div>

            {/* Status change content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {entry.previousStatus && (
                  <>
                    <StatusBadge status={entry.previousStatus} size="sm" />
                    <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                  </>
                )}
                <StatusBadge status={entry.newStatus} size="sm" />

                {entry.isAutomatic && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                    Auto
                  </span>
                )}
              </div>

              {entry.changeReason && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {entry.changeReason}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  {formatDate(entry.changedAt)}
                </div>

                {entry.changedBy && (
                  <div className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    {entry.changedBy}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusHistory;
