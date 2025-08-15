"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BookingTabProps } from "./types";

interface BookingPaymentTabProps extends BookingTabProps {
  handleCreate: (formData: any) => void;
  checkInDate: string;
  checkOutDate: string;
}

export const BookingPaymentTab: React.FC<BookingPaymentTabProps> = ({
  formData,
  updateFormData,
  selectedSlot,
  onPrevious,
  handleCreate,
  checkInDate,
  checkOutDate
}) => {
  const calculateTotals = () => {
    // Calculate number of nights using the actual form data (user-modified dates)
    const checkIn = new Date(formData.checkIn);
    const checkOut = new Date(formData.checkOut);
    const nights = Math.max(
      1,
      Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    const basePricePerNight = 2500; // Placeholder - will be dynamic in Phase 3
    const basePrice = basePricePerNight * nights;

    const addonsTotal =
      (formData.addons.extraBed ? 500 * nights : 0) +
      (formData.addons.breakfast
        ? 300 * (formData.adults + formData.childrenCount) * nights
        : 0);

    const subtotal = basePrice + addonsTotal;
    const suggestedDeposit = Math.max(subtotal * 0.3, 1000);

    return {
      basePrice,
      addonsTotal,
      subtotal,
      suggestedDeposit,
      remainingBalance: subtotal - suggestedDeposit,
      nights
    };
  };

  const totals = calculateTotals();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Prepare the booking data using form data dates (user-modified)
    const bookingData = {
      guestName: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      idType: formData.idType,
      idNumber: formData.idNumber,
      issuingCountry: formData.issuingCountry,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      adults: formData.adults,
      children: formData.childrenCount,
      addons: formData.addons,
      payment: formData.payment
    };

    handleCreate(bookingData);
  };

  return (
    <div className="space-y-6">
      {/* Reservation Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Reservation Summary</h3>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Check-in</p>
            <p className="font-semibold">{checkInDate}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Check-out</p>
            <p className="font-semibold">{checkOutDate}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Guest</p>
            <p className="font-semibold">{formData.fullName}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Room</p>
            <p className="font-semibold">{selectedSlot.roomName}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Guests</p>
            <p className="font-semibold">
              {formData.adults} Adults, {formData.childrenCount} Children
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Nights</p>
            <p className="font-semibold">1</p>
          </div>
        </div>
      </div>

      {/* Accommodation Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Accommodation Summary</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span>
              Room Rate ({totals.nights} night{totals.nights > 1 ? "s" : ""})
            </span>
            <span>₹{totals.basePrice}</span>
          </div>

          {formData.addons.extraBed && (
            <div className="flex justify-between text-blue-600 dark:text-blue-400">
              <span>Extra Bed</span>
              <span>₹500</span>
            </div>
          )}

          {formData.addons.breakfast && (
            <div className="flex justify-between text-blue-600 dark:text-blue-400">
              <span>
                Breakfast ({formData.adults + formData.childrenCount} guests)
              </span>
              <span>₹{300 * (formData.adults + formData.childrenCount)}</span>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
            <div className="flex justify-between font-semibold text-lg">
              <span>Grand Total</span>
              <span>₹{totals.subtotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Payment Information</h3>

        <RadioGroup defaultValue="deposit" className="space-y-4">
          <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
            <RadioGroupItem value="deposit" id="deposit" />
            <Label htmlFor="deposit" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">Pay Deposit Now</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pay ₹{Math.round(totals.suggestedDeposit)} now, ₹
                  {Math.round(totals.remainingBalance)} at check-in
                </p>
              </div>
            </Label>
            <div className="text-right">
              <p className="font-semibold text-green-600">
                ₹{Math.round(totals.suggestedDeposit)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
            <RadioGroupItem value="full" id="full" />
            <Label htmlFor="full" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">Pay Full Amount</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pay the complete amount now
                </p>
              </div>
            </Label>
            <div className="text-right">
              <p className="font-semibold text-purple-600">
                ₹{totals.subtotal}
              </p>
            </div>
          </div>
        </RadioGroup>

        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Credit card storage and secure payment
            processing will be implemented in Phase 3.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <form onSubmit={handleSubmit}>
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            className="border-gray-300 dark:border-gray-600"
          >
            ← Previous: Add-ons
          </Button>
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Confirm Reservation
          </Button>
        </div>
      </form>
    </div>
  );
};
