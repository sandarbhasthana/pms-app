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

  // FIXED: Memoized close handler
  const handleClose = useCallback(() => {
    setSelectedSlot(null);
  }, [setSelectedSlot]);

  // FIXED: Memoized submit handler
  const handleSubmit = useCallback(() => {
    const form = document.getElementById("bookingForm") as HTMLFormElement;
    if (form) {
      const fakeEvent = {
        currentTarget: form,
        preventDefault: () => {}
      } as React.FormEvent<HTMLFormElement>;
      handleCreate(fakeEvent);
    }
  }, [handleCreate]);

  // FIXED: Memoized scanner handlers
  const handleScannerOpen = useCallback(() => {
    setLastScannedSlot(selectedSlot);
    setOcrEnabled(true);
    setShowScanner(true);
  }, [selectedSlot, setLastScannedSlot, setOcrEnabled, setShowScanner]);

  const handleScannerClose = useCallback(() => {
    setShowScanner(false);
    if (selectedSlot) setSelectedSlot(selectedSlot);
  }, [selectedSlot, setShowScanner, setSelectedSlot]);

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
      {/* FIXED: Improved modal sizing and scrolling */}
      <div className="flex items-start justify-center min-h-screen bg-black/70 p-4 py-8">
        <Dialog.Panel className="relative w-full max-w-4xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Fixed Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-xl font-bold">
              New Booking (Fixed)
            </Dialog.Title>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-500 hover:text-red-600 transition-colors"
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
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form
              id="bookingForm"
              onSubmit={handleCreate}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm"
            >
              <div>
                <label className="block text-sm font-medium">Room</label>
                <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  {selectedSlot.roomName}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Date</label>
                <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">
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
                <label className="block text-sm font-medium mb-1">Adults</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                  >
                    -
                  </button>
                  <span className="px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded min-w-[3rem] text-center">
                    {adults}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdults(adults + 1)}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Children</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                  >
                    -
                  </button>
                  <span className="px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded min-w-[3rem] text-center">
                    {childrenCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setChildrenCount(childrenCount + 1)}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ID Type</label>
                <select
                  name="idType"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className="w-full border border-gray-600 p-2 rounded"
                >
                  <option value="passport">Passport</option>
                  <option value="driver">Driver's License</option>
                  <option value="national_id">National ID</option>
                </select>
              </div>

              <AutocompleteInputFixed
                label="ID Number"
                name="idNumber"
                value={idNumber}
                setValue={setIdNumber}
                placeholder="Enter ID number"
                onCustomerSelect={handleCustomerSelect}
              />

              <div>
                <label className="block text-sm font-medium">Issuing Country</label>
                <input
                  name="issuingCountry"
                  value={issuingCountry}
                  onChange={(e) => setIssuingCountry(e.target.value)}
                  className="mt-1 block w-full border border-gray-600 rounded p-2 text-sm"
                  placeholder="Country"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleScannerOpen}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  📷 Scan ID Document
                </button>
              </div>
            </form>
          </div>

          {/* Fixed Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded transition-colors"
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
          onClose={handleScannerClose}
        />
      )}
    </Dialog>
  );
};

export default NewBookingModalFixed;
