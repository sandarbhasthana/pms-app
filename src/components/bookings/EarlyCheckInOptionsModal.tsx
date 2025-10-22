"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ExclamationCircleIcon,
  CalendarIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { format } from "date-fns";

interface EarlyCheckInOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  scheduledCheckInTime: string;
  currentCheckInTime: string;
  hoursEarly: number;
  onRequestApproval: () => void;
  onChangeCheckInDate: (newCheckInDate: string) => void;
  isLoading?: boolean;
}

export function EarlyCheckInOptionsModal({
  isOpen,
  onClose,
  guestName,
  scheduledCheckInTime,
  currentCheckInTime,
  hoursEarly,
  onRequestApproval,
  onChangeCheckInDate,
  isLoading = false
}: EarlyCheckInOptionsModalProps) {
  const handleApprovalClick = () => {
    onRequestApproval();
    // Don't close modal here - let the parent handle it after the request completes
  };

  const handleChangeClick = () => {
    // Directly apply the current date without showing a picker
    onChangeCheckInDate(currentCheckInTime);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExclamationCircleIcon className="h-5 w-5 text-amber-600" />
            Early Check-in Request
          </DialogTitle>
          <DialogDescription>
            {guestName} is checking in {hoursEarly.toFixed(1)} hours earlier
            than scheduled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              <span className="font-medium">Scheduled check-in:</span>{" "}
              {format(new Date(scheduledCheckInTime), "MMM dd, yyyy h:mm a")}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">Requested check-in:</span>{" "}
              {format(new Date(currentCheckInTime), "MMM dd, yyyy h:mm a")}
            </p>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose how you&apos;d like to proceed:
          </p>

          <div className="space-y-3">
            {/* Option 1: Request Approval */}
            <button
              type="button"
              onClick={handleApprovalClick}
              className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left"
            >
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Request Manager Approval
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Send an approval request to the property manager.
                    They&apos;ll review and approve or reject the early
                    check-in.
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2: Change Check-in Date */}
            <button
              type="button"
              onClick={handleChangeClick}
              className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all text-left"
            >
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Change Check-in Date
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Update the check-in date to match the current time. No
                    approval needed.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
