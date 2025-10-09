"use client";

import React, { useState } from "react";
import { ReservationStatus } from "@prisma/client";
import {
  StatusBadge,
  StatusUpdateModal,
  QuickStatusActions,
  QuickActionButton
} from "@/components/reservation-status";
import { useStatusUpdate, useStatusValidation } from "@/hooks/useStatusUpdate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClockIcon,
  UserIcon,
  HomeIcon,
  CogIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// Mock reservation data for testing
const mockReservations = [
  {
    id: "res-001",
    guestName: "John Smith",
    roomNumber: "101",
    checkIn: "2024-01-15",
    checkOut: "2024-01-18",
    status: "CONFIRMATION_PENDING" as ReservationStatus,
    paymentStatus: "UNPAID"
  },
  {
    id: "res-002",
    guestName: "Sarah Johnson",
    roomNumber: "205",
    checkIn: "2024-01-14",
    checkOut: "2024-01-16",
    status: "CONFIRMED" as ReservationStatus,
    paymentStatus: "PAID"
  },
  {
    id: "res-003",
    guestName: "Mike Wilson",
    roomNumber: "302",
    checkIn: "2024-01-13",
    checkOut: "2024-01-15",
    status: "IN_HOUSE" as ReservationStatus,
    paymentStatus: "PAID"
  },
  {
    id: "res-004",
    guestName: "Emily Davis",
    roomNumber: "108",
    checkIn: "2024-01-12",
    checkOut: "2024-01-14",
    status: "CHECKED_OUT" as ReservationStatus,
    paymentStatus: "PAID"
  }
];

export default function StatusManagementTestPage() {
  const [selectedReservation, setSelectedReservation] = useState<
    (typeof mockReservations)[0] | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reservations, setReservations] = useState(mockReservations);

  const { isUpdating } = useStatusUpdate({
    onSuccess: (reservationId, newStatus) => {
      // Update local state
      setReservations((prev) =>
        prev.map((res) =>
          res.id === reservationId ? { ...res, status: newStatus } : res
        )
      );
      setIsModalOpen(false);
    },
    showToast: true
  });

  const { validateTransition } = useStatusValidation();

  // Mock status update function
  const handleStatusUpdate = async (
    reservationId: string,
    newStatus: ReservationStatus,
    reason: string
  ) => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update local state
    setReservations((prev) =>
      prev.map((res) =>
        res.id === reservationId ? { ...res, status: newStatus } : res
      )
    );

    console.log("Status update:", { reservationId, newStatus, reason });
    toast.success(`Status updated to ${newStatus}`);
  };

  const openModal = (reservation: (typeof mockReservations)[0]) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReservation(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <CogIcon className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Status Management System
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Test the new reservation status management components with real-time
            updates, validation, and user-friendly interfaces.
          </p>
        </div>

        {/* Status Badge Showcase */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-800">Demo</Badge>
              Status Badge Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.values(ReservationStatus).map((status) => (
                <div key={status} className="text-center space-y-2">
                  <StatusBadge status={status} size="md" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {status.replace("_", " ")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reservations List with Status Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-purple-600" />
              Reservation Status Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  {/* Reservation Info */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <HomeIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {reservation.roomNumber}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {reservation.guestName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          Check-in:{" "}
                          {new Date(reservation.checkIn).toLocaleDateString()}
                        </span>
                        <span>
                          Check-out:{" "}
                          {new Date(reservation.checkOut).toLocaleDateString()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {reservation.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center gap-4">
                    <StatusBadge status={reservation.status} size="md" />

                    {/* Quick Actions */}
                    <QuickStatusActions
                      reservation={reservation}
                      onStatusUpdate={handleStatusUpdate}
                      onOpenFullModal={() => openModal(reservation)}
                      disabled={isUpdating}
                      size="sm"
                    />

                    {/* Full Modal Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openModal(reservation)}
                      disabled={isUpdating}
                    >
                      <ClockIcon className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Individual Quick Action Buttons Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Quick Action Buttons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {reservations.map((reservation) => (
                <div key={reservation.id} className="space-y-3">
                  <div className="text-center">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {reservation.guestName}
                    </h4>
                    <StatusBadge status={reservation.status} size="sm" />
                  </div>
                  <div className="space-y-2">
                    {/* Show specific quick action buttons based on current status */}
                    {reservation.status === "CONFIRMATION_PENDING" && (
                      <QuickActionButton
                        status="CONFIRMED"
                        reservation={reservation}
                        onStatusUpdate={handleStatusUpdate}
                        size="sm"
                      />
                    )}
                    {reservation.status === "CONFIRMED" && (
                      <div className="space-y-2">
                        <QuickActionButton
                          status="IN_HOUSE"
                          reservation={reservation}
                          onStatusUpdate={handleStatusUpdate}
                          size="sm"
                        />
                        <QuickActionButton
                          status="NO_SHOW"
                          reservation={reservation}
                          onStatusUpdate={handleStatusUpdate}
                          size="sm"
                        />
                      </div>
                    )}
                    {reservation.status === "IN_HOUSE" && (
                      <QuickActionButton
                        status="CHECKED_OUT"
                        reservation={reservation}
                        onStatusUpdate={handleStatusUpdate}
                        size="sm"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Validation Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Status Transition Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <h4 className="font-medium mb-2">
                    {reservation.guestName} - Room {reservation.roomNumber}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {Object.values(ReservationStatus).map((targetStatus) => {
                      const validation = validateTransition(
                        reservation.status,
                        targetStatus,
                        {
                          checkIn: reservation.checkIn,
                          checkOut: reservation.checkOut,
                          paymentStatus: reservation.paymentStatus
                        }
                      );

                      return (
                        <div
                          key={targetStatus}
                          className={`p-2 rounded border ${
                            validation.isValid
                              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
                              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
                          }`}
                        >
                          <div className="font-medium">{targetStatus}</div>
                          <div className="text-xs">
                            {validation.isValid ? "✓ Valid" : "✗ Invalid"}
                          </div>
                          {validation.reason && (
                            <div className="text-xs mt-1">
                              {validation.reason}
                            </div>
                          )}
                          {validation.warnings &&
                            validation.warnings.length > 0 && (
                              <div className="text-xs mt-1 text-yellow-600">
                                ⚠ {validation.warnings[0]}
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Update Modal */}
        {selectedReservation && (
          <StatusUpdateModal
            isOpen={isModalOpen}
            onClose={closeModal}
            reservation={selectedReservation}
            currentUserRole="FRONT_DESK"
            onStatusUpdate={handleStatusUpdate}
          />
        )}
      </div>
    </div>
  );
}
