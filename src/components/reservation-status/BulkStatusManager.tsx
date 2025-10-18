"use client";

import React, { useState, useMemo } from "react";
import { ReservationStatus } from "@prisma/client";
import { useBulkStatusUpdate } from "@/hooks/useStatusUpdate";
import { StatusBadge, StatusFilter } from "@/components/reservation-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface Reservation {
  id: string;
  guestName: string;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
  paymentStatus?: string;
}

interface BulkStatusManagerProps {
  reservations: Reservation[];
  onReservationsUpdate?: (updatedReservations: Reservation[]) => void;
  onClose?: () => void;
}

export default function BulkStatusManager({
  reservations,
  onReservationsUpdate,
  onClose
}: BulkStatusManagerProps) {
  const [selectedReservations, setSelectedReservations] = useState<Set<string>>(
    new Set()
  );
  const [targetStatus, setTargetStatus] = useState<ReservationStatus | "">("");
  const [bulkReason, setBulkReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { updateMultipleStatuses, isUpdating, progress, errors } =
    useBulkStatusUpdate({
      onSuccess: (reservationId, newStatus) => {
        // Update local state without useEffect
        if (onReservationsUpdate) {
          const updatedReservations = reservations.map((res) =>
            res.id === reservationId ? { ...res, status: newStatus } : res
          );
          onReservationsUpdate(updatedReservations);
        }
      },
      showToast: false // We'll handle toasts manually for bulk operations
    });

  // Filter reservations based on status filter - using useMemo instead of useEffect
  const filteredReservations = useMemo(() => {
    if (statusFilter.length === 0) return reservations;
    return reservations.filter((res) => statusFilter.includes(res.status));
  }, [reservations, statusFilter]);

  // Calculate selection statistics - using useMemo instead of useEffect
  const selectionStats = useMemo(() => {
    const selected = Array.from(selectedReservations);
    const selectedReservationData = filteredReservations.filter((res) =>
      selected.includes(res.id)
    );

    const statusCounts = selectedReservationData.reduce((acc, res) => {
      acc[res.status] = (acc[res.status] || 0) + 1;
      return acc;
    }, {} as Record<ReservationStatus, number>);

    return {
      total: selected.length,
      statusCounts,
      selectedReservations: selectedReservationData
    };
  }, [selectedReservations, filteredReservations]);

  // Handle individual reservation selection
  const handleReservationToggle = (reservationId: string) => {
    const newSelection = new Set(selectedReservations);
    if (newSelection.has(reservationId)) {
      newSelection.delete(reservationId);
    } else {
      newSelection.add(reservationId);
    }
    setSelectedReservations(newSelection);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedReservations.size === filteredReservations.length) {
      setSelectedReservations(new Set());
    } else {
      setSelectedReservations(
        new Set(filteredReservations.map((res) => res.id))
      );
    }
  };

  // Handle bulk status update
  const handleBulkUpdate = async () => {
    if (!targetStatus || selectedReservations.size === 0) {
      toast.error("Please select reservations and target status");
      return;
    }

    if (!bulkReason.trim()) {
      toast.error("Please provide a reason for the bulk status update");
      return;
    }

    setShowConfirmDialog(false);

    const updates = Array.from(selectedReservations).map((reservationId) => ({
      reservationId,
      newStatus: targetStatus as ReservationStatus,
      reason: bulkReason
    }));

    const result = await updateMultipleStatuses(updates);

    // Handle results
    if (result.errorCount === 0) {
      toast.success(`Successfully updated ${result.successCount} reservations`);
      setSelectedReservations(new Set());
      setTargetStatus("");
      setBulkReason("");
    } else if (result.successCount === 0) {
      toast.error(`Failed to update all ${result.errorCount} reservations`);
    } else {
      toast.success(
        `Updated ${result.successCount} reservations (${result.errorCount} failed)`
      );
    }
  };

  // Validate bulk operation
  const canPerformBulkUpdate = useMemo(() => {
    return (
      selectedReservations.size > 0 &&
      targetStatus &&
      bulkReason.trim().length > 0 &&
      !isUpdating
    );
  }, [selectedReservations.size, targetStatus, bulkReason, isUpdating]);

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bulk Status Management</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {filteredReservations.length} reservations
              </Badge>
              <Badge variant="secondary">
                {selectedReservations.size} selected
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isUpdating}
              >
                {selectedReservations.size === filteredReservations.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>

              <StatusFilter
                selectedStatuses={statusFilter}
                onStatusChange={setStatusFilter}
                showLabel={false}
              />
            </div>

            {onClose && (
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selection Summary */}
      {selectedReservations.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(selectionStats.statusCounts).map(
                ([status, count]) => (
                  <div key={status} className="flex items-center gap-2">
                    <StatusBadge
                      status={status as ReservationStatus}
                      size="sm"
                    />
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Action Controls */}
      {selectedReservations.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Status Update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Target Status
                </label>
                <Select
                  value={targetStatus}
                  onValueChange={(value) =>
                    setTargetStatus(value as ReservationStatus | "")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ReservationStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={status} size="sm" />
                          <span>{status.replace("_", " ")}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason (Required)
                </label>
                <Textarea
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="Enter reason for bulk status update..."
                  className="min-h-[80px]"
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {bulkReason.length}/500 characters
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                This will update {selectedReservations.size} reservation(s)
              </div>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!canPerformBulkUpdate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Update Selected Reservations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Indicator */}
      {isUpdating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              Updating Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress
                value={(progress.completed / progress.total) * 100}
                className="w-full"
              />
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ClockIcon className="h-4 w-4" />
                {progress.completed} of {progress.total} completed
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Summary */}
      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircleIcon className="h-5 w-5" />
              Update Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <XCircleIcon className="h-4 w-4 text-red-500" />
                  <span>
                    Reservation {error.reservationId}: {error.error}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reservations List */}
      <Card>
        <CardHeader>
          <CardTitle>Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredReservations.map((reservation) => (
              <div
                key={reservation.id}
                className={`flex items-center gap-4 p-3 rounded-lg border ${
                  selectedReservations.has(reservation.id)
                    ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                }`}
              >
                <Checkbox
                  checked={selectedReservations.has(reservation.id)}
                  onCheckedChange={() =>
                    handleReservationToggle(reservation.id)
                  }
                  disabled={isUpdating}
                />

                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div>
                    <div className="font-medium">{reservation.guestName}</div>
                    <div className="text-sm text-gray-500">
                      Room {reservation.roomNumber || "N/A"}
                    </div>
                  </div>

                  <div className="text-sm">
                    <div>
                      Check-in:{" "}
                      {new Date(reservation.checkIn).toLocaleDateString()}
                    </div>
                    <div>
                      Check-out:{" "}
                      {new Date(reservation.checkOut).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <StatusBadge status={reservation.status} size="sm" />
                  </div>

                  <div className="text-sm">
                    {reservation.paymentStatus && (
                      <Badge variant="outline" className="text-xs">
                        {reservation.paymentStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              Confirm Bulk Status Update
            </DialogTitle>
            <DialogDescription>
              You are about to update {selectedReservations.size} reservation(s)
              to <strong>{targetStatus?.replace("_", " ")}</strong> status.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="text-sm font-medium mb-2">Reason:</div>
              <div className="text-sm text-gray-600">{bulkReason}</div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpdate}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
