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

// Helper function to check if reservation is for today
const isReservationToday = (checkInDate: string): boolean => {
  const today = new Date();
  const checkIn = new Date(checkInDate);

  return (
    today.getFullYear() === checkIn.getFullYear() &&
    today.getMonth() === checkIn.getMonth() &&
    today.getDate() === checkIn.getDate()
  );
};

// Helper function to calculate days until check-in
const getDaysUntilCheckIn = (checkInDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkIn = new Date(checkInDate);
  checkIn.setHours(0, 0, 0, 0);

  const diffTime = checkIn.getTime() - today.getTime();
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

  if (!flyout) return null;

  // Determine if reservation is for today
  const isToday = isReservationToday(flyout.reservation.checkIn);

  // Calculate days until check-in
  const daysUntilCheckIn = getDaysUntilCheckIn(flyout.reservation.checkIn);

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
              onClick={() => handleCheckOut(flyout.reservation.id)}
              className="flex items-center w-full text-left px-4 py-2 font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Check-Out
            </button>
          </li>
        )}

        {/* Undo Booking (for IN_HOUSE) or Cancel Booking (for others) */}
        {flyout.reservation.status === "IN_HOUSE" ? (
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
    </div>
  );
};

export default FlyoutMenu;
