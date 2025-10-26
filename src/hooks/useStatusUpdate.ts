"use client";

import { useState, useCallback } from "react";
import { ReservationStatus } from "@prisma/client";
import { toast } from "sonner";
import { Reservation } from "@/types";

interface StatusUpdateOptions {
  onSuccess?: (reservationId: string, newStatus: ReservationStatus) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

interface StatusUpdateResult {
  success: boolean;
  reservation?: Reservation;
  message?: string;
  error?: string;
  requiresApproval?: boolean;
  approvalReason?: string;
  approvalRequestId?: string;
}

export function useStatusUpdate(options: StatusUpdateOptions = {}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = useCallback(
    async (
      reservationId: string,
      newStatus: ReservationStatus,
      reason: string,
      isAutomatic: boolean = false
    ): Promise<StatusUpdateResult> => {
      setIsUpdating(true);
      setError(null);

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
              isAutomatic
            })
          }
        );

        const data = await response.json();

        // Handle approval required response (403)
        if (response.status === 403 && data.requiresApproval) {
          // Create approval request
          try {
            const approvalRes = await fetch("/api/approval-requests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                reservationId,
                requestType: "EARLY_CHECKIN",
                requestReason:
                  data.approvalReason ||
                  "Early check-in requires manager approval",
                metadata: {
                  newStatus,
                  reason,
                  timestamp: new Date().toISOString()
                }
              })
            });

            if (approvalRes.ok) {
              const approvalData = await approvalRes.json();

              if (options.showToast !== false) {
                toast.success(
                  "Approval request submitted. Waiting for manager approval."
                );
              }

              return {
                success: false,
                error: data.approvalReason || "Approval required",
                requiresApproval: true,
                approvalReason: data.approvalReason,
                approvalRequestId: approvalData.id
              };
            }
          } catch (approvalError) {
            console.error("Error creating approval request:", approvalError);
          }

          throw new Error(data.approvalReason || "Approval required");
        }

        if (!response.ok) {
          // Build detailed error message from validation details
          let errorMessage = data.error || "Failed to update status";
          if (
            data.details &&
            Array.isArray(data.details) &&
            data.details.length > 0
          ) {
            errorMessage = data.details[0]; // Show first validation error
          }

          // Create error object with isValidationError flag to suppress console logging
          const validationError = new Error(errorMessage);
          Object.defineProperty(validationError, "isValidationError", {
            value: true,
            enumerable: false
          });
          throw validationError;
        }

        // Success handling
        if (options.showToast !== false) {
          toast.success(data.message || `Status updated successfully`);
        }

        if (options.onSuccess) {
          options.onSuccess(reservationId, newStatus);
        }

        return {
          success: true,
          reservation: data.reservation,
          message: data.message
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);

        if (options.showToast !== false) {
          toast.error(errorMessage);
        }

        if (options.onError) {
          options.onError(err instanceof Error ? err : new Error(errorMessage));
        }

        return {
          success: false,
          error: errorMessage
        };
      } finally {
        setIsUpdating(false);
      }
    },
    [options]
  );

  const getReservationStatus = useCallback(async (reservationId: string) => {
    try {
      const response = await fetch(
        `/api/reservations/${reservationId}/status`,
        {
          method: "GET",
          credentials: "include"
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reservation status");
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch status";
      setError(errorMessage);
      throw err;
    }
  }, []);

  return {
    updateStatus,
    getReservationStatus,
    isUpdating,
    error,
    clearError: () => setError(null)
  };
}

// Specialized hook for bulk status updates
export function useBulkStatusUpdate(options: StatusUpdateOptions = {}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [errors, setErrors] = useState<
    Array<{ reservationId: string; error: string }>
  >([]);

  const updateMultipleStatuses = useCallback(
    async (
      updates: Array<{
        reservationId: string;
        newStatus: ReservationStatus;
        reason: string;
      }>
    ) => {
      setIsUpdating(true);
      setProgress({ completed: 0, total: updates.length });
      setErrors([]);

      const results: StatusUpdateResult[] = [];
      const updateErrors: Array<{ reservationId: string; error: string }> = [];

      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];

        try {
          const response = await fetch(
            `/api/reservations/${update.reservationId}/status`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json"
              },
              credentials: "include",
              body: JSON.stringify({
                newStatus: update.newStatus,
                reason: update.reason,
                isAutomatic: false
              })
            }
          );

          const data = await response.json();

          if (!response.ok) {
            // Build detailed error message from validation details
            let errorMessage = data.error || "Failed to update status";
            if (
              data.details &&
              Array.isArray(data.details) &&
              data.details.length > 0
            ) {
              errorMessage = data.details[0]; // Show first validation error
            }

            // Create error object with isValidationError flag to suppress console logging
            const validationError = new Error(errorMessage);
            Object.defineProperty(validationError, "isValidationError", {
              value: true,
              enumerable: false
            });
            throw validationError;
          }

          results.push({
            success: true,
            reservation: data.reservation,
            message: data.message
          });

          if (options.onSuccess) {
            options.onSuccess(update.reservationId, update.newStatus);
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          updateErrors.push({
            reservationId: update.reservationId,
            error: errorMessage
          });

          results.push({
            success: false,
            error: errorMessage
          });
        }

        setProgress({ completed: i + 1, total: updates.length });
      }

      setErrors(updateErrors);
      setIsUpdating(false);

      // Show summary toast
      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      if (options.showToast !== false) {
        if (errorCount === 0) {
          toast.success(`Successfully updated ${successCount} reservations`);
        } else if (successCount === 0) {
          toast.error(`Failed to update all ${errorCount} reservations`);
        } else {
          toast.success(
            `Updated ${successCount} reservations (${errorCount} failed)`
          );
        }
      }

      return {
        results,
        successCount,
        errorCount,
        errors: updateErrors
      };
    },
    [options]
  );

  return {
    updateMultipleStatuses,
    isUpdating,
    progress,
    errors,
    clearErrors: () => setErrors([])
  };
}

