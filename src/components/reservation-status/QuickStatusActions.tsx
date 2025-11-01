"use client";

import React, { useState } from "react";
import { ReservationStatus } from "@prisma/client";
import { ALLOWED_TRANSITIONS, STATUS_CONFIG } from "@/types/reservation-status";
import StatusBadge from "./StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  CheckCircleIcon,
  HomeIcon,
  ArrowRightEndOnRectangleIcon,
  XCircleIcon,
  NoSymbolIcon,
  ChevronDownIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface QuickStatusActionsProps {
  reservation: {
    id: string;
    guestName: string;
    status: ReservationStatus;
    checkIn: string;
    checkOut: string;
  };
  onStatusUpdate: (
    reservationId: string,
    newStatus: ReservationStatus,
    reason: string
  ) => Promise<void>;
  onOpenFullModal?: () => void;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
}

// Quick action configurations
const QUICK_ACTIONS = {
  CONFIRMED: {
    icon: CheckCircleIcon,
    label: "Confirm",
    reason: "Payment received - reservation confirmed",
    variant: "default" as const,
    className: "text-blue-600 hover:text-blue-700"
  },
  IN_HOUSE: {
    icon: HomeIcon,
    label: "Check In",
    reason: "Guest checked in",
    variant: "default" as const,
    className: "text-green-600 hover:text-green-700"
  },
  CHECKOUT_DUE: {
    icon: ClockIcon,
    label: "Checkout Due",
    reason: "Checkout time approaching",
    variant: "default" as const,
    className: "text-amber-600 hover:text-amber-700"
  },
  CHECKED_OUT: {
    icon: ArrowRightEndOnRectangleIcon,
    label: "Check Out",
    reason: "Guest checked out",
    variant: "default" as const,
    className: "text-purple-600 hover:text-purple-700"
  },
  NO_SHOW: {
    icon: NoSymbolIcon,
    label: "No Show",
    reason: "Guest failed to arrive",
    variant: "destructive" as const,
    className: "text-orange-600 hover:text-orange-700"
  },
  CANCELLED: {
    icon: XCircleIcon,
    label: "Cancel",
    reason: "Reservation cancelled",
    variant: "destructive" as const,
    className: "text-red-600 hover:text-red-700"
  }
};

