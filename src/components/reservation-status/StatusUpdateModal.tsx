"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ReservationStatus } from "@prisma/client";
import { ALLOWED_TRANSITIONS, STATUS_CONFIG } from "@/types/reservation-status";
import StatusBadge from "./StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// Form validation schema
const statusUpdateSchema = z.object({
  newStatus: z.nativeEnum(ReservationStatus),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(500, "Reason must be less than 500 characters"),
  requiresApproval: z.boolean().optional()
});

type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: {
    id: string;
    guestName: string;
    roomNumber?: string;
    checkIn: string;
    checkOut: string;
    status: ReservationStatus;
    paymentStatus?: string;
  };
  currentUserRole?: string;
  onStatusUpdate?: (
    reservationId: string,
    newStatus: ReservationStatus,
    reason: string
  ) => Promise<void>;
}

// Critical status changes that require manager approval
const CRITICAL_TRANSITIONS = [
  "CONFIRMED_TO_CANCELLED",
  "IN_HOUSE_TO_CANCELLED",
  "NO_SHOW_TO_CONFIRMED"
];

// Status transitions that require payment validation
const PAYMENT_REQUIRED_TRANSITIONS = [
  "CONFIRMATION_PENDING_TO_CONFIRMED",
  "NO_SHOW_TO_CONFIRMED"
];

export default function StatusUpdateModal({
  isOpen,
  onClose,
  reservation,
  currentUserRole = "FRONT_DESK",
  onStatusUpdate
}: StatusUpdateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedStatus, setSelectedStatus] =
    useState<ReservationStatus | null>(null);

  const form = useForm<StatusUpdateFormData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      newStatus: reservation.status,
      reason: "",
      requiresApproval: false
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = form;
  const watchedStatus = watch("newStatus");

  // Get allowed transitions for current status
  const allowedTransitions = ALLOWED_TRANSITIONS[reservation.status] || [];

  // Check if transition requires approval
  const requiresApproval = (
    fromStatus: ReservationStatus,
    toStatus: ReservationStatus
  ): boolean => {
    const transitionKey = `${fromStatus}_TO_${toStatus}`;
    return (
      CRITICAL_TRANSITIONS.includes(transitionKey) &&
      currentUserRole !== "PROPERTY_MGR"
    );
  };

  // Check if transition requires payment validation
  const requiresPaymentValidation = (
    fromStatus: ReservationStatus,
    toStatus: ReservationStatus
  ): boolean => {
    const transitionKey = `${fromStatus}_TO_${toStatus}`;
    return PAYMENT_REQUIRED_TRANSITIONS.includes(transitionKey);
  };

  // Get transition warning message
  const getTransitionWarning = (
    fromStatus: ReservationStatus,
    toStatus: ReservationStatus
  ): string | null => {
    if (toStatus === "CANCELLED") {
      return "Cancelling this reservation may affect revenue and require refund processing.";
    }
    if (toStatus === "NO_SHOW") {
      return "Marking as No-Show will retain the deposit and make the room available.";
    }
    if (fromStatus === "NO_SHOW" && toStatus === "CONFIRMED") {
      return "Reactivating a No-Show reservation requires manager approval and payment verification.";
    }
    return null;
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset({
        newStatus: reservation.status,
        reason: "",
        requiresApproval: false
      });
      setShowConfirmation(false);
      setSelectedStatus(null);
    }
  }, [isOpen, reservation.status, reset]);

  // Handle status selection
  const handleStatusChange = (status: ReservationStatus) => {
    setValue("newStatus", status);
    setSelectedStatus(status);

    // Check if this transition requires approval
    const needsApproval = requiresApproval(reservation.status, status);
    setValue("requiresApproval", needsApproval);
  };

  // Handle form submission
  const onSubmit = async (data: StatusUpdateFormData) => {
    if (data.newStatus === reservation.status) {
      toast.error("Please select a different status");
      return;
    }

    // Show confirmation for critical changes
    const warning = getTransitionWarning(reservation.status, data.newStatus);
    if (warning && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setIsSubmitting(true);
    try {
      if (onStatusUpdate) {
        await onStatusUpdate(reservation.id, data.newStatus, data.reason);
        toast.success(
          `Status updated to ${STATUS_CONFIG[data.newStatus].label}`
        );
        onClose();
      }
    } catch (error) {
      console.error("Status update error:", error);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };

  const currentWarning = selectedStatus
    ? getTransitionWarning(reservation.status, selectedStatus)
    : null;
  const needsApproval = selectedStatus
    ? requiresApproval(reservation.status, selectedStatus)
    : false;
  const needsPaymentValidation = selectedStatus
    ? requiresPaymentValidation(reservation.status, selectedStatus)
    : false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-purple-600" />
            Update Reservation Status
          </DialogTitle>
          <DialogDescription>
            Update the status for {reservation.guestName}&apos;s reservation
            {reservation.roomNumber && ` in Room ${reservation.roomNumber}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Current Status Display */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Current Status
              </Label>
              <div className="mt-1">
                <StatusBadge status={reservation.status} size="md" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Check-in: {new Date(reservation.checkIn).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Check-out: {new Date(reservation.checkOut).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="newStatus">New Status *</Label>
            <Select onValueChange={handleStatusChange} value={watchedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {allowedTransitions.map((status) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={status}
                        size="sm"
                        showLabel={false}
                      />
                      <span>{STATUS_CONFIG[status].label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.newStatus && (
              <p className="text-sm text-red-600">{errors.newStatus.message}</p>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Status Change *</Label>
            <Textarea
              {...register("reason")}
              placeholder="Please provide a reason for this status change..."
              className="min-h-[80px]"
            />
            {errors.reason && (
              <p className="text-sm text-red-600">{errors.reason.message}</p>
            )}
          </div>

          {/* Warnings and Notifications */}
          {currentWarning && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Important Notice
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {currentWarning}
                </p>
              </div>
            </div>
          )}

          {needsApproval && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <ShieldCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Manager Approval Required
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  This status change requires manager approval and will be
                  queued for review.
                </p>
              </div>
            </div>
          )}

          {needsPaymentValidation && (
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Payment Validation
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Payment status will be automatically verified before
                  confirming this change.
                </p>
              </div>
            </div>
          )}

          {/* Confirmation Dialog */}
          {showConfirmation && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h4 className="font-medium text-red-800 dark:text-red-200">
                  Confirm Status Change
                </h4>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                Are you sure you want to change the status to{" "}
                <strong>
                  {selectedStatus && STATUS_CONFIG[selectedStatus].label}
                </strong>
                ? This action cannot be easily undone.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {showConfirmation ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Confirm Change"
                  )}
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !selectedStatus ||
                  selectedStatus === reservation.status
                }
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : needsApproval ? (
                  "Submit for Approval"
                ) : (
                  "Update Status"
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
