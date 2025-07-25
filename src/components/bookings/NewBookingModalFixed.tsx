// FIXED VERSION - Optimized NewBookingModal for bookings-fixed page
"use client";

import { Dialog } from "@headlessui/react";
import { useCallback, useMemo } from "react";
import IDScannerWithOCR from "@/components/IDScannerWithOCR";
import AutocompleteInputFixed from "@/components/bookings/AutocompleteInputFixed";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface Customer {
  guestName: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  idType?: string;
  issuingCountry?: string;
}

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
  const handleCustomerSelect = useCallback(
    (r: Customer) => {
      setFullName(r.guestName);
      setEmail(r.email || "");
      setPhone(r.phone || "");
      setIdNumber(r.idNumber || "");
      setIdType(r.idType || "passport");
      setIssuingCountry(r.issuingCountry || "");
    },
    [setFullName, setEmail, setPhone, setIdNumber, setIdType, setIssuingCountry]
  );

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
            type="button"
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
            className="space-y-4 text-sm"
          >
            {/* Row 1: Room No. (Read only) | Guest Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Room No.
                </label>
                <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded border border-gray-600">
                  {selectedSlot.roomName}
                </div>
              </div>
              <AutocompleteInputFixed
                label="Guest Name"
                name="guestName"
                value={fullName}
                setValue={setFullName}
                placeholder="John Doe"
                onCustomerSelect={handleCustomerSelect}
              />
            </div>

            {/* Row 2: Email | Phone No. */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Row 3: Check-in Date | Check-out Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Check-in Date
                </label>
                <input
                  name="checkIn"
                  type="date"
                  defaultValue={checkInDate}
                  className="block w-full border border-gray-600 rounded p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Check-out Date
                </label>
                <input
                  name="checkOut"
                  type="date"
                  defaultValue={checkOutDate}
                  className="block w-full border border-gray-600 rounded p-2 text-sm"
                />
              </div>
            </div>

            {/* Row 4: Adults (Stepper) | Child (Stepper) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Adults</label>
                <div className="flex items-center border border-gray-600 rounded">
                  <button
                    type="button"
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center py-2">{adults}</span>
                  <button
                    type="button"
                    onClick={() => setAdults(adults + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Child</label>
                <div className="flex items-center border border-gray-600 rounded">
                  <button
                    type="button"
                    onClick={() =>
                      setChildrenCount(Math.max(0, childrenCount - 1))
                    }
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center py-2">
                    {childrenCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setChildrenCount(childrenCount + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Row 5: ID Type (full column) | ID Number & Issuing Country (split 50/50) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  ID Type
                </label>
                <Select value={idType} onValueChange={setIdType}>
                  <SelectTrigger className="w-full border border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select ID Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">
                      Driver&apos;s License
                    </SelectItem>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    ID Number
                  </label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Enter ID number"
                    className="block w-full border border-gray-600 rounded p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Issuing Country
                  </label>
                  <input
                    type="text"
                    value={issuingCountry}
                    onChange={(e) => setIssuingCountry(e.target.value)}
                    placeholder="e.g., United States"
                    className="block w-full border border-gray-600 rounded p-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Row 6: "Fill manually or scan with OCR" text */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Fill manually or scan with OCR
            </div>

            {/* Row 7: Scan ID Button | Cancel Save Buttons on the right */}
            <div className="flex justify-between items-center">
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

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="w-20 px-4 py-2 text-sm border border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
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
                  className="w-20 px-4 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
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