export default function QuickStatusActions({
  reservation,
  onStatusUpdate,
  onOpenFullModal,
  disabled = false,
  size = "sm"
}: QuickStatusActionsProps) {
  const [isUpdating, setIsUpdating] = useState<ReservationStatus | null>(null);

  // Get allowed transitions for current status
  const allowedTransitions = ALLOWED_TRANSITIONS[reservation.status] || [];

  // Filter quick actions to only show allowed transitions
  const availableQuickActions = allowedTransitions
    .filter((status) => status in QUICK_ACTIONS)
    .map((status) => ({
      status,
      ...QUICK_ACTIONS[status as keyof typeof QUICK_ACTIONS]
    }));

  // Handle quick status update
  const handleQuickUpdate = async (
    newStatus: ReservationStatus,
    reason: string
  ) => {
    if (disabled || isUpdating) return;

    setIsUpdating(newStatus);
    try {
      await onStatusUpdate(reservation.id, newStatus, reason);
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`);
    } catch (error) {
      console.error("Quick status update error:", error);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(null);
    }
  };

  // Size configurations
  const sizeConfig = {
    default: {
      button: "h-9 px-3 text-sm",
      icon: "h-4 w-4",
      dropdown: "min-w-[160px]"
    },
    sm: {
      button: "h-8 px-2 text-xs",
      icon: "h-3 w-3",
      dropdown: "min-w-[140px]"
    },
    lg: {
      button: "h-10 px-4 text-base",
      icon: "h-5 w-5",
      dropdown: "min-w-[180px]"
    },
    icon: {
      button: "h-8 w-8 p-0",
      icon: "h-4 w-4",
      dropdown: "min-w-[140px]"
    }
  };

  const config = sizeConfig[size];

  // If no quick actions available, show full modal button
  if (availableQuickActions.length === 0) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={onOpenFullModal}
        disabled={disabled}
        className={config.button}
      >
        <ClockIcon className={`${config.icon} mr-2`} />
        Update Status
      </Button>
    );
  }

  // If only one action available, show as direct button
  if (availableQuickActions.length === 1) {
    const action = availableQuickActions[0];
    const IconComponent = action.icon;
    const isLoading = isUpdating === action.status;

    return (
      <Button
        variant="outline"
        size={size}
        onClick={() => handleQuickUpdate(action.status, action.reason)}
        disabled={disabled || isLoading}
        className={`${config.button} ${action.className}`}
      >
        {isLoading ? (
          <ClockIcon className={`${config.icon} mr-2 animate-spin`} />
        ) : (
          <IconComponent className={`${config.icon} mr-2`} />
        )}
        {isLoading ? "Updating..." : action.label}
      </Button>
    );
  }

  // Multiple actions available - show dropdown
  const PrimaryActionIcon = availableQuickActions[0].icon;

  return (
    <div className="flex items-center gap-1">
      {/* Primary action button */}
      <Button
        variant="outline"
        size={size}
        onClick={() =>
          handleQuickUpdate(
            availableQuickActions[0].status,
            availableQuickActions[0].reason
          )
        }
        disabled={disabled || isUpdating === availableQuickActions[0].status}
        className={`${config.button} ${availableQuickActions[0].className} rounded-r-none border-r-0`}
      >
        {isUpdating === availableQuickActions[0].status ? (
          <ClockIcon className={`${config.icon} mr-2 animate-spin`} />
        ) : (
          <PrimaryActionIcon className={`${config.icon} mr-2`} />
        )}
        {isUpdating === availableQuickActions[0].status
          ? "Updating..."
          : availableQuickActions[0].label}
      </Button>

      {/* Dropdown for additional actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            disabled={disabled || !!isUpdating}
            className={`${config.button} rounded-l-none border-l-0 px-2`}
          >
            <ChevronDownIcon className={config.icon} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={config.dropdown}>
          <DropdownMenuLabel className="flex items-center gap-2">
            <StatusBadge status={reservation.status} size="sm" />
            Quick Actions
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {availableQuickActions.slice(1).map((action) => {
            const IconComponent = action.icon;
            const isLoading = isUpdating === action.status;

            return (
              <DropdownMenuItem
                key={action.status}
                onClick={() => handleQuickUpdate(action.status, action.reason)}
                disabled={disabled || isLoading}
                className={`${action.className} cursor-pointer`}
              >
                <div className="flex items-center gap-2 w-full">
                  {isLoading ? (
                    <ClockIcon className={`${config.icon} animate-spin`} />
                  ) : (
                    <IconComponent className={config.icon} />
                  )}
                  <span>{isLoading ? "Updating..." : action.label}</span>
                  <div className="ml-auto">
                    <StatusBadge
                      status={action.status}
                      size="sm"
                      showIcon={false}
                      showLabel={false}
                      className="w-2 h-2 rounded-full"
                    />
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onOpenFullModal}
            disabled={disabled}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ClockIcon className={config.icon} />
              <span>More Options...</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Export individual quick action button for specific use cases
export function QuickActionButton({
  status,
  reservation,
  onStatusUpdate,
  disabled = false,
  size = "default"
}: {
  status: ReservationStatus;
  reservation: QuickStatusActionsProps["reservation"];
  onStatusUpdate: QuickStatusActionsProps["onStatusUpdate"];
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const action = QUICK_ACTIONS[status as keyof typeof QUICK_ACTIONS];
  if (!action) return null;

  const allowedTransitions = ALLOWED_TRANSITIONS[reservation.status] || [];
  if (!allowedTransitions.includes(status)) return null;

  const sizeConfig = {
    default: { button: "h-9 px-3 text-sm", icon: "h-4 w-4" },
    sm: { button: "h-8 px-2 text-xs", icon: "h-3 w-3" },
    lg: { button: "h-10 px-4 text-base", icon: "h-5 w-5" },
    icon: { button: "h-8 w-8 p-0", icon: "h-4 w-4" }
  };

  const config = sizeConfig[size];
  const IconComponent = action.icon;

  const handleUpdate = async () => {
    if (disabled || isUpdating) return;

    setIsUpdating(true);
    try {
      await onStatusUpdate(reservation.id, status, action.reason);
      toast.success(`Status updated to ${STATUS_CONFIG[status].label}`);
    } catch (error) {
      console.error("Quick action error:", error);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Button
      variant={action.variant}
      size={size}
      onClick={handleUpdate}
      disabled={disabled || isUpdating}
      className={`${config.button} ${action.className}`}
    >
      {isUpdating ? (
        <ClockIcon className={`${config.icon} mr-2 animate-spin`} />
      ) : (
        <IconComponent className={`${config.icon} mr-2`} />
      )}
      {isUpdating ? "Updating..." : action.label}
    </Button>
  );
}