// Hook for status validation and business rules
export function useStatusValidation() {
  const validateTransition = useCallback(
    (
      currentStatus: ReservationStatus,
      newStatus: ReservationStatus,
      reservation?: {
        checkIn: string;
        checkOut: string;
        paymentStatus?: string;
      }
    ): { isValid: boolean; reason?: string; warnings?: string[] } => {
      // Import allowed transitions
      const ALLOWED_TRANSITIONS: Record<
        ReservationStatus,
        ReservationStatus[]
      > = {
        CONFIRMATION_PENDING: ["CONFIRMED", "CANCELLED"],
        CONFIRMED: ["IN_HOUSE", "NO_SHOW", "CANCELLED"],
        IN_HOUSE: ["CHECKED_OUT"],
        CHECKED_OUT: [], // Final state
        NO_SHOW: ["CONFIRMED"], // Recovery option
        CANCELLED: ["CONFIRMED"] // Reactivation option
      };

      const allowedTransitions = ALLOWED_TRANSITIONS[currentStatus] || [];

      if (!allowedTransitions.includes(newStatus)) {
        return {
          isValid: false,
          reason: `Cannot change from ${currentStatus} to ${newStatus}`
        };
      }

      const warnings: string[] = [];
      const now = new Date();

      // Business rule validations
      if (reservation) {
        const checkInDate = new Date(reservation.checkIn);
        const checkOutDate = new Date(reservation.checkOut);

        switch (newStatus) {
          case "CONFIRMED":
            if (reservation.paymentStatus === "UNPAID") {
              warnings.push("Payment has not been received yet");
            }
            break;

          case "IN_HOUSE":
            if (now < checkInDate) {
              const daysDiff = Math.ceil(
                (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
              if (daysDiff > 1) {
                return {
                  isValid: false,
                  reason: `Cannot check in ${daysDiff} days before check-in date`
                };
              } else {
                warnings.push("Checking in before scheduled check-in date");
              }
            }
            break;

          case "CHECKED_OUT":
            if (now < checkOutDate) {
              const hoursDiff = Math.ceil(
                (checkOutDate.getTime() - now.getTime()) / (1000 * 60 * 60)
              );
              if (hoursDiff > 24) {
                return {
                  isValid: false,
                  reason:
                    "Cannot check out more than 24 hours before check-out date"
                };
              } else {
                warnings.push("Checking out before scheduled check-out date");
              }
            }
            break;

          case "NO_SHOW":
            if (now <= checkInDate) {
              return {
                isValid: false,
                reason: "Cannot mark as no-show before check-in date has passed"
              };
            }
            break;

          case "CANCELLED":
            if (currentStatus === "CHECKED_OUT") {
              return {
                isValid: false,
                reason: "Cannot cancel a completed reservation"
              };
            }
            warnings.push("Cancellation may require refund processing");
            break;
        }
      }

      return {
        isValid: true,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    },
    []
  );

  return {
    validateTransition
  };
}
