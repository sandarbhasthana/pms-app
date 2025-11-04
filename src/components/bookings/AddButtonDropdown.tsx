// components/bookings/AddButtonDropdown.tsx
"use client";

import React, { useRef, useEffect } from "react";
import { CalendarIcon, LockClosedIcon } from "@heroicons/react/24/outline";

interface AddButtonDropdownProps {
  position: { x: number; y: number };
  onClose: () => void;
  onAddReservation: () => void;
  onBlockDates: () => void;
}

const AddButtonDropdown: React.FC<AddButtonDropdownProps> = ({
  position,
  onClose,
  onAddReservation,
  onBlockDates
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const left = position.x - 15;
  const top = position.y - 80; // 5px below the button

  return (
    <div
      ref={dropdownRef}
      className="absolute bg-white dark:bg-[#2a3441] text-gray-900 dark:text-white rounded-xl shadow-2xl border-2 border-gray-300 dark:border-purple-500 z-50 text-sm min-w-[220px]"
      style={{ top, left }}
    >
      <ul>
        {/* Add New Reservation */}
        <li>
          <button
            type="button"
            onClick={() => {
              onAddReservation();
              onClose();
            }}
            className="flex items-center w-full text-left px-4 py-3 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-xl"
          >
            <CalendarIcon className="h-5 w-5 mr-3 text-blue-600 dark:text-blue-400" />
            Add New Reservation
          </button>
        </li>

        {/* Block Dates */}
        <li className="border-t border-gray-200 dark:border-gray-600">
          <button
            type="button"
            onClick={() => {
              onBlockDates();
              onClose();
            }}
            className="flex items-center w-full text-left px-4 py-3 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-xl"
          >
            <LockClosedIcon className="h-5 w-5 mr-3 text-red-600 dark:text-red-400" />
            Block Dates
          </button>
        </li>
      </ul>
    </div>
  );
};

export default AddButtonDropdown;
