"use client";

import React from "react";
import { ClockIcon, UserIcon } from "@heroicons/react/24/outline";
import { EditReservationData, EditBookingFormData } from "./types";

interface EditAuditTabProps {
  reservationData: EditReservationData;
  formData: EditBookingFormData;
  onUpdate: (data: Partial<EditBookingFormData>) => void;
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

const EditAuditTab: React.FC<EditAuditTabProps> = ({
  // reservationData,
  // formData,
  // onUpdate
}) => {
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

  return (
    <div className="space-y-6">
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

      {/* Placeholder Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
          <strong>Coming Soon:</strong> Real-time audit logging with field-level
          change tracking, user attribution, and filtering capabilities will be
          implemented in Phase 4 of the Folio Creation Plan.
        </p>
      </div>
    </div>
  );
};

export default EditAuditTab;
