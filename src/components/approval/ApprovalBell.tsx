"use client";

import React, { useState, useEffect } from "react";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useApprovalBellRefresh } from "@/contexts/ApprovalBellContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ApprovalBellProps {
  className?: string;
}

export function ApprovalBell({ className }: ApprovalBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    approvalRequests,
    isLoading,
    approveRequest,
    rejectRequest,
    refetch
  } = useApprovalRequests({
    status: "PENDING",
    pollInterval: 30000 // Poll every 30 seconds
  });
  const { registerRefresh } = useApprovalBellRefresh();

  // Register the refetch function with the context
  useEffect(() => {
    registerRefresh(refetch);
  }, [refetch, registerRefresh]);

  const pendingCount = approvalRequests.filter(
    (req) => req.status === "PENDING"
  ).length;

  const handleApprove = async (requestId: string) => {
    try {
      await approveRequest(requestId, "Approved");
      toast.success("Approval request approved");
    } catch (error) {
      toast.error(`Failed to approve request: ${error}`);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectRequest(requestId, "Rejected");
      toast.success("Approval request rejected");
    } catch (error) {
      toast.error(`Failed to reject request: ${error}`);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-50",
            className
          )}
          title="Approval Requests"
        >
          <ClockIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />

          {/* Badge for pending count */}
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs z-50"
            >
              {pendingCount > 9 ? "9+" : pendingCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 z-50">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Approval Requests</span>
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} pending</Badge>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : approvalRequests.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No pending approval requests
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2 p-2">
            {approvalRequests.map((request) => (
              <div
                key={request.id}
                className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-2"
              >
                {/* Request Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {request.requestType === "EARLY_CHECKIN"
                        ? "Early Check-in"
                        : request.requestType === "LATE_CHECKOUT"
                        ? "Late Checkout"
                        : "Approval Request"}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Guest: {request.reservation?.guestName || "Unknown"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(request.requestedAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Reason */}
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  {request.requestReason}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                    onClick={() => handleReject(request.id)}
                  >
                    <XCircleIcon className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(request.id)}
                  >
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
