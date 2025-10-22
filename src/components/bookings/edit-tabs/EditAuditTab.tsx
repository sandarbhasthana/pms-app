"use client";

import React, { useState, useEffect } from "react";
import {
  ClockIcon,
  UserIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";
import { EditReservationData, EditBookingFormData } from "./types";
import { getStatusConfig } from "@/lib/reservation-status/utils";
import { ReservationStatus } from "@prisma/client";
import { LoadingSpinner } from "@/components/ui/spinner";

interface EditAuditTabProps {
  reservationData: EditReservationData;
  formData: EditBookingFormData;
  onUpdate: (data: Partial<EditBookingFormData>) => void;
}

interface StatusHistoryEntry {
  id: string;
  previousStatus: ReservationStatus | null;
  newStatus: ReservationStatus;
  changeReason: string | null;
  changedBy: string | null;
  changedAt: string;
  isAutomatic: boolean;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

// Note: Activity log data will be populated from API when available
// For now, we'll use status history as the primary audit trail

const EditAuditTab: React.FC<EditAuditTabProps> = ({ reservationData }) => {
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch status history when component mounts or reservation changes
  useEffect(() => {
    const fetchStatusHistory = async () => {
      if (!reservationData?.id) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/reservations/${reservationData.id}/status-history?limit=50&includeAutomatic=true`,
          {
            credentials: "include"
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch status history");
        }

        const data = await response.json();
        console.log("Status history response:", data);
        setStatusHistory(data.statusHistory || []);
      } catch (err) {
        console.error("Error fetching status history:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load status history"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStatusHistory();
  }, [reservationData?.id]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  const getStatusBadgeColor = (status: ReservationStatus | null) => {
    if (!status)
      return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";

    const config = getStatusConfig(status);
    return `${config.bgColor} ${config.textColor}`;
  };

  return (
    <div className="space-y-6">
      {/* Status History Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <ClockIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Status Change History
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Complete chronological history of all status changes for this
          reservation.
        </p>
      </div>

      {/* Status History Entries */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        ) : statusHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No status changes recorded yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {statusHistory.map((entry, index) => (
              <div key={entry.id} className="relative">
                {/* Timeline Line */}
                {index < statusHistory.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200 dark:bg-gray-600"></div>
                )}

                <div className="flex items-start gap-4">
                  {/* Timeline Dot */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 dark:!bg-gray-700 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </div>

                  {/* Status Change Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {entry.previousStatus && (
                        <>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              entry.previousStatus
                            )}`}
                          >
                            {getStatusConfig(entry.previousStatus).label}
                          </span>
                          <ArrowRightIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        </>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                          entry.newStatus
                        )}`}
                      >
                        {getStatusConfig(entry.newStatus).label}
                      </span>
                      {entry.isAutomatic && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                          Automatic
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                      {entry.changeReason || "Status changed"}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatTimestamp(entry.changedAt)}</span>
                      <span>
                        by {entry.user?.name || entry.user?.email || "System"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Trail Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <ClockIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Reservation Activity Log
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Complete chronological history of all changes made to this
          reservation.
        </p>
      </div>

      {/* Audit Log Entries - Coming Soon */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Full activity log (field changes, notes, etc.) coming soon.
            Currently showing status change history above.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EditAuditTab;
