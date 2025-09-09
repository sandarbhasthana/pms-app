// components/FlyoutMenu.tsx

"use client";

import React from "react";
import {
  EyeIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon
} from "@heroicons/react/24/outline";

//import { useSession } from "next-auth/react";

interface Reservation {
  id: string;
  roomId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status?: string;
  ratePlan?: string;
  notes?: string;
  roomNumber?: string;
  paymentStatus?: "PAID" | "PARTIALLY_PAID" | "UNPAID";
}

interface FlyoutState {
  reservation: Reservation;
  x: number;
  y: number;
  showDetails: boolean;
}

interface FlyoutMenuProps {
  flyout: FlyoutState;
  flyoutRef: React.RefObject<HTMLDivElement | null>;
  setFlyout: React.Dispatch<React.SetStateAction<FlyoutState | null>>;
  setEditingReservation: React.Dispatch<
    React.SetStateAction<Reservation | null>
  >;
  setViewReservation: React.Dispatch<React.SetStateAction<Reservation | null>>;
  handleCheckOut: (id: string) => void;
  handleDelete: (id: string) => void;
}

const FlyoutMenu: React.FC<FlyoutMenuProps> = ({
  flyout,
  flyoutRef,
  setFlyout,
  setEditingReservation,
  setViewReservation,
  handleCheckOut,
  handleDelete
}) => {
  //const { data: session } = useSession();

  if (!flyout) return null;

  const handleViewDetails = async () => {
    try {
      const res = await fetch(`/api/reservations/${flyout.reservation.id}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to load reservation");
      const fresh = await res.json();
      setFlyout(null);
      setViewReservation(fresh);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      ref={flyoutRef}
      className="absolute bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 text-sm"
      style={{ top: flyout.y - 60, left: flyout.x + 20 }}
    >
      <ul>
        <li>
          <button
            type="button"
            onClick={handleViewDetails}
            className="flex items-center w-full text-left px-4 py-2 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 hover:rounded-t-xl transition-colors"
          >
            <EyeIcon className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
            View Details
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              setEditingReservation(flyout.reservation);
              setFlyout(null);
            }}
            className="flex items-center w-full text-left px-4 py-2 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <PencilIcon className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
            Edit Booking
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => handleCheckOut(flyout.reservation.id)}
            className="flex items-center w-full text-left px-4 py-2 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <CheckIcon className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
            Check Out
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => handleDelete(flyout.reservation.id)}
            className="flyout-delete-btn group flex items-center w-full text-left px-4 py-2 font-semibold text-red-600 hover:bg-red-600 hover:text-white hover:rounded-b-xl transition-colors"
            style={{
              border: "none !important",
              outline: "none !important",
              boxShadow: "none !important",
              borderRadius: "0 0 12px 12px"
            }}
          >
            <TrashIcon className="h-4 w-4 mr-2 text-red-600 group-hover:text-white transition-colors" />
            Cancel Booking
          </button>
        </li>
      </ul>
    </div>
  );
};

export default FlyoutMenu;
