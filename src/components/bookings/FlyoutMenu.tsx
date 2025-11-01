// components/FlyoutMenu.tsx

"use client";

import React, { useState } from "react";
import {
  EyeIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";
import { ReservationStatus } from "@prisma/client";
import { StatusUpdateModal } from "@/components/reservation-status";
import { getOperationalDate } from "@/lib/timezone/day-boundaries";

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
  propertyTimezone?: string; // Property timezone for operational day calculations
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

// Helper function to check if reservation is for today (using operational day boundaries)
const isReservationToday = (
  checkInDate: string,
  checkOutDate: string,
  timezone: string = "UTC"
): boolean => {
  const today = new Date();
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  // Use operational date (6 AM boundary) instead of midnight
  const todayOperationalDate = getOperationalDate(today, timezone);
  const checkInOperationalDate = getOperationalDate(checkIn, timezone);
  const checkOutOperationalDate = getOperationalDate(checkOut, timezone);

  // Check if today falls within the reservation dates (inclusive)
  return (
    todayOperationalDate >= checkInOperationalDate &&
    todayOperationalDate <= checkOutOperationalDate
  );
};

// Helper function to calculate days until check-in (using operational day boundaries)
const getDaysUntilCheckIn = (
  checkInDate: string,
  timezone: string = "UTC"
): number => {
  const today = new Date();
  const checkIn = new Date(checkInDate);

  // Use operational dates (6 AM boundary) instead of midnight
  const todayOperationalDate = getOperationalDate(today, timezone);
  const checkInOperationalDate = getOperationalDate(checkIn, timezone);

  const todayDate = new Date(todayOperationalDate);
  const checkInDateOnly = new Date(checkInOperationalDate);

  const diffTime = checkInDateOnly.getTime() - todayDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

// Helper function to format check-in text
const getCheckInText = (daysUntilCheckIn: number): string => {
  if (daysUntilCheckIn === 1) {
    return "Check in tomorrow";
  } else if (daysUntilCheckIn === 7) {
    return "Check in next week";
  } else if (daysUntilCheckIn <= 7) {
    return `Check-In in ${daysUntilCheckIn} days`;
  } else {
    const weeks = Math.floor(daysUntilCheckIn / 7);
    const days = daysUntilCheckIn % 7;
    if (days === 0) {
      return `Check-In in ${weeks} week${weeks > 1 ? "s" : ""}`;
    }
    return `Check-In in ${weeks} week${weeks > 1 ? "s" : ""} and ${days} day${
      days > 1 ? "s" : ""
    }`;
  }
};

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
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!flyout) return null;

  // Get property timezone for operational day calculations
  const timezone = flyout.reservation.propertyTimezone || "UTC";

  // Determine if reservation is for today (using operational day boundaries)
  const isToday = isReservationToday(
    flyout.reservation.checkIn,
    flyout.reservation.checkOut,
    timezone
  );

  // Calculate days until check-in (using operational day boundaries)
  const daysUntilCheckIn = getDaysUntilCheckIn(
    flyout.reservation.checkIn,
    timezone
  );

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
      style={{ top: flyout.y - 78, left: flyout.x + 20 }}
    >
      <ul>
        {/* Check-in Days Display (Future Reservations Only - Tomorrow and Beyond) */}
        {!isToday && daysUntilCheckIn > 0 && (
          <li className="px-4 py-2 border-b border-gray-200 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium text-xs">
              <ArrowRightIcon className="h-4 w-4" />
              {getCheckInText(daysUntilCheckIn)}
            </div>
          </li>
        )}

        {/* View Details */}
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

        {/* Edit Booking */}
        <li>
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch(
                  `/api/reservations/${flyout.reservation.id}`,
                  {
                    credentials: "include"
                  }
                );
                if (!res.ok) throw new Error("Failed to load reservation");
                const fresh = await res.json();
                setFlyout(null);
                setEditingReservation(fresh);
              } catch (err) {
                console.error(err);
              }
            }}
            className="flex items-center w-full text-left px-4 py-2 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <PencilIcon className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
            Edit Booking
          </button>
        </li>

        {/* TODAY ONLY: Check-In Button (only if not yet checked in) */}
        {(() => {
          const shouldShowCheckIn =
            isToday &&
            flyout.reservation.status !== "IN_HOUSE" &&
            flyout.reservation.status !== "CHECKED_OUT" &&
            handleStatusUpdate;
          return shouldShowCheckIn ? (
            <li>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await handleStatusUpdate(
                      flyout.reservation.id,
                      "IN_HOUSE",
                      "Guest checked in"
                    );
                    // Wait longer for the status update to be processed and cached
                    await new Promise((resolve) => setTimeout(resolve, 1000));

                    // Refresh the reservation data after check-in
                    try {
                      const res = await fetch(
                        `/api/reservations/${flyout.reservation.id}`,
                        {
                          credentials: "include",
                          cache: "no-store"
                        }
                      );
                      if (res.ok) {
                        const fresh = await res.json();
                        // Update the flyout with fresh data - use callback to ensure we get latest state
                        setFlyout((prevFlyout) => {
                          if (!prevFlyout) return null;
                          return {
                            ...prevFlyout,
                            reservation: fresh
                          };
                        });
                      }
                    } catch (error) {
                      console.error("Failed to refresh reservation:", error);
                    }
                  } catch (error) {
                    console.error("Check-in failed:", error);
                  }
                }}
                className="flex items-center w-full text-left px-4 py-2 font-semibold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Check-In
              </button>
            </li>
          ) : null;
        })()}

        {/* TODAY ONLY: Check Out Button (only if guest is checked in) */}
        {isToday && flyout.reservation.status === "IN_HOUSE" && (
          <li>
            <button
              type="button"
              onClick={() => setShowCheckOutConfirm(true)}
              className="flex items-center w-full text-left px-4 py-2 font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Check-Out
            </button>
          </li>
        )}

        {/* Undo Booking (for TODAY's IN_HOUSE) or Cancel Booking (for others) */}
        {isToday && flyout.reservation.status === "IN_HOUSE" ? (
          <li>
            <button
              type="button"
              onClick={async () => {
                try {
                  // Call API directly with isUndoCheckIn flag to bypass normal validation
                  const res = await fetch(
                    `/api/reservations/${flyout.reservation.id}/status`,
                    {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json"
                      },
                      credentials: "include",
                      body: JSON.stringify({
                        newStatus: "CONFIRMED",
                        reason: "Check-in reversed",
                        isUndoCheckIn: true
                      })
                    }
                  );

                  if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || "Failed to undo check-in");
                  }

                  // Refresh the flyout with fresh data
                  const fresh = await fetch(
                    `/api/reservations/${flyout.reservation.id}`,
                    {
                      credentials: "include"
                    }
                  );
                  if (fresh.ok) {
                    const freshData = await fresh.json();
                    setFlyout((prevFlyout) => {
                      if (!prevFlyout) return null;
                      return {
                        ...prevFlyout,
                        reservation: freshData
                      };
                    });
                  }
                } catch (error) {
                  console.error("Undo check-in failed:", error);
                }
              }}
              className="flyout-undo-btn group flex items-center w-full text-left px-4 py-2 font-semibold text-orange-600 hover:bg-orange-600 hover:text-white hover:rounded-b-xl transition-colors"
              style={{
                border: "none !important",
                outline: "none !important",
                boxShadow: "none !important",
                borderRadius: "0 0 12px 12px"
              }}
            >
              <ArrowRightIcon className="h-4 w-4 mr-2 text-orange-600 group-hover:text-white transition-colors rotate-180" />
              Undo Booking
            </button>
          </li>
        ) : (
          <li>
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
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
        )}
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

      {/* Cancel Booking Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirm Cancellation
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to cancel the booking for{" "}
              <span className="font-semibold">
                {flyout.reservation.guestName}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDelete(flyout.reservation.id);
                  setShowCancelConfirm(false);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-medium"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-Out Confirmation Dialog */}
      {showCheckOutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirm Check-Out
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to check out{" "}
              <span className="font-semibold">
                {flyout.reservation.guestName}
              </span>
              ?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCheckOutConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCheckOut(flyout.reservation.id);
                  setShowCheckOutConfirm(false);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium"
              >
                Check-Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlyoutMenu;
