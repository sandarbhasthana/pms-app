// FIXED VERSION - Optimized NewBookingModal for bookings-fixed page
"use client";

import { Dialog } from "@headlessui/react";
import { useCallback, useMemo } from "react";
import IDScannerWithOCR from "@/components/IDScannerWithOCR";
import AutocompleteInputFixed from "@/components/bookings/AutocompleteInputFixed";

interface SelectedSlot {
  roomId: string;
  roomName: string;
  date: string;
}

interface NewBookingModalFixedProps {
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

const NewBookingModalFixed: React.FC<NewBookingModalFixedProps> = ({
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
  // FIXED: Memoized customer select handler to prevent re-creation
  const handleCustomerSelect = useCallback((r: any) => {
    setFullName(r.guestName);
    setEmail(r.email || "");
    setPhone(r.phone || "");
    setIdNumber(r.idNumber || "");
    setIdType(r.idType || "passport");
    setIssuingCountry(r.issuingCountry || "");
  }, [setFullName, setEmail, setPhone, setIdNumber, setIdType, setIssuingCountry]);

  // FIXED: Memoized date calculations
  const { checkInDate, checkOutDate } = useMemo(() => {
    if (!selectedSlot) return { checkInDate: "", checkOutDate: "" };
    
    const checkIn = new Date(selectedSlot.date);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 1);
    
    return {
      checkInDate: checkIn.toISOString().slice(0, 10),
      checkOutDate: checkOut.toISOString().slice(0, 10)
    };
  }, [selectedSlot]);

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

            <div>
              <label className="block text-sm font-medium">Date</label>
              <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded">
                {selectedSlot.date}
              </div>
            </div>

            {/* FIXED: Use optimized AutocompleteInput */}
            <AutocompleteInputFixed
              label="Guest Name"
              name="guestName"
              value={fullName}
              setValue={setFullName}
              placeholder="John Doe"
              onCustomerSelect={handleCustomerSelect}
            />

            <AutocompleteInputFixed
              label="Email"
              name="email"
              value={email}
              type="email"
              setValue={setEmail}
              placeholder="guest@example.com"
              onCustomerSelect={handleCustomerSelect}
            />

            <AutocompleteInputFixed
              label="Phone"
              name="phone"
              value={phone}
              type="tel"
              setValue={setPhone}
              placeholder="+1 (555) 555-5555"
              onCustomerSelect={handleCustomerSelect}
            />

            <div>
              <label className="block text-sm font-medium">Check-in</label>
              <input
                name="checkIn"
                type="date"
                defaultValue={checkInDate}
                className="mt-1 block w-full border border-gray-600 rounded p-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Check-out</label>
              <input
                name="checkOut"
                type="date"
                defaultValue={checkOutDate}
                className="mt-1 block w-full border border-gray-600 rounded p-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Adults</label>
              <input
                type="number"
                min="1"
                value={adults}
                onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                className="mt-1 block w-full border border-gray-600 rounded p-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Children</label>
              <input
                type="number"
                min="0"
                value={childrenCount}
                onChange={(e) => setChildrenCount(parseInt(e.target.value) || 0)}
                className="mt-1 block w-full border border-gray-600 rounded p-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">ID Type</label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="mt-1 block w-full border border-gray-600 rounded p-2 text-sm"
              >
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="national_id">National ID</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">ID Number</label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Enter ID number"
                className="mt-1 block w-full border border-gray-600 rounded p-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Issuing Country</label>
              <input
                type="text"
                value={issuingCountry}
                onChange={(e) => setIssuingCountry(e.target.value)}
                placeholder="e.g., United States"
                className="mt-1 block w-full border border-gray-600 rounded p-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setLastScannedSlot(selectedSlot);
                  setOcrEnabled(true);
                  setShowScanner(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Scan ID
              </button>
            </div>
          </form>

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

export default NewBookingModalFixed;

