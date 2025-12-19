// File: src/app/dashboard/bookings/hooks/useReservationActions.ts
"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  handleCreateBooking,
  handleUpdateBooking,
  handleDeleteBooking,
  handleCheckOut
} from "@/lib/bookings/handlers";
import { getOrgIdFromCookies } from "../utils/calendarHelpers";
import type { EditBookingFormData } from "@/components/bookings/edit-tabs/types";

interface UseReservationActionsProps {
  reload: () => Promise<void>;
}

/**
 * Custom hook for reservation CRUD operations
 * Handles create, update, delete, status changes, and check-out
 */
export function useReservationActions({ reload }: UseReservationActionsProps) {
  /**
   * Update reservation status
   */
  const updateStatus = useCallback(
    async (reservationId: string, newStatus: string, reason: string) => {
      try {
        const response = await fetch(
          `/api/reservations/${reservationId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
              newStatus,
              reason,
              updatedBy: "user",
              isAutomatic: false
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update status");
        }

        const data = await response.json();
        toast.success(data.message || "Status updated successfully");

        // Reload calendar to reflect changes
        await reload();
      } catch (error) {
        console.error("Error updating status:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to update status"
        );
        throw error;
      }
    },
    [reload]
  );

  /**
   * Update reservation details
   */
  const updateReservation = useCallback(
    async (reservationId: string, data: Partial<EditBookingFormData>) => {
      const orgId = getOrgIdFromCookies();

      // If data is empty, just refresh the calendar (e.g., after status change or payment)
      if (Object.keys(data).length === 0) {
        try {
          console.log(`🔄 Refreshing calendar after payment/status change...`);
          console.log(`📍 Using orgId: ${orgId}`);
          const timestamp = Date.now();
          const res = await fetch(
            `/api/reservations?orgId=${orgId}&t=${timestamp}`,
            {
              credentials: "include"
            }
          );

          if (!res.ok) {
            throw new Error("Failed to fetch updated reservations");
          }

          await reload();
          return;
        } catch (error) {
          console.error("Error refreshing calendar:", error);
          toast.error("Failed to refresh calendar");
          throw error;
        }
      }

      // Otherwise, update the reservation
      await handleUpdateBooking(reservationId, data, reload);
    },
    [reload]
  );

  /**
   * Delete reservation
   */
  const deleteReservation = useCallback(
    async (reservationId: string) => {
      await handleDeleteBooking(reservationId, reload);
    },
    [reload]
  );

  /**
   * Check out a reservation
   */
  const checkOut = useCallback(
    async (reservationId: string) => {
      await handleCheckOut(reservationId, reload);
    },
    [reload]
  );

  /**
   * Create a new reservation
   */
  const createReservation = useCallback(
    async (bookingData: Record<string, unknown>) => {
      await handleCreateBooking(bookingData, reload);
    },
    [reload]
  );

  return {
    updateStatus,
    updateReservation,
    deleteReservation,
    checkOut,
    createReservation
  };
}

