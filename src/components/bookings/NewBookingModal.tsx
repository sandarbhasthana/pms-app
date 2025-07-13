// components/NewBookingModal.tsx

"use client";

import { Dialog } from "@headlessui/react";
import IDScannerWithOCR from "@/components/IDScannerWithOCR";
import AutocompleteInput from "@/components/bookings/AutocompleteInput";

interface SelectedSlot {
  roomId: string;
  roomName: string;
  date: string;
}

interface NewBookingModalProps {
  selectedSlot: SelectedSlot | null;
  setSelectedSlot: (slot: SelectedSlot | null) => void;
  handleCreate: (e: React.FormEvent<HTMLFormElement>) => void;
  fullName: string;
  setFullName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  idType: string;
  setIdType: (v: string) => void;
  idNumber: string;
  setIdNumber: (v: string) => void;
  issuingCountry: string;
  setIssuingCountry: (v: string) => void;
  adults: number;
  setAdults: (v: number) => void;
  childrenCount: number;
  setChildrenCount: (v: number) => void;
  showScanner: boolean;
  setShowScanner: (v: boolean) => void;
  setOcrEnabled: (v: boolean) => void;
  handleScanComplete: (result: {
    idNumber: string;
    fullName: string;
    issuingCountry: string;
  }) => void;
  handleScanError: (err: Error) => void;
  setLastScannedSlot: (slot: SelectedSlot | null) => void;
}

const NewBookingModal: React.FC<NewBookingModalProps> = ({
  selectedSlot,
  setSelectedSlot,
  handleCreate,
  fullName,
  setFullName,
  phone,
  setPhone,
  email,
  setEmail,
  idType,
  setIdType,
  idNumber,
  setIdNumber,
  issuingCountry,
  setIssuingCountry,
  adults,
  setAdults,
  childrenCount,
  setChildrenCount,
  showScanner,
  setShowScanner,
  setOcrEnabled,
  handleScanComplete,
  handleScanError,
  setLastScannedSlot
}) => {
  if (!selectedSlot) return null;

  return (
    <Dialog
      open={!!selectedSlot}
      onClose={() => {}}
      className="fixed inset-0 z-50"
    >
      <div className="flex items-center justify-center min-h-screen bg-black/70 p-4">
        <Dialog.Panel className="relative w-[80%] max-w-6xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg shadow-2xl p-8">
          <button
            onClick={() => setSelectedSlot(null)}
            className="absolute top-4 right-4 text-gray-500 hover:text-red-600"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <Dialog.Title className="text-xl font-bold mb-6">
            New Booking
          </Dialog.Title>
          <form
            id="bookingForm"
            onSubmit={handleCreate}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm"
          >
            <div>
              <label className="block text-sm font-medium">Room</label>
              <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded">
                {selectedSlot.roomName}
              </div>
            </div>

            <AutocompleteInput
              label="Guest Name"
              name="guestName"
              value={fullName}
              setValue={setFullName}
              placeholder="John Doe"
              onCustomerSelect={(r) => {
                setFullName(r.guestName);
                setEmail(r.email || "");
                setPhone(r.phone || "");
                setIdNumber(r.idNumber || "");
                setIdType(r.idType || "passport");
                setIssuingCountry(r.issuingCountry || "");
              }}
            />
            <AutocompleteInput
              label="Email"
              name="email"
              value={email}
              type="email"
              setValue={setEmail}
              placeholder="guest@example.com"
              onCustomerSelect={(r) => {
                setFullName(r.guestName);
                setEmail(r.email || "");
                setPhone(r.phone || "");
                setIdNumber(r.idNumber || "");
                setIdType(r.idType || "passport");
                setIssuingCountry(r.issuingCountry || "");
              }}
            />
            <AutocompleteInput
              label="Phone"
              name="phone"
              value={phone}
              type="tel"
              setValue={setPhone}
              placeholder="+1 (555) 555-5555"
              onCustomerSelect={(r) => {
                setFullName(r.guestName);
                setEmail(r.email || "");
                setPhone(r.phone || "");
                setIdNumber(r.idNumber || "");
                setIdType(r.idType || "passport");
                setIssuingCountry(r.issuingCountry || "");
              }}
            />

            <div>
              <label className="block text-sm font-medium mb-1">Check-In</label>
              <input
                name="checkIn"
                type="date"
                defaultValue={selectedSlot.date}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Check-Out
              </label>
              <input
                name="checkOut"
                type="date"
                defaultValue={
                  new Date(new Date(selectedSlot.date).getTime() + 86400000)
                    .toISOString()
                    .split("T")[0]
                }
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Adults</label>
              <input
                type="number"
                min={1}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Children</label>
              <input
                type="number"
                min={0}
                value={childrenCount}
                onChange={(e) => setChildrenCount(Number(e.target.value))}
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ID Type</label>
              <select
                name="idType"
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full border p-2 rounded"
              >
                <option value="passport">Passport</option>
                <option value="driver">Driver’s License</option>
                <option value="national_id">National ID</option>
              </select>
            </div>

            <AutocompleteInput
              label="ID Number"
              name="idNumber"
              value={idNumber}
              setValue={setIdNumber}
              placeholder="Enter ID number"
              onCustomerSelect={(r) => {
                setFullName(r.guestName);
                setEmail(r.email || "");
                setPhone(r.phone || "");
                setIdNumber(r.idNumber || "");
                setIdType(r.idType || "passport");
                setIssuingCountry(r.issuingCountry || "");
              }}
            />
            <div>
              <label className="block text-sm font-medium mb-1">
                Issuing Country
              </label>
              <input
                name="issuingCountry"
                value={issuingCountry}
                onChange={(e) => setIssuingCountry(e.target.value)}
                className="w-full border p-2 rounded"
                placeholder="Enter country"
              />
            </div>
          </form>
          <div className="flex items-center justify-between mt-6">
            <span className="text-xs">Fill manually or scan with OCR</span>
            <button
              type="button"
              onClick={() => {
                setOcrEnabled(true);
                if (selectedSlot) setLastScannedSlot(selectedSlot);
                setSelectedSlot(null);
                setShowScanner(true);
              }}
              className="px-3 py-2 text-xs bg-blue-600 text-white rounded-sm"
            >
              Scan ID
            </button>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={() => setSelectedSlot(null)}
              className="mr-2 px-4 py-2 text-sm border rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const form = document.getElementById(
                  "bookingForm"
                ) as HTMLFormElement;
                if (form) {
                  const fakeEvent = {
                    currentTarget: form,
                    preventDefault: () => {}
                  } as React.FormEvent<HTMLFormElement>;
                  handleCreate(fakeEvent);
                }
              }}
              className="px-4 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded"
            >
              Submit
            </button>
          </div>
        </Dialog.Panel>
      </div>

      {showScanner && (
        <IDScannerWithOCR
          onComplete={handleScanComplete}
          onError={handleScanError}
          onClose={() => {
            setShowScanner(false);
            if (selectedSlot) setSelectedSlot(selectedSlot);
          }}
        />
      )}
    </Dialog>
  );
};

export default NewBookingModal;
