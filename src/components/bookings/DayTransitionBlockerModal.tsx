"use client";

/**
 * Day Transition Blocker Modal Component
 * Displays booking issues that prevent day transitions
 * Allows users to proceed or stay on current day
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronRight } from "lucide-react";
import {
  DayTransitionIssue,
  ISSUE_TYPE_LABELS,
  SEVERITY_ICONS
} from "@/types/day-transition";

interface DayTransitionBlockerModalProps {
  /** Whether the modal is open */
  isOpen: boolean;

  /** List of issues blocking the transition */
  issues: DayTransitionIssue[];

  /** Callback when user clicks "Proceed to Next Day" */
  onProceed: () => void;

  /** Callback when user clicks "Stay on Current Day" */
  onStay: () => void;

  /** Whether the modal is in loading state */
  isLoading?: boolean;
}

export function DayTransitionBlockerModal({
  isOpen,
  issues,
  onProceed,
  onStay,
  isLoading = false
}: DayTransitionBlockerModalProps) {
  // Count issues by severity
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Prevent closing by clicking outside
        if (!open) return;
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <div>
              <DialogTitle className="text-xl">
                Issues Found - Day Transition Blocked
              </DialogTitle>
              <DialogDescription className="mt-2">
                {criticalCount > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    {criticalCount} critical issue
                    {criticalCount !== 1 ? "s" : ""} require
                    {criticalCount === 1 ? "s" : ""} attention.{" "}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    {warningCount} warning{warningCount !== 1 ? "s" : ""} found.
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Issues List */}
        <div className="space-y-3 my-6">
          {issues.map((issue) => (
            <div
              key={issue.reservationId}
              className={`p-4 rounded-lg border-l-4 ${
                issue.severity === "critical"
                  ? "bg-red-50 dark:bg-red-900/20 border-l-red-500"
                  : "bg-yellow-50 dark:bg-yellow-900/20 border-l-yellow-500"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Issue Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">
                      {SEVERITY_ICONS[issue.severity]}
                    </span>
                    <h4
                      className={`font-semibold ${
                        issue.severity === "critical"
                          ? "text-red-900 dark:text-red-200"
                          : "text-yellow-900 dark:text-yellow-200"
                      }`}
                    >
                      {ISSUE_TYPE_LABELS[issue.issueType]}
                    </h4>
                  </div>

                  {/* Guest and Room Info */}
                  <div
                    className={`text-sm mb-2 ${
                      issue.severity === "critical"
                        ? "text-red-800 dark:text-red-300"
                        : "text-yellow-800 dark:text-yellow-300"
                    }`}
                  >
                    <p>
                      <span className="font-medium">Guest:</span>{" "}
                      {issue.guestName}
                    </p>
                    <p>
                      <span className="font-medium">Room:</span>{" "}
                      {issue.roomNumber}
                    </p>
                  </div>

                  {/* Description */}
                  <p
                    className={`text-sm ${
                      issue.severity === "critical"
                        ? "text-red-700 dark:text-red-400"
                        : "text-yellow-700 dark:text-yellow-400"
                    }`}
                  >
                    {issue.description}
                  </p>

                  {/* Additional Info */}
                  {issue.paymentStatus && (
                    <p
                      className={`text-xs mt-2 ${
                        issue.severity === "critical"
                          ? "text-red-600 dark:text-red-500"
                          : "text-yellow-600 dark:text-yellow-500"
                      }`}
                    >
                      Payment Status:{" "}
                      <span className="font-medium">{issue.paymentStatus}</span>
                    </p>
                  )}
                </div>

                {/* Reservation ID */}
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {issue.reservationId.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <span className="font-semibold">What should you do?</span>
            <br />
            You can either resolve these issues before proceeding to the next
            day, or proceed anyway if you&apos;ve already handled them manually.
          </p>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onStay}
            disabled={isLoading}
            className="gap-2"
          >
            Stay on Current Day
          </Button>
          <Button
            onClick={onProceed}
            disabled={isLoading}
            className="gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            Proceed to Next Day
            <ChevronRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
