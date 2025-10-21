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
}

// Mock audit data - will be replaced with real data from API
const mockAuditLogs = [
  {
    id: 1,
    action: "RESERVATION_CREATED",
    field: null,
    oldValue: null,
    newValue: null,
    user: "John Smith",
    timestamp: "2025-08-30T15:30:00Z",
    metadata: { source: "BOOKING_FORM" }
  },
  {
    id: 2,
    action: "STATUS_CHANGED",
    field: "status",
    oldValue: "PENDING",
    newValue: "CONFIRMED",
    user: "Jane Doe",
    timestamp: "2025-08-30T16:45:00Z",
    metadata: { reason: "Payment received" }
  },
  {
    id: 3,
    action: "FIELD_UPDATED",
    field: "checkIn",
    oldValue: "2025-09-01",
    newValue: "2025-09-02",
    user: "John Smith",
    timestamp: "2025-08-31T10:15:00Z",
    metadata: { reason: "Guest request" }
  },
  {
    id: 4,
    action: "NOTE_ADDED",
    field: "notes",
    oldValue: null,
    newValue: "Guest requested late checkout",
    user: "Ishesh Tyagi",
    timestamp: "2025-08-31T11:13:00Z",
    metadata: { noteType: "GUEST_REQUEST" }
  }
];

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

  const getActionColor = (action: string) => {
    switch (action) {
      case "RESERVATION_CREATED":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
      case "STATUS_CHANGED":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20";
      case "FIELD_UPDATED":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
      case "NOTE_ADDED":
        return "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "RESERVATION_CREATED":
        return "Reservation Created";
      case "STATUS_CHANGED":
        return "Status Changed";
      case "FIELD_UPDATED":
        return "Field Updated";
      case "NOTE_ADDED":
        return "Note Added";
      default:
        return action.replace(/_/g, " ");
    }
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
                      <span>by {entry.changedBy || "System"}</span>
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

      {/* Audit Log Entries */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {mockAuditLogs.map((log, index) => (
            <div key={log.id} className="relative">
              {/* Timeline Line */}
              {index < mockAuditLogs.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200 dark:bg-gray-600"></div>
              )}

              <div className="flex items-start gap-4">
                {/* Timeline Dot */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 dark:!bg-gray-700 flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>

                {/* Log Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(
                        log.action
                      )}`}
                    >
                      {getActionLabel(log.action)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      by {log.user}
                    </span>
                  </div>

                  <div className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                    {log.field && log.oldValue && log.newValue ? (
                      <span>
                        Changed <strong>{log.field}</strong> from{" "}
                        <span className="text-red-600 dark:text-red-400">
                          &quot;{log.oldValue}&quot;
                        </span>{" "}
                        to{" "}
                        <span className="text-green-600 dark:text-green-400">
                          &quot;{log.newValue}&quot;
                        </span>
                      </span>
                    ) : log.field && log.newValue ? (
                      <span>
                        Added <strong>{log.field}</strong>:{" "}
                        <span className="text-green-600 dark:text-green-400">
                          &quot;{log.newValue}&quot;
                        </span>
                      </span>
                    ) : (
                      <span>{getActionLabel(log.action)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatTimestamp(log.timestamp)}</span>
                    {log.metadata?.reason && (
                      <span>Reason: {log.metadata.reason}</span>
                    )}
                    {log.metadata?.source && (
                      <span>Source: {log.metadata.source}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EditAuditTab;
