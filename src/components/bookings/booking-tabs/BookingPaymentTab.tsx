"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BookingTabProps, BookingFormData } from "./types";

interface BookingPaymentTabProps extends BookingTabProps {
  handleCreate: (formData: BookingFormData) => void;
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

    return {
      basePrice,
      addonsTotal,
      subtotal,
      nights
    };
  };

  const totals = calculateTotals();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Pass the form data directly since handleCreate expects BookingFormData
    handleCreate(formData);
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
            <p className="font-semibold">{totals.nights}</p>
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

        <RadioGroup
          value={formData.payment.paymentMethod}
          onValueChange={(value: "full" | "authorize") =>
            updateFormData({
              payment: {
                ...formData.payment,
                paymentMethod: value,
                totalAmount: totals.subtotal
              }
            })
          }
          className="space-y-4"
        >
          <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
            <RadioGroupItem value="full" id="full" />
            <Label htmlFor="full" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">Charge Full Amount Now</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Collect ₹{totals.subtotal.toLocaleString()} now via cash, bank
                  transfer, wire transfer, or card
                </p>
              </div>
            </Label>
            <div className="text-right">
              <p className="font-semibold text-green-600">
                ₹{totals.subtotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
            <RadioGroupItem value="authorize" id="authorize" />
            <Label htmlFor="authorize" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">Authorize Card</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Hold ₹{totals.subtotal.toLocaleString()} on the guest&apos;s
                  card (funds reserved, charged at check-out)
                </p>
              </div>
            </Label>
            <div className="text-right">
              <p className="font-semibold text-blue-600">
                ₹{totals.subtotal.toLocaleString()}{" "}
                <span className="text-xs text-gray-500">HOLD</span>
              </p>
            </div>
          </div>
        </RadioGroup>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Payment Methods:</strong> Full payment can be collected via
            cash, bank transfer, wire transfer, or card. Card authorization is
            only available for card payments and holds funds without charging
            until check-out.
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
