// components/ViewDetailsModal.tsx

"use client";

import React, { Dispatch, SetStateAction } from "react";
import { Dialog } from "@headlessui/react";

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

interface ViewDetailsModalProps {
  viewReservation: Reservation | null;
  setViewReservation: Dispatch<SetStateAction<Reservation | null>>;
}

const ViewDetailsModal: React.FC<ViewDetailsModalProps> = ({
  viewReservation,
  setViewReservation
}) => {
  if (!viewReservation) return null;

  console.log("ViewDetailsModal reservation:", viewReservation);

  const nights = Math.ceil(
    (new Date(viewReservation.checkOut).getTime() -
      new Date(viewReservation.checkIn).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <Dialog
      open={!!viewReservation}
      onClose={() => setViewReservation(null)}
      className="fixed inset-0 z-50"
    >
      <div className="flex items-center justify-center min-h-screen bg-black/70 p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg shadow-xl max-w-md w-full p-6 text-sm">
          <Dialog.Title className="text-lg font-bold mb-2">
            Reservation Details
          </Dialog.Title>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium">Guest:</label>
              <div className="mt-1 p-2 bg-white dark:bg-gray-900 border rounded">
                {viewReservation.guestName}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium">Check-In:</label>
                <div className="mt-1 p-2 bg-white dark:bg-gray-900 border rounded">
                  {new Date(viewReservation.checkIn).toLocaleDateString(
                    undefined,
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric"
                    }
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium">Check-Out:</label>
                <div className="mt-1 p-2 bg-white dark:bg-gray-900 border rounded">
                  {new Date(viewReservation.checkOut).toLocaleDateString(
                    undefined,
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric"
                    }
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium">Nights:</label>
              <div className="mt-1 p-2 bg-white dark:bg-gray-900 border rounded">
                {nights}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium">Rate Plan:</label>
              <div className="mt-1 p-2 bg-white dark:bg-gray-900 border rounded">
                {viewReservation.ratePlan || "—"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium">Status:</label>
              <div className="mt-1 p-2 bg-white dark:bg-gray-900 border rounded">
                {viewReservation.status || "—"}
              </div>
            </div>
            <div>
              <p className="text-xs">
                💳 Payment Status:{" "}
                <span className="font-semibold">
                  {viewReservation.paymentStatus || "UNKNOWN"}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium">Room:</label>
              <div className="mt-1 p-2 bg-white dark:bg-gray-900 border rounded">
                {viewReservation.roomNumber || "—"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium">Notes:</label>
              <textarea
                readOnly
                value={viewReservation.notes || "No notes available."}
                className="mt-1 block w-full border rounded p-2 text-xs bg-gray-50 dark:bg-gray-900"
                rows={4}
              />
            </div>
            <div className="text-right pt-4">
              <button
                type="button"
                onClick={() => setViewReservation(null)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ViewDetailsModal;
