// File: src/components/notifications/NotificationStream.tsx

"use client";

import React from "react";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X
} from "lucide-react";
import {
  useNotificationStream,
  NotificationStreamMessage
} from "@/lib/hooks/useNotificationStream";
import { cn } from "@/lib/utils";

interface NotificationStreamProps {
  organizationId?: string;
  propertyId?: string;
  showConnectionStatus?: boolean;
  enableToasts?: boolean;
  className?: string;
}

/**
 * NotificationStream component handles real-time notifications
 * and displays them as toast notifications or in a notification center
 */
export function NotificationStream({
  organizationId,
  propertyId,
  showConnectionStatus = false,
  enableToasts = true,
  className
}: NotificationStreamProps) {
  const {
    isConnected,
    isConnecting,
    error,
    lastMessage,
    connectionCount,
    reconnect
  } = useNotificationStream({
    organizationId,
    propertyId,
    onNotification: (notification) => {
      if (enableToasts) {
        showNotificationToast(notification);
      }
    },
    onConnect: () => {
      if (connectionCount > 1) {
        toast.success("Reconnected to notifications", {
          duration: 2000,
          icon: <CheckCircle className="h-4 w-4" />
        });
      }
    },
    onDisconnect: () => {
      toast.error("Disconnected from notifications", {
        duration: 3000,
        icon: <AlertCircle className="h-4 w-4" />
      });
    },
    onError: () => {
      toast.error("Notification connection error", {
        duration: 3000,
        icon: <AlertTriangle className="h-4 w-4" />
      });
    }
  });

  // Show notification toast based on priority and type
  const showNotificationToast = (notification: NotificationStreamMessage) => {
    if (notification.type !== "notification") return;

    const { priority, subject, message, eventType } = notification;
    const icon = getNotificationIcon(eventType || "", priority || "");
    const duration = getPriorityDuration(priority || "");

    toast(subject || "New Notification", {
      description: message,
      duration,
      icon,
      action: {
        label: "Dismiss",
        onClick: () => {} // Toast will auto-dismiss
      },
      className: cn("group", getPriorityClassName(priority || ""))
    });
  };

  // Get appropriate icon for notification type
  const getNotificationIcon = (eventType: string, priority: string) => {
    if (priority === "IMMEDIATE") {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }

    switch (eventType) {
      case "ROOM_SERVICE_REQUEST":
      case "MAINTENANCE_REQUEST":
        return <Bell className="h-4 w-4 text-blue-500" />;
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "PAYMENT_FAILED":
      case "PAYMENT_OVERDUE":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "RESERVATION_CONFIRMED":
      case "GUEST_CHECKED_IN":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "RESERVATION_CANCELLED":
      case "GUEST_NO_SHOW":
        return <X className="h-4 w-4 text-orange-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Get toast duration based on priority
  const getPriorityDuration = (priority: string): number => {
    switch (priority) {
      case "IMMEDIATE":
        return 10000; // 10 seconds
      case "HIGH":
        return 7000; // 7 seconds
      case "MEDIUM":
        return 5000; // 5 seconds
      case "LOW":
        return 3000; // 3 seconds
      default:
        return 5000;
    }
  };

  // Get CSS class based on priority
  const getPriorityClassName = (priority: string): string => {
    switch (priority) {
      case "IMMEDIATE":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950";
      case "HIGH":
        return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950";
      case "MEDIUM":
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950";
      case "LOW":
        return "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950";
      default:
        return "";
    }
  };

  if (!showConnectionStatus) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {/* Connection Status Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            isConnected
              ? "bg-green-500 animate-pulse"
              : isConnecting
              ? "bg-yellow-500 animate-pulse"
              : "bg-red-500"
          )}
        />
        <span className="text-muted-foreground">
          {isConnected
            ? "Connected"
            : isConnecting
            ? "Connecting..."
            : "Disconnected"}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <button
            type="button"
            onClick={reconnect}
            className="text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Last Message Indicator */}
      {lastMessage && lastMessage.type === "notification" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {getNotificationIcon(
            lastMessage.eventType || "",
            lastMessage.priority || ""
          )}
          <span className="truncate max-w-32">
            {lastMessage.subject || "Notification"}
          </span>
          <span>{new Date(lastMessage.timestamp).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}

/**
 * NotificationBell component for header/navbar
 * Shows notification count and connection status
 */
export function NotificationBell({
  organizationId,
  propertyId,
  className
}: {
  organizationId?: string;
  propertyId?: string;
  className?: string;
}) {
  const [notificationCount, setNotificationCount] = React.useState(0);
  const [hasUnread, setHasUnread] = React.useState(false);

  const { isConnected } = useNotificationStream({
    organizationId,
    propertyId,
    onNotification: (notification) => {
      if (notification.type === "notification") {
        setNotificationCount((prev) => prev + 1);
        setHasUnread(true);

        // Auto-reset count after 30 seconds
        setTimeout(() => {
          setNotificationCount((prev) => Math.max(0, prev - 1));
        }, 30000);
      }
    }
  });

  const handleClick = () => {
    setHasUnread(false);
    setNotificationCount(0);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
        className
      )}
    >
      <Bell
        className={cn(
          "h-5 w-5",
          isConnected ? "text-gray-700 dark:text-gray-300" : "text-gray-400"
        )}
      />

      {/* Notification Badge */}
      {hasUnread && notificationCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          {notificationCount > 9 ? "9+" : notificationCount}
        </span>
      )}

      {/* Connection Status Dot */}
      <div
        className={cn(
          "absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white dark:border-gray-900",
          isConnected ? "bg-green-500" : "bg-red-500"
        )}
      />
    </button>
  );
}
