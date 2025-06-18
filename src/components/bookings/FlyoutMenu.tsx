// components/FlyoutMenu.tsx

"use client";

import React from "react";
import {
  EyeIcon,
  CheckIcon,
  PencilIcon,
  XCircleIcon,
  PencilSquareIcon
} from "@heroicons/react/24/outline";
import ManualPaymentForm from "@/components/payments/ManualPaymentForm";
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
  showAddNote: boolean;
  noteText: string;
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
  handleNoteSave: (id: string, note: string) => void;
  setFlyoutNote: (note: string) => void;
}

const FlyoutMenu: React.FC<FlyoutMenuProps> = ({
  flyout,
  flyoutRef,
  setFlyout,
  setEditingReservation,
  setViewReservation,
  handleCheckOut,
  handleDelete,
  handleNoteSave,
  setFlyoutNote
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
      className="absolute bg-yellow-50 dark:bg-blue-950 text-gray-900 dark:text-white rounded-xl shadow-lg z-50 text-sm"
      style={{ top: flyout.y - 60, left: flyout.x + 20 }}
    >
      <ul>
        <li>
          <button
            onClick={handleViewDetails}
            className="flex items-center w-full text-left px-4 py-2 font-semibold hover:bg-[#f3ddff] hover:text-gray-900 hover:rounded-t-xl"
          >
            <EyeIcon className="h-4 w-4 mr-2 text-orange-600" />
            View Details
          </button>
        </li>
        <li>
          <button
            onClick={() => handleCheckOut(flyout.reservation.id)}
            className="flex items-center w-full text-left px-4 py-2 font-semibold hover:bg-[#f3ddff] hover:text-gray-900"
          >
            <CheckIcon className="h-4 w-4 mr-2 text-green-600" />
            Check Out
          </button>
        </li>
        <li>
          <button
            onClick={() => {
              setEditingReservation(flyout.reservation);
              setFlyout(null);
            }}
            className="flex items-center w-full text-left px-4 py-2 font-semibold hover:bg-[#f3ddff] hover:text-gray-900"
          >
            <PencilIcon className="h-4 w-4 mr-2 text-blue-600" />
            Modify Booking
          </button>
        </li>
        <li>
          <button
            onClick={() => handleDelete(flyout.reservation.id)}
            className="flex items-center w-full text-left px-4 py-2 font-semibold text-red-600 hover:bg-red-100"
          >
            <XCircleIcon className="h-4 w-4 mr-2 text-red-600" />
            Cancel Booking
          </button>
        </li>
        <li>
          <button
            onClick={() =>
              setFlyout((f: FlyoutState | null) =>
                f ? { ...f, showAddNote: !f.showAddNote } : null
              )
            }
            className="flex items-center w-full text-left px-4 py-2 font-semibold hover:bg-[#f3ddff] hover:text-gray-900 rounded-b-xl"
          >
            <PencilSquareIcon className="h-4 w-4 mr-2 text-indigo-600" />
            Add Note
          </button>
        </li>
      </ul>

      {flyout.showAddNote && (
        <div className="px-4 py-2 border-t border-gray-200 space-y-2">
          <textarea
            value={flyout.noteText}
            onChange={(e) => setFlyoutNote(e.target.value)}
            placeholder="Type your note here..."
            className="block w-full h-20 border border-gray-300 rounded p-2 text-sm"
          />
          <button
            onClick={() =>
              handleNoteSave(flyout.reservation.id, flyout.noteText)
            }
            className="mt-1 px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
          >
            Save
          </button>
        </div>
      )}
      {process.env.NEXT_PUBLIC_MANUAL_PAYMENT_MODE === "true" && (
        <div className="border-t border-gray-200 px-4 py-3">
          <ManualPaymentForm reservationId={flyout.reservation.id} />
        </div>
      )}
    </div>
  );
};

export default FlyoutMenu;
