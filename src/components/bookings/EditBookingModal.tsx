// components/EditBookingModal.tsx

"use client";

import React from "react";
import { Dialog } from "@headlessui/react";
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

interface Resource {
  id: string;
  title: string;
}

interface EditBookingModalProps {
  editingReservation: Reservation | null;
  setEditingReservation: (r: Reservation | null) => void;
  resources: Resource[];
  adults: number;
  setAdults: (v: number) => void;
  childrenCount: number;
  setChildren: (v: number) => void;
  handleUpdate: (e: React.FormEvent<HTMLFormElement>) => void;
  handleDelete: (id: string) => void;
  onPaymentAdded?: () => void;
}

const EditBookingModal: React.FC<EditBookingModalProps> = ({
  editingReservation,
  setEditingReservation,
  resources,
  adults,
  setAdults,
  childrenCount,
  setChildren,
  handleUpdate,
  handleDelete
}) => {
  //const { data: session } = useSession();
  if (!editingReservation) return null;

  return (
    <Dialog
      open={!!editingReservation}
      onClose={() => setEditingReservation(null)}
      className="fixed inset-0 z-50"
    >
      <div className="flex items-center justify-center min-h-screen bg-black/70 p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg shadow-xl max-w-md w-full p-6">
          <Dialog.Title className="text-lg font-bold mb-4">
            Edit Booking
          </Dialog.Title>
          <form onSubmit={handleUpdate} className="space-y-4 text-sm">
            <div>
              <label className="block text-sm font-medium">Room</label>
              <div className="mt-1 p-2 bg-white dark:bg-gray-900 rounded">
                {
                  resources.find((r) => r.id === editingReservation.roomId)
                    ?.title
                }
              </div>
            </div>
            <input
              name="guestName"
              defaultValue={editingReservation.guestName}
              className="w-full border p-2 rounded"
              placeholder="Guest Name"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                id="editCheckIn"
                type="date"
                name="checkIn"
                defaultValue={editingReservation.checkIn.split("T")[0]}
                className="border p-2 rounded"
              />
              <input
                id="editCheckOut"
                type="date"
                name="checkOut"
                defaultValue={editingReservation.checkOut.split("T")[0]}
                className="border p-2 rounded"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center border rounded">
                <button
                  type="button"
                  onClick={() => setAdults(Math.max(1, adults - 1))}
                  className="w-8"
                >
                  −
                </button>
                <span className="flex-1 text-center">{adults}</span>
                <button
                  type="button"
                  onClick={() => setAdults(adults + 1)}
                  className="w-8"
                >
                  +
                </button>
              </div>
              <div className="flex items-center border rounded">
                <button
                  type="button"
                  onClick={() => setChildren(Math.max(0, childrenCount - 1))}
                  className="w-8"
                >
                  −
                </button>
                <span className="flex-1 text-center">{childrenCount}</span>
                <button
                  type="button"
                  onClick={() => setChildren(childrenCount + 1)}
                  className="w-8"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => handleDelete(editingReservation.id)}
                className="px-4 py-2 bg-red-500 text-white rounded text-sm"
              >
                Delete
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => setEditingReservation(null)}
                  className="mr-2 px-4 py-2 border text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default EditBookingModal;
