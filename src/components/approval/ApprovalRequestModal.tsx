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
import { CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

interface ApprovalRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvalReason: string;
  requestType: string;
  guestName?: string;
  approvalRequestId?: string;
}

export function ApprovalRequestModal({
  isOpen,
  onClose,
  approvalReason,
  requestType,
  guestName,
  approvalRequestId
}: ApprovalRequestModalProps) {
  const handleClose = () => {
    onClose();
  };

  const getRequestTypeLabel = (type: string): string => {
    switch (type) {
      case "EARLY_CHECKIN":
        return "Early Check-in Request";
      case "LATE_CHECKOUT":
        return "Late Checkout Request";
      case "CANCELLATION":
        return "Cancellation Request";
      default:
        return "Approval Request";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <ClockIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>{getRequestTypeLabel(requestType)}</DialogTitle>
              <DialogDescription>
                Submitted for manager approval
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800">
            <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Pending Approval
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                A property manager will review your request shortly
              </p>
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-3 rounded-lg bg-gray-50 dark:bg-gray-900/30 p-3">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Request Type
              </p>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                {getRequestTypeLabel(requestType)}
              </p>
            </div>

            {guestName && (
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Guest
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {guestName}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Reason
              </p>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                {approvalReason}
              </p>
            </div>

            {approvalRequestId && (
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Request ID
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono">
                  {approvalRequestId.substring(0, 12)}...
                </p>
              </div>
            )}
          </div>

          {/* Info Message */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              💡 You&apos;ll receive a notification once the manager approves or
              rejects your request.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleClose}
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
