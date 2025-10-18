// components/FlyoutMenu.tsx

"use client";

import React, { useState } from "react";
import {
  EyeIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon
} from "@heroicons/react/24/outline";
import { ReservationStatus } from "@prisma/client";
import {
  StatusBadge,
  QuickStatusActions,
  StatusUpdateModal
} from "@/components/reservation-status";

//import { useSession } from "next-auth/react";

interface Reservation {
  id: string;
  roomId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status?: ReservationStatus | string;
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
  handleStatusUpdate?: (
    reservationId: string,
    newStatus: ReservationStatus,
    reason: string
  ) => Promise<void>;
}

const FlyoutMenu: React.FC<FlyoutMenuProps> = ({
  flyout,
  flyoutRef,
  setFlyout,
  setEditingReservation,
  setViewReservation,
  handleCheckOut,
  handleDelete,
  handleStatusUpdate
}) => {
  //const { data: session } = useSession();
  const [showStatusModal, setShowStatusModal] = useState(false);

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

        {/* Status Management Section */}
        {flyout.reservation.status && handleStatusUpdate && (
          <>
            <li className="px-4 py-2 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Current Status:
                </span>
                <StatusBadge
                  status={flyout.reservation.status as ReservationStatus}
                  size="sm"
                />
              </div>

              {/* Quick Status Actions */}
              <div className="flex flex-col gap-1">
                <QuickStatusActions
                  reservation={{
                    id: flyout.reservation.id,
                    guestName: flyout.reservation.guestName,
                    checkIn: flyout.reservation.checkIn,
                    checkOut: flyout.reservation.checkOut,
                    status: flyout.reservation.status as ReservationStatus
                  }}
                  onStatusUpdate={handleStatusUpdate}
                  onOpenFullModal={() => {
                    setShowStatusModal(true);
                    setFlyout(null);
                  }}
                  size="sm"
                />

                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(true);
                    setFlyout(null);
                  }}
                  className="flex items-center w-full text-left px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <Cog6ToothIcon className="h-3 w-3 mr-1" />
                  Manage Status
                </button>
              </div>
            </li>
          </>
        )}
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

      {/* Status Update Modal */}
      {showStatusModal && handleStatusUpdate && (
        <StatusUpdateModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          reservation={{
            id: flyout.reservation.id,
            guestName: flyout.reservation.guestName,
            roomNumber: flyout.reservation.roomNumber,
            checkIn: flyout.reservation.checkIn,
            checkOut: flyout.reservation.checkOut,
            status: flyout.reservation.status as ReservationStatus,
            paymentStatus: flyout.reservation.paymentStatus
          }}
          currentUserRole="FRONT_DESK" // This should come from user session
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};

export default FlyoutMenu;
