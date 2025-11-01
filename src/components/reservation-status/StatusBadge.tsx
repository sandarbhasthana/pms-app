"use client";

import React from "react";
import { ReservationStatus } from "@prisma/client";
import {
  getStatusConfig,
  getStatusClasses
} from "@/lib/reservation-status/utils";
import {
  ClockIcon,
  CheckCircleIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
  XCircleIcon,
  NoSymbolIcon,
  CalendarDaysIcon
} from "@heroicons/react/24/outline";

interface StatusBadgeProps {
  status: ReservationStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
  showIcon = true,
  showLabel = true,
  className = ""
}) => {
  const config = getStatusConfig(status);
  const classes = getStatusClasses(status);

  // Icon mapping
  const iconMap = {
    clock: ClockIcon,
    "check-circle": CheckCircleIcon,
    "calendar-check": CalendarDaysIcon,
    home: HomeIcon,
    logout: ArrowRightOnRectangleIcon,
    "x-circle": XCircleIcon,
    ban: NoSymbolIcon
  };

  const IconComponent =
    iconMap[config.icon as keyof typeof iconMap] || ClockIcon;

  // Size classes
  const sizeClasses = {
    sm: {
      container: "px-2 py-1 text-xs",
      icon: "h-3 w-3",
      gap: "gap-1"
    },
    md: {
      container: "px-2.5 py-1.5 text-sm",
      icon: "h-4 w-4",
      gap: "gap-1.5"
    },
    lg: {
      container: "px-3 py-2 text-base",
      icon: "h-5 w-5",
      gap: "gap-2"
    }
  };

  const sizeClass = sizeClasses[size];

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${classes.badge}
        ${sizeClass.container}
        ${showIcon && showLabel ? sizeClass.gap : ""}
        ${className}
      `}
      title={config.description}
    >
      {showIcon && (
        <IconComponent className={`${sizeClass.icon} ${classes.text}`} />
      )}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

export default StatusBadge;
