"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BookingTabProps, BookingFormData } from "./types";
import { PaymentProvider } from "@/components/payments/PaymentProvider";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { toast } from "sonner";
import { PaymentResult } from "@/lib/payments/types";

interface BookingPaymentTabProps extends BookingTabProps {
  handleCreate: (formData: BookingFormData) => void;
  checkInDate: string;
  checkOutDate: string;
  actualRoomPrice: number;
  ratesLoading: boolean;
}

export const BookingPaymentTab: React.FC<BookingPaymentTabProps> = ({
  formData,
  updateFormData,
  selectedSlot,
  onPrevious,
  handleCreate,
  checkInDate,
  checkOutDate,
  actualRoomPrice,
  ratesLoading
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "succeeded" | "failed"
  >("idle");

  // Create payment intent when card payment is selected
  const createPaymentIntent = useCallback(
    async (amount: number) => {
      setIsCreatingPaymentIntent(true);
      try {
        const requestBody = {
          amount: Math.round(amount * 100), // Convert to cents
          currency: "inr",
          metadata: {
            roomId: selectedSlot.roomId,
            roomName: selectedSlot.roomName,
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            guestName: formData.fullName,
            guestEmail: formData.email,
            guestPhone: formData.phone
          }
        };

        const response = await fetch("/api/test/create-payment-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();

          throw new Error(
            `Failed to create payment intent: ${response.status} ${errorText}`
          );
        }

        const data = await response.json();

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error("No clientSecret received from server");
        }
      } catch (error) {
        console.error("Error creating payment intent:", error);
        toast.error("Failed to initialize payment. Please try again.");
        setClientSecret(null); // Clear any existing client secret
      } finally {
        setIsCreatingPaymentIntent(false);
      }
    },
    [
      selectedSlot.roomId,
      selectedSlot.roomName,
      formData.checkIn,
      formData.checkOut,
      formData.fullName,
      formData.email,
      formData.phone
    ]
  );

  // Calculate totals function
  const calculateTotals = useCallback(() => {
    // Calculate number of nights using the actual form data (user-modified dates)
    const checkIn = new Date(formData.checkIn);
    const checkOut = new Date(formData.checkOut);
    const nights = Math.max(
      1,
      Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    // Use actual room price from rates data
    const basePricePerNight = actualRoomPrice;
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
  }, [
    formData.checkIn,
    formData.checkOut,
    actualRoomPrice,
    formData.addons.extraBed,
    formData.addons.breakfast,
    formData.adults,
    formData.childrenCount
  ]);

  // Handle payment method selection
  const handlePaymentMethodChange = async (method: string) => {
    // Update form data
    updateFormData({
      payment: {
        ...formData.payment,
        paymentMethod: method as "card" | "cash" | "bank_transfer",
        totalAmount: calculateTotals().subtotal
      }
    });

    // Auto-initialize PaymentIntent when card is selected (better UX)
    if (method === "card" && !ratesLoading) {
      const totals = calculateTotals();

      if (totals.subtotal > 0) {
        // Auto-create PaymentIntent immediately for smooth UX
        await createPaymentIntent(totals.subtotal);
      }
    } else {
      // Clear payment intent for non-card payments
      setClientSecret(null);
      setPaymentStatus("idle");
    }
  };

  const totals = calculateTotals();

  // Create PaymentIntent on mount if card is already selected
  useEffect(() => {
    if (
      formData.payment.paymentMethod === "card" &&
      !clientSecret &&
      !isCreatingPaymentIntent &&
      !ratesLoading &&
      totals.subtotal > 0
    ) {
      createPaymentIntent(totals.subtotal);
    }
  }, [
    formData.payment.paymentMethod,
    clientSecret,
    isCreatingPaymentIntent,
    ratesLoading,
    totals.subtotal,
    createPaymentIntent
  ]);

  // Handle payment success
  const handlePaymentSuccess = (result: PaymentResult) => {
    setPaymentStatus("succeeded");
    toast.success("Payment successful! Creating your reservation...");

    // Validate payment result
    if (!result.success || !result.paymentIntentId) {
      toast.error("Payment data incomplete. Please try again.");
      setPaymentStatus("idle");
      return;
    }

    // For now, we'll create a simplified payment record
    // In a real implementation, you'd fetch the full PaymentIntent details from your backend
    const updatedFormData = {
      ...formData,
      payment: {
        ...formData.payment,
        totalAmount: calculateTotals().subtotal,
        creditCard: {
          last4: "****", // PaymentResult doesn't include card details
          brand: "card",
          expiryMonth: 0,
          expiryYear: 0,
          paymentMethodId: result.paymentIntentId,
          paymentIntentId: result.paymentIntentId,
          stripePaymentIntentId: result.paymentIntentId
        }
      }
    };

    // Create the booking
    handleCreate(updatedFormData);
  };

  // Handle payment failure
  const handlePaymentError = (error: string) => {
    setPaymentStatus("failed");
    toast.error(`Payment failed: ${error}`);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // For card payments, payment processing is handled by Stripe component
    if (formData.payment.paymentMethod === "card") {
      if (paymentStatus !== "succeeded") {
        toast.error("Please complete the payment first.");
        return;
      }
      // Payment already processed, booking creation handled in handlePaymentSuccess
      return;
    }

    // For cash and bank transfer, create booking directly
    const updatedFormData = {
      ...formData,
      payment: {
        ...formData.payment,
        totalAmount: calculateTotals().subtotal
      }
    };

    handleCreate(updatedFormData);
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

        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-purple-800 dark:text-purple-200">
                Payment Required
              </p>
              <p className="text-sm text-purple-600 dark:text-purple-300">
                Full amount for {totals.nights} night
                {totals.nights > 1 ? "s" : ""} stay
              </p>
              {ratesLoading && (
                <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                  Loading current rates...
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                {ratesLoading ? (
                  <span className="animate-pulse">₹--,---</span>
                ) : (
                  `₹${totals.subtotal.toLocaleString()}`
                )}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Total Amount
              </p>
            </div>
          </div>
        </div>

        <RadioGroup
          value={formData.payment.paymentMethod}
          onValueChange={handlePaymentMethodChange}
          className="space-y-4"
        >
          <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
            <RadioGroupItem value="card" id="card" />
            <Label htmlFor="card" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">Pay with Credit/Debit Card</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Secure payment processing via Stripe
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
            <RadioGroupItem value="cash" id="cash" />
            <Label htmlFor="cash" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">Cash Payment</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Collect payment in cash at check-in
                </p>
              </div>
            </Label>
            <div className="text-right">
              <p className="font-semibold text-blue-600">
                ₹{totals.subtotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
            <RadioGroupItem value="bank_transfer" id="bank_transfer" />
            <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">Bank Transfer</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Direct bank transfer or wire transfer
                </p>
              </div>
            </Label>
            <div className="text-right">
              <p className="font-semibold text-orange-600">
                ₹{totals.subtotal.toLocaleString()}
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Stripe Payment Form - Show when card payment is selected */}
        {formData.payment.paymentMethod === "card" && (
          <div className="mt-6 p-4 bg-gray-50 dark:!bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium mb-4 text-gray-900 dark:text-gray-100">
              Complete Your Payment
            </h4>

            {isCreatingPaymentIntent || !clientSecret ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                  {isCreatingPaymentIntent
                    ? "Initializing payment..."
                    : "Loading payment form..."}
                </span>
              </div>
            ) : (
              <PaymentProvider clientSecret={clientSecret}>
                <PaymentForm
                  amount={totals.subtotal}
                  currency="INR"
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  loading={paymentStatus === "processing"}
                  showAmount={true}
                  title="Complete Payment"
                  description={`Payment for ${selectedSlot.roomName}`}
                />
              </PaymentProvider>
            )}
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Payment Policy:</strong> Full payment is required to confirm
            your reservation. Card payments are processed securely through
            Stripe. Cash and bank transfer payments will be marked as pending
            until received.
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
            disabled={
              formData.payment.paymentMethod === "card" &&
              (paymentStatus === "processing" ||
                paymentStatus === "idle" ||
                isCreatingPaymentIntent)
            }
            className={`text-white ${
              formData.payment.paymentMethod === "card" &&
              paymentStatus === "succeeded"
                ? "bg-green-600 hover:bg-green-700"
                : formData.payment.paymentMethod === "card"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {formData.payment.paymentMethod === "card"
              ? paymentStatus === "succeeded"
                ? "✓ Payment Complete - Confirm Reservation"
                : paymentStatus === "processing"
                ? "Processing Payment..."
                : isCreatingPaymentIntent
                ? "Initializing Payment..."
                : "Complete Payment Above"
              : "Confirm Reservation"}
          </Button>
        </div>
      </form>
    </div>
  );
};
