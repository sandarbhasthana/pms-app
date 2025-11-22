"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useApprovalBellRefresh } from "@/contexts/ApprovalBellContext";
import { useChat } from "@/contexts/ChatContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircleIcon,
  XCircleIcon,
  BellIcon
} from "@heroicons/react/24/outline";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UnifiedNotificationBellProps {
  className?: string;
}

export function UnifiedNotificationBell({
  className
}: UnifiedNotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("approvals");

  // Approval requests
  const {
    approvalRequests,
    isLoading: isLoadingApprovals,
    approveRequest,
    rejectRequest,
    refetch
  } = useApprovalRequests({
    status: "PENDING",
    pollInterval: 30000
  });
  const { registerRefresh } = useApprovalBellRefresh();

  // Chat unread count
  const { totalUnreadCount: chatUnreadCount, rooms } = useChat();

  // Register the refetch function with the context
  useEffect(() => {
    registerRefresh(refetch);
  }, [refetch, registerRefresh]);

  const pendingApprovalsCount = approvalRequests.filter(
    (req) => req.status === "PENDING"
  ).length;

  // Total notification count
  const totalNotificationCount = pendingApprovalsCount + chatUnreadCount;

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

  const handleChatRoomClick = (roomId: string) => {
    setIsOpen(false);
    router.push(`/teams?room=${roomId}`);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative p-3 rounded-full hover:bg-purple-300 dark:hover:bg-[#ab2aea] transition-colors z-50",
            className
          )}
          title="Notifications"
        >
          <BellIcon className="h-6 w-6 !text-gray-800 dark:!text-[#f0f8f9] scale-140 cursor-pointer" />

          {/* Status Dots - Red/Orange for messages, Green for approvals */}
          {chatUnreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 z-50" />
          )}
          {pendingApprovalsCount > 0 && chatUnreadCount === 0 && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 z-50" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 z-50">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {totalNotificationCount > 0 && (
            <Badge variant="secondary">{totalNotificationCount} total</Badge>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="approvals" className="relative">
              Approvals
            </TabsTrigger>
            <TabsTrigger value="messages" className="relative">
              Messages
              {chatUnreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-600"
                >
                  {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="mt-2">
            {isLoadingApprovals ? (
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
                        className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
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
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-2">
            {chatUnreadCount === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:!text-[#f0f8f9]">
                No unread messages
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2 p-2">
                {rooms
                  .filter((room) => room.unreadCount && room.unreadCount > 0)
                  .map((room) => (
                    <button
                      type="button"
                      key={room.id}
                      onClick={() => handleChatRoomClick(room.id)}
                      className="w-full p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                            <p className="text-base font-medium text-gray-900 dark:!text-[#f0f8f9] truncate">
                              {room.lastMessage?.sender.name || room.name}
                            </p>
                          </div>
                          {room.lastMessage && (
                            <p className="text-xs text-gray-600 dark:!text-[#f0f8f9] truncate ml-6">
                              {room.lastMessage.content}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge
                            variant="destructive"
                            className="h-5 min-w-[20px] px-1 flex items-center justify-center text-xs bg-red-600 hover:bg-red-700"
                          >
                            {(room.unreadCount ?? 0) > 9
                              ? "9+"
                              : room.unreadCount ?? 0}
                          </Badge>
                          {room.lastMessageAt && (
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {new Date(room.lastMessageAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                }
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
