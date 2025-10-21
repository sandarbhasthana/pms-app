"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReservationStatus } from "@prisma/client";
import { getStatusConfig } from "@/lib/reservation-status/utils";
import { AlertCircle } from "lucide-react";

interface StatusChangeConfirmationModalProps {
  isOpen: boolean;
  currentStatus: ReservationStatus;
  newStatus: ReservationStatus;
  guestName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Modal for confirming status changes with optional reason/notes
 */
export const StatusChangeConfirmationModal: React.FC<
  StatusChangeConfirmationModalProps
> = ({
  isOpen,
  currentStatus,
  newStatus,
  guestName,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  const [reason, setReason] = useState("");

  const currentConfig = getStatusConfig(currentStatus);
  const newConfig = getStatusConfig(newStatus);

  // Determine if this is a critical transition that needs warning
  const isCriticalTransition =
    (currentStatus === "CONFIRMED" && newStatus === "CANCELLED") ||
    (currentStatus === "IN_HOUSE" && newStatus === "CANCELLED") ||
    (currentStatus === "CONFIRMED" && newStatus === "NO_SHOW");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-[#f0f8ff]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCriticalTransition && (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            Confirm Status Change
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            You are about to change the reservation status for {guestName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current and New Status Display */}
          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Current Status
              </p>
              <div
                className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: currentConfig.color }}
              >
                {currentConfig.label}
              </div>
            </div>

            <div className="text-gray-400">→</div>

            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                New Status
              </p>
              <div
                className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: newConfig.color }}
              >
                {newConfig.label}
              </div>
            </div>
          </div>

          {/* Critical Transition Warning */}
          {isCriticalTransition && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>⚠️ Warning:</strong> This is a critical status change.
                Please provide a reason for this action.
              </p>
            </div>
          )}

          {/* Reason/Notes Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Reason for Status Change
              {isCriticalTransition && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <Textarea
              placeholder="Enter reason for this status change (e.g., 'Guest confirmed via phone', 'No-show after 24 hours')"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-[#f0f8ff] border-gray-300 dark:border-gray-600"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This will be logged in the audit trail for future reference.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-[#f0f8ff] border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isLoading ||
              (isCriticalTransition && reason.trim().length === 0)
            }
            className="bg-[#7210a2] hover:bg-purple-600 dark:bg-[#8b4aff] dark:hover:bg-[#a876ff] text-white"
          >
            {isLoading ? "Updating..." : "Confirm Status Change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

