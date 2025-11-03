// components/bookings/CalendarCellFlyout.tsx

"use client";

import React, { useEffect } from "react";
import {
  PlusCircleIcon,
  LockClosedIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

interface CalendarCellFlyoutProps {
  flyout: {
    roomId: string;
    roomName: string;
    date: string;
    x: number;
    y: number;
  } | null;
  flyoutRef: React.RefObject<HTMLDivElement | null>;
  setFlyout: (flyout: CalendarCellFlyoutProps["flyout"]) => void;
  onCreateBooking: (roomId: string, roomName: string, date: string) => void;
  onBlockRoom: (roomId: string, roomName: string, date: string) => void;
  onRoomInfo: (roomId: string, roomName: string) => void;
}

const CalendarCellFlyout: React.FC<CalendarCellFlyoutProps> = ({
  flyout,
  flyoutRef,
  setFlyout,
  onCreateBooking,
  onBlockRoom,
  onRoomInfo
}) => {
  // Close flyout when clicking outside
  useEffect(() => {
    if (!flyout) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        flyoutRef.current &&
        !flyoutRef.current.contains(event.target as Node)
      ) {
        setFlyout(null);
      }
    };

    // Add small delay to prevent immediate close from the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [flyout, flyoutRef, setFlyout]);

  if (!flyout) return null;

  // flyout menu positioning
  const left = flyout.x + 40;
  const top = flyout.y + 20;

  const handleCreateBooking = () => {
    setFlyout(null);
    onCreateBooking(flyout.roomId, flyout.roomName, flyout.date);
  };

  const handleBlockRoom = () => {
    setFlyout(null);
    onBlockRoom(flyout.roomId, flyout.roomName, flyout.date);
  };

  const handleRoomInfo = () => {
    setFlyout(null);
    onRoomInfo(flyout.roomId, flyout.roomName);
  };

  return (
    <div
      ref={flyoutRef}
      className="absolute bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 text-sm min-w-[220px]"
      style={{ top, left }}
    >
      <ul>
        {/* Create Booking */}
        <li>
          <button
            type="button"
            onClick={handleCreateBooking}
            className="flex items-center w-full text-left px-4 py-3 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-xl"
          >
            <PlusCircleIcon className="h-5 w-5 mr-3 text-blue-600 dark:text-blue-400" />
            Create Booking
          </button>
        </li>

        {/* Block Room */}
        <li className="border-t border-gray-200 dark:border-gray-600">
          <button
            type="button"
            onClick={handleBlockRoom}
            className="flex items-center w-full text-left px-4 py-3 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <LockClosedIcon className="h-5 w-5 mr-3 text-orange-600 dark:text-orange-400" />
            Block Room
          </button>
        </li>

        {/* Room Information */}
        <li className="border-t border-gray-200 dark:border-gray-600">
          <button
            type="button"
            onClick={handleRoomInfo}
            className="flex items-center w-full text-left px-4 py-3 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-xl"
          >
            <InformationCircleIcon className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400" />
            Room Information
          </button>
        </li>
      </ul>
    </div>
  );
};

export default CalendarCellFlyout;
