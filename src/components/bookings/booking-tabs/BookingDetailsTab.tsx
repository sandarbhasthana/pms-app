"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { BookingTabProps } from "./types";
import {
  CameraIcon,
  ArrowUpTrayIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import IDScannerWithOCR from "@/components/IDScannerWithOCR";

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
  setLastScannedSlot: (slot: any) => void;
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);

        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTakePhoto = () => {
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
      {/* Placeholder content - will be implemented in Phase 2 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Guest Information</h3>

        {/* Image Upload Section */}
        <div className="mb-6">
          <div className="flex flex-col items-center">
            {/* Image Preview */}
            <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
              {uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt="Uploaded ID"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-400 rounded-full mx-auto mb-2 flex items-center justify-center">
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
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                <CameraIcon className="h-4 w-4" />
                TAKE PHOTO
              </Button>

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center justify-center gap-2 w-full"
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                UPLOAD
              </Button>

              {/* Image Dimensions */}
              {imageDimensions && (
                <div className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <InformationCircleIcon className="h-4 w-4" />
                  <span>
                    Image Dimensions: {imageDimensions.width}x
                    {imageDimensions.height}px
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

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Room No.</label>
            <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded border border-gray-600 h-10 flex items-center">
              {selectedSlot.roomName}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Guest Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => updateFormData({ fullName: e.target.value })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-10"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData({ email: e.target.value })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              placeholder="guest@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateFormData({ phone: e.target.value })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              placeholder="+1 (555) 555-5555"
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
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
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
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Adults</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  updateFormData({ adults: Math.max(1, formData.adults - 1) })
                }
                className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                -
              </button>
              <span className="w-8 text-center">{formData.adults}</span>
              <button
                type="button"
                onClick={() => updateFormData({ adults: formData.adults + 1 })}
                className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Children</label>
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
              <span className="w-8 text-center">{formData.childrenCount}</span>
              <button
                type="button"
                onClick={() =>
                  updateFormData({ childrenCount: formData.childrenCount + 1 })
                }
                className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Row 4: ID Type | ID Number */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">ID Type</label>
            <select
              value={formData.idType}
              onChange={(e) => updateFormData({ idType: e.target.value })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-10"
            >
              <option value="passport">Passport</option>
              <option value="drivers_license">Driver's License</option>
              <option value="national_id">National ID</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ID Number</label>
            <input
              type="text"
              value={formData.idNumber}
              onChange={(e) => updateFormData({ idNumber: e.target.value })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 h-10"
              placeholder="Enter ID number"
            />
          </div>
        </div>

        {/* Row 5: Issuing Country */}
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
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              placeholder="United States"
            />
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <p>
            📝 <strong>Note:</strong> This is a basic implementation for Phase
            1.
          </p>
          <p>
            Full form with ID scanner, autocomplete, and validation will be
            added in Phase 2.
          </p>
        </div>
      </div>

      {/* Payment Summary Bar */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Estimated Total
            </p>
            <p className="text-lg font-semibold">
              ₹2,500 <span className="text-sm font-normal">(1 night)</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Suggested Deposit
            </p>
            <p className="text-lg font-semibold text-purple-600">₹1,000</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <div></div>
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
