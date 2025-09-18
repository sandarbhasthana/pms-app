"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { BookingTabProps, SelectedSlot } from "./types";
import {
  CameraIcon,
  ArrowUpTrayIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";
import IDScannerWithOCR from "@/components/IDScannerWithOCR";
import AutocompleteInputFixed from "@/components/bookings/AutocompleteInputFixed";

// Extended props for details tab to include scanner functionality
interface BookingDetailsTabProps extends BookingTabProps {
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

export const BookingDetailsTab: React.FC<BookingDetailsTabProps> = ({
  formData,
  updateFormData,
  selectedSlot,
  onNext,
  showScanner,
  setShowScanner,
  setOcrEnabled,
  handleScanComplete,
  handleScanError,
  setLastScannedSlot
}) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSelectingCustomerRef = useRef<boolean>(false);
  const selectedCustomerValuesRef = useRef<{
    fullName: string;
    email: string;
    phone: string;
    idNumber: string;
  }>({ fullName: "", email: "", phone: "", idNumber: "" });

  // Customer selection handler for autocomplete
  const handleCustomerSelect = useCallback(
    (customer: {
      guestName: string;
      email?: string;
      phone?: string;
      idNumber?: string;
      idType?: string;
      issuingCountry?: string;
    }) => {
      // Set flag to prevent dropdowns from showing during batch update
      isSelectingCustomerRef.current = true;

      // Store the values we're about to set
      const newValues = {
        fullName: customer.guestName || "",
        email: customer.email || "",
        phone: customer.phone || "",
        idNumber: customer.idNumber || ""
      };
      selectedCustomerValuesRef.current = newValues;

      updateFormData({
        ...newValues,
        idType: customer.idType || "passport",
        issuingCountry: customer.issuingCountry || ""
      });

      // Clear the flag after React has processed the updates
      setTimeout(() => {
        isSelectingCustomerRef.current = false;
      }, 100);
    },
    [updateFormData]
  );

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);

        // Get image dimensions
        const img = new window.Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTakePhoto = () => {
    setLastScannedSlot(selectedSlot);
    setShowScanner(true);
    setOcrEnabled(true);
  };

  const isFormValid = () => {
    return (
      formData.fullName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.phone.trim() !== "" &&
      formData.checkIn.trim() !== "" &&
      formData.checkOut.trim() !== "" &&
      formData.adults > 0
    );
  };

  return (
    <div className="space-y-6">
      {/* Guest Information Section - Improved Layout */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-6">Guest Information</h3>

        {/* Compact Side-by-Side Layout */}
        <div className="flex gap-6">
          {/* Left Side: Image Upload Section */}
          <div className="flex-shrink-0">
            <div className="flex flex-col items-center">
              {/* Image Preview */}
              <div className="w-32 h-32 bg-gray-100 dark:!bg-gray-700 rounded-lg flex items-center justify-center mb-3 border-2 border-dashed border-gray-300 dark:border-gray-600">
                {uploadedImage ? (
                  <Image
                    src={uploadedImage}
                    alt="Uploaded ID"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 dark:bg-gray-400 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-32">
                <Button
                  type="button"
                  onClick={handleTakePhoto}
                  className="flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-700 text-white w-full text-xs py-2"
                >
                  <CameraIcon className="h-3 w-3" />
                  TAKE PHOTO
                </Button>

                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex items-center justify-center gap-2 w-full text-xs py-2"
                >
                  <ArrowUpTrayIcon className="h-3 w-3" />
                  UPLOAD
                </Button>

                {/* Image Dimensions */}
                {imageDimensions && (
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <InformationCircleIcon className="h-3 w-3" />
                    <span>
                      {imageDimensions.width}x{imageDimensions.height}px
                    </span>
                  </div>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Right Side: Form Fields */}
          <div className="flex-1">
            {/* Row 1: Room No. (Read only) | Guest Name */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Room No.
                </label>
                <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                  {selectedSlot.roomName}
                </div>
              </div>
              <div>
                <AutocompleteInputFixed
                  label="Guest Name"
                  name="guestName"
                  value={formData.fullName}
                  setValue={(value) => updateFormData({ fullName: value })}
                  placeholder="John Doe"
                  onCustomerSelect={handleCustomerSelect}
                  isSelectingCustomerRef={isSelectingCustomerRef}
                  selectedCustomerValuesRef={selectedCustomerValuesRef}
                />
              </div>
            </div>

            {/* Row 2: Email | Phone No. */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <AutocompleteInputFixed
                  label="Email"
                  name="email"
                  value={formData.email}
                  type="email"
                  setValue={(value) => updateFormData({ email: value })}
                  placeholder="guest@example.com"
                  onCustomerSelect={handleCustomerSelect}
                  isSelectingCustomerRef={isSelectingCustomerRef}
                  selectedCustomerValuesRef={selectedCustomerValuesRef}
                />
              </div>
              <div>
                <AutocompleteInputFixed
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  type="tel"
                  setValue={(value) => updateFormData({ phone: value })}
                  placeholder="+1 (555) 555-5555"
                  onCustomerSelect={handleCustomerSelect}
                  isSelectingCustomerRef={isSelectingCustomerRef}
                  selectedCustomerValuesRef={selectedCustomerValuesRef}
                />
              </div>
            </div>

            {/* Row 3: Check-in Date | Check-out Date */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Check-in Date
                </label>
                <input
                  type="date"
                  value={formData.checkIn}
                  onChange={(e) => updateFormData({ checkIn: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-10"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Check-out Date
                </label>
                <input
                  type="date"
                  value={formData.checkOut}
                  onChange={(e) => updateFormData({ checkOut: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-10"
                  required
                />
              </div>
            </div>

            {/* Row 4: Adults | Children */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Adults</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateFormData({
                        adults: Math.max(1, formData.adults - 1)
                      })
                    }
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{formData.adults}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateFormData({ adults: formData.adults + 1 })
                    }
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Children
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateFormData({
                        childrenCount: Math.max(0, formData.childrenCount - 1)
                      })
                    }
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">
                    {formData.childrenCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateFormData({
                        childrenCount: formData.childrenCount + 1
                      })
                    }
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Row 5: ID Type | ID Number */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  ID Type
                </label>
                <select
                  value={formData.idType}
                  onChange={(e) => updateFormData({ idType: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-10"
                >
                  <option value="passport">Passport</option>
                  <option value="drivers_license">Driver&apos;s License</option>
                  <option value="national_id">National ID</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <AutocompleteInputFixed
                  label="ID Number"
                  name="idNumber"
                  value={formData.idNumber}
                  setValue={(value) => updateFormData({ idNumber: value })}
                  placeholder="Enter ID number"
                  onCustomerSelect={handleCustomerSelect}
                  isSelectingCustomerRef={isSelectingCustomerRef}
                  selectedCustomerValuesRef={selectedCustomerValuesRef}
                />
              </div>
            </div>

            {/* Row 6: Issuing Country */}
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Issuing Country
                </label>
                <input
                  type="text"
                  value={formData.issuingCountry}
                  onChange={(e) =>
                    updateFormData({ issuingCountry: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-10"
                  placeholder="United States"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ID Scanner Modal */}
      {showScanner && (
        <IDScannerWithOCR
          onComplete={(result) => {
            handleScanComplete(result);
            setShowScanner(false);
          }}
          onError={(error) => {
            handleScanError(error);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!isFormValid()}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          Next: Add-ons →
        </Button>
      </div>
    </div>
  );
};
