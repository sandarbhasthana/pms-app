"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { EditTabProps, Payment } from "./types";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PaymentProvider } from "@/components/payments/PaymentProvider";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { toast } from "sonner";
import { PaymentResult } from "@/lib/payments/types";
import { Textarea } from "@/components/ui/textarea";

export const EditPaymentTab: React.FC<EditTabProps> = ({
  reservationData,
  formData,
  updateFormData,
  availableRooms,
  onPrevious,
  onSave,
  onDelete,
  onUpdate,
  setEditingReservation,
  onStatusUpdate
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "succeeded" | "failed"
  >("idle");
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(
    null
  );
  const [verificationNotes, setVerificationNotes] = useState<{
    [key: string]: string;
  }>({});

  // Track if we've already created a payment intent to prevent duplicate creation
  const paymentIntentCreatedRef = useRef(false);

  // Calculate number of nights
  // TODO: Update to use calculateNightsWithSixAMBoundary with timezone when available
  const calculateNights = useCallback(() => {
    if (!formData.checkIn || !formData.checkOut) return 0;
    const checkIn = new Date(formData.checkIn);
    const checkOut = new Date(formData.checkOut);
    return Math.max(
      1,
      Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
  }, [formData.checkIn, formData.checkOut]);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const nights = calculateNights();

    // Calculate add-ons total first
    let addonsTotal = 0;
    if (formData.addons.extraBed) {
      addonsTotal += 500 * formData.addons.extraBedQuantity * nights;
    }
    if (formData.addons.breakfast) {
      addonsTotal += 300 * formData.addons.breakfastQuantity * nights;
    }

    formData.addons.customAddons.forEach((addon) => {
      const addonTotal =
        addon.price * addon.quantity * (addon.perNight ? nights : 1);
      addonsTotal += addonTotal;
    });

    // Calculate room rate - use depositAmount if available (this is the actual quoted price from rates API)
    // Otherwise fall back to room base price
    let basePrice = 0;
    let totalReservationAmount = 0;

    // First priority: Use depositAmount (stored in cents, contains actual quoted price)
    if (reservationData.depositAmount && reservationData.depositAmount > 0) {
      totalReservationAmount = reservationData.depositAmount / 100; // Convert from cents
      basePrice = totalReservationAmount; // This is the total room price for all nights
      console.log(
        `📊 Using depositAmount as total: ₹${totalReservationAmount} (from rates API)`
      );
    } else {
      // Fallback: Calculate from room base price
      const currentRoom = availableRooms?.find(
        (room) => room.id === formData.roomId
      );

      if (currentRoom?.basePrice) {
        basePrice = currentRoom.basePrice * nights;
        totalReservationAmount = basePrice;
        console.log(
          `📊 Using room base price: ₹${currentRoom.basePrice} × ${nights} nights = ₹${basePrice}`
        );
      } else {
        console.warn(
          `Room ${formData.roomId} not found in availableRooms. Using fallback calculation.`
        );
        basePrice = 0;
        totalReservationAmount = 0;
      }
    }

    const paidAmount = reservationData.paidAmount || 0;

    console.log(`📊 Calculate Totals Debug:`, {
      status: reservationData.status,
      basePrice,
      totalReservationAmount,
      addonsTotal,
      paidAmount,
      depositAmount: reservationData.depositAmount
    });

    // For CONFIRMATION_PENDING: Calculate balance as (room + addons - paid)
    // For other statuses: Room rate is already paid, so balance = (addons - (paid - room))
    let subtotal: number;
    let remainingBalance: number;

    if (reservationData.status === "CONFIRMATION_PENDING") {
      // Include room rate in total for pending confirmations
      subtotal = totalReservationAmount + addonsTotal;
      remainingBalance = subtotal - paidAmount;
    } else {
      // For confirmed/checked-in bookings: room rate is already paid
      // Only addons are outstanding
      subtotal = addonsTotal;
      // Subtract room rate from paid amount to get credit available for addons
      const creditAvailable = paidAmount - basePrice;
      remainingBalance = subtotal - creditAvailable;
    }

    return {
      basePrice,
      addonsTotal,
      subtotal,
      paidAmount,
      remainingBalance,
      nights
    };
  }, [
    formData,
    availableRooms,
    calculateNights,
    reservationData.status,
    reservationData.paidAmount,
    reservationData.depositAmount
  ]);

  const totals = calculateTotals();

  // Create payment intent when card payment is selected
  const createPaymentIntent = useCallback(
    async (amount: number) => {
      setIsCreatingPaymentIntent(true);
      try {
        const requestBody = {
          amount: Math.round(amount * 100), // Convert to cents
          currency: "inr",
          metadata: {
            reservationId: reservationData.id,
            roomId: formData.roomId,
            roomName: availableRooms?.find((r) => r.id === formData.roomId)
              ?.name,
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            guestName: formData.guestName,
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
        setClientSecret(null);
      } finally {
        setIsCreatingPaymentIntent(false);
      }
    },
    [
      reservationData.id,
      formData.roomId,
      formData.checkIn,
      formData.checkOut,
      formData.guestName,
      formData.email,
      formData.phone,
      availableRooms
    ]
  );

  // Handle payment method change
  const handlePaymentMethodChange = useCallback(
    async (method: string) => {
      // Update form data
      updateFormData({
        payment: {
          ...formData.payment,
          paymentMethod: method
        }
      });

      // Auto-initialize PaymentIntent when card is selected (better UX)
      if (method === "card" && totals.remainingBalance > 0) {
        // Auto-create PaymentIntent immediately for smooth UX
        await createPaymentIntent(totals.remainingBalance);
      } else {
        // Clear payment intent for non-card payments
        setClientSecret(null);
        setPaymentStatus("idle");
      }
    },
    [
      formData.payment,
      updateFormData,
      totals.remainingBalance,
      createPaymentIntent
    ]
  );

  // Fetch pending payments on mount
  useEffect(() => {
    const fetchPendingPayments = async () => {
      if (!reservationData?.id) return;

      try {
        const res = await fetch(`/api/reservations/${reservationData.id}`, {
          credentials: "include"
        });

        if (res.ok) {
          const data = await res.json();
          // Filter for pending payments (cash/bank_transfer)
          const pending = (data.payments || []).filter(
            (p: Payment) => p.status === "PENDING"
          );
          setPendingPayments(pending);
          console.log(`📋 Found ${pending.length} pending payments`);
        }
      } catch (error) {
        console.error("Error fetching pending payments:", error);
      }
    };

    fetchPendingPayments();
  }, [reservationData?.id]);

  // Create PaymentIntent on mount if card is already selected
  // Only create once per reservation to prevent duplicate payment intents
  useEffect(() => {
    if (
      formData.payment.paymentMethod === "card" &&
      !clientSecret &&
      !isCreatingPaymentIntent &&
      totals.remainingBalance > 0 &&
      !paymentIntentCreatedRef.current
    ) {
      paymentIntentCreatedRef.current = true;
      createPaymentIntent(totals.remainingBalance);
    } else if (formData.payment.paymentMethod !== "card") {
      // Reset the flag when switching away from card payment
      paymentIntentCreatedRef.current = false;
    }
  }, [
    formData.payment.paymentMethod,
    clientSecret,
    isCreatingPaymentIntent,
    totals.remainingBalance,
    createPaymentIntent
  ]);

  // Handle payment success
  const handlePaymentSuccess = useCallback(
    async (result: PaymentResult) => {
      if (result.success) {
        toast.success("Payment processed successfully!");
        setPaymentStatus("idle");
        setClientSecret(null);
        onSave?.();
      } else {
        toast.error(result.error || "Payment failed");
      }
    },
    [onSave]
  );

  // Handle payment verification
  const handleVerifyPayment = useCallback(
    async (paymentId: string) => {
      if (!reservationData?.id) {
        toast.error("Reservation ID not found");
        return;
      }

      const notes = verificationNotes[paymentId] || "";

      try {
        setVerifyingPaymentId(paymentId);
        console.log(`🔵 Verifying payment ${paymentId}...`);

        const response = await fetch(
          `/api/reservations/${reservationData.id}/payments/${paymentId}/verify`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              verificationNotes: notes
            })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error(`❌ Verification Error:`, error);
          throw new Error(error.error || "Failed to verify payment");
        }

        const result = await response.json();
        console.log(`✅ Payment verified:`, result);

        toast.success("Payment verified successfully!");

        // Update pending payments list
        setPendingPayments((prev) => prev.filter((p) => p.id !== paymentId));

        // Clear verification notes for this payment
        setVerificationNotes((prev) => {
          const updated = { ...prev };
          delete updated[paymentId];
          return updated;
        });

        // Trigger hard refresh after payment verification
        console.log("🔄 Triggering hard refresh after payment verification...");
        setTimeout(() => {
          console.log("🔄 Performing hard refresh...");
          window.location.reload();
        }, 500);
      } catch (error) {
        console.error("Error verifying payment:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to verify payment"
        );
      } finally {
        setVerifyingPaymentId(null);
      }
    },
    [reservationData?.id, verificationNotes]
  );

  // Handle cash payment recording
  const handleCashPaymentSave = useCallback(async () => {
    if (!reservationData?.id) {
      toast.error("Reservation ID not found");
      return;
    }

    // Validate that remaining balance is positive
    if (totals.remainingBalance <= 0) {
      toast.error(
        "No outstanding balance to pay. All charges have been settled."
      );
      return;
    }

    try {
      console.log("🌐 Sending payment request to API...");
      console.log(`   URL: /api/reservations/${reservationData.id}/payment`);
      console.log(`   Amount: ${totals.remainingBalance}`);
      console.log(`   Method: cash`);

      // Record the cash payment
      const response = await fetch(
        `/api/reservations/${reservationData.id}/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            amount: totals.remainingBalance,
            paymentMethod: "cash"
          })
        }
      );

      console.log(`📊 API Response Status: ${response.status}`);

      if (!response.ok) {
        const error = await response.json();
        console.error(`❌ API Error:`, error);
        throw new Error(error.error || "Failed to record cash payment");
      }

      const responseData = await response.json();
      console.log(`✅ Payment API Success:`, responseData);

      toast.success("Cash payment recorded successfully!");

      // Check if reservation is now fully paid and needs auto-confirmation
      const updatedReservation = responseData.reservation;
      if (
        updatedReservation &&
        updatedReservation.paymentStatus === "PAID" &&
        updatedReservation.status === "CONFIRMATION_PENDING"
      ) {
        console.log("✅ Payment complete - Auto-confirming reservation...");
        // Auto-confirm the reservation
        if (onStatusUpdate) {
          try {
            await onStatusUpdate(
              "CONFIRMED",
              "Auto-confirmed: Full payment received"
            );
            console.log("✅ Reservation auto-confirmed");
          } catch (statusError) {
            console.error("Error auto-confirming reservation:", statusError);
            toast.error("Payment recorded but auto-confirmation failed");
          }
        }
      }

      // Refresh calendar and close sheet
      if (onUpdate && setEditingReservation) {
        try {
          console.log("🔄 Triggering calendar refresh after cash payment...");
          // Call onUpdate with empty data to trigger calendar refresh
          await onUpdate(reservationData.id, {});
          console.log("✅ Calendar refresh completed");
          // Close the sheet
          setEditingReservation(null);

          // Trigger hard refresh after payment
          console.log("🔄 Triggering hard refresh after cash payment...");
          setTimeout(() => {
            console.log("🔄 Performing hard refresh...");
            window.location.reload();
          }, 500);
        } catch (refreshError) {
          console.error("Error refreshing calendar:", refreshError);
          // Still close the sheet even if refresh fails
          setEditingReservation(null);
          toast.error("Payment recorded but calendar refresh failed");

          // Still do hard refresh even if refresh fails
          setTimeout(() => {
            console.log("🔄 Performing hard refresh after error...");
            window.location.reload();
          }, 500);
        }
      } else {
        console.warn(
          "onUpdate or setEditingReservation not available, using fallback"
        );
        // Fallback to onSave if onUpdate is not available
        onSave?.();
      }
    } catch (error) {
      console.error("Error recording cash payment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to record cash payment"
      );
    }
  }, [
    reservationData?.id,
    totals.remainingBalance,
    onUpdate,
    setEditingReservation,
    onSave,
    onStatusUpdate
  ]);

  return (
    <div className="space-y-6">
      {/* Reservation Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Reservation Summary</h3>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Check-in</p>
            <p className="font-semibold">{formData.checkIn}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Check-out</p>
            <p className="font-semibold">{formData.checkOut}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Guest</p>
            <p className="font-semibold">{formData.guestName}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Room</p>
            <p className="font-semibold">
              {availableRooms?.find((r) => r.id === formData.roomId)?.name}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Guests</p>
            <p className="font-semibold">
              {formData.adults} Adults, {formData.children} Children
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
            <span>₹{totals.basePrice.toLocaleString("en-IN")}</span>
          </div>

          {formData.addons.extraBed && (
            <div className="flex justify-between text-blue-600 dark:text-blue-400">
              <span>
                Extra Bed × {formData.addons.extraBedQuantity} × {totals.nights}{" "}
                night{totals.nights > 1 ? "s" : ""}
              </span>
              <span>
                ₹
                {(
                  500 *
                  formData.addons.extraBedQuantity *
                  totals.nights
                ).toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {formData.addons.breakfast && (
            <div className="flex justify-between text-blue-600 dark:text-blue-400">
              <span>
                Breakfast × {formData.addons.breakfastQuantity} ×{" "}
                {totals.nights} night{totals.nights > 1 ? "s" : ""}
              </span>
              <span>
                ₹
                {(
                  300 *
                  formData.addons.breakfastQuantity *
                  totals.nights
                ).toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {formData.addons.customAddons.map((addon) => (
            <div
              key={addon.id}
              className="flex justify-between text-blue-600 dark:text-blue-400"
            >
              <span>
                {addon.name} × {addon.quantity}
                {addon.perNight
                  ? ` × ${totals.nights} night${totals.nights > 1 ? "s" : ""}`
                  : ""}
              </span>
              <span>
                ₹
                {(
                  addon.price *
                  addon.quantity *
                  (addon.perNight ? totals.nights : 1)
                ).toLocaleString("en-IN")}
              </span>
            </div>
          ))}

          <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
            <div className="flex justify-between">
              <span>Accommodation Subtotal</span>
              <span>₹{totals.subtotal.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {totals.remainingBalance > 0 && (
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>Outstanding Balance</span>
              <span>₹{totals.remainingBalance.toLocaleString("en-IN")}</span>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
            <div className="flex justify-between font-semibold text-lg">
              <span>Total Payment Due</span>
              <span className="text-purple-600 dark:text-purple-400">
                ₹{totals.remainingBalance.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Payment Status</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Paid
            </p>
            <p className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
              ₹{totals.paidAmount.toLocaleString("en-IN")}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Total
            </p>
            <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
              ₹{totals.subtotal.toLocaleString("en-IN")}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Balance Due
            </p>
            <p
              className={`text-2xl font-mono font-bold ${
                totals.remainingBalance > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              ₹{totals.remainingBalance.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Verification Section - Show pending payments */}
      {pendingPayments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">
            Verify Pending Payments
          </h3>

          <div className="space-y-4">
            {pendingPayments.map((payment) => (
              <div
                key={payment.id}
                className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {payment.method === "cash"
                        ? "💵 Cash Payment"
                        : "🏦 Bank Transfer"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Amount: ₹{payment.amount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Recorded: {new Date(payment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">
                    PENDING
                  </span>
                </div>

                <div className="mb-3">
                  <Label
                    htmlFor={`notes-${payment.id}`}
                    className="text-sm font-medium mb-2 block"
                  >
                    Verification Notes
                  </Label>
                  <Textarea
                    id={`notes-${payment.id}`}
                    placeholder="e.g., Received at front desk, Deposited to bank account, Cheque #12345..."
                    value={verificationNotes[payment.id] || ""}
                    onChange={(e) =>
                      setVerificationNotes((prev) => ({
                        ...prev,
                        [payment.id]: e.target.value
                      }))
                    }
                    className="min-h-20 text-sm"
                  />
                </div>

                <Button
                  onClick={() => handleVerifyPayment(payment.id)}
                  disabled={verifyingPaymentId === payment.id}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {verifyingPaymentId === payment.id ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Verifying...
                    </>
                  ) : (
                    "✓ Mark as Verified"
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Make Payment Section - Always visible */}
      {totals.remainingBalance > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Make Payment</h3>

          {totals.remainingBalance <= 0 ? (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>✓ All charges settled.</strong> No outstanding balance
                to pay.
              </p>
            </div>
          ) : (
            <RadioGroup
              value={formData.payment.paymentMethod}
              onValueChange={handlePaymentMethodChange}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <RadioGroupItem value="card" id="card-make" />
                <Label htmlFor="card-make" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Pay with Credit/Debit Card</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Secure payment processing via Stripe
                    </p>
                  </div>
                </Label>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    ₹{totals.remainingBalance.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <RadioGroupItem value="cash" id="cash-make" />
                <Label htmlFor="cash-make" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Cash Payment</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Collect payment in cash at check-in
                    </p>
                  </div>
                </Label>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">
                    ₹{totals.remainingBalance.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <RadioGroupItem value="bank_transfer" id="bank_transfer-make" />
                <Label
                  htmlFor="bank_transfer-make"
                  className="flex-1 cursor-pointer"
                >
                  <div>
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Direct bank transfer or wire transfer
                    </p>
                  </div>
                </Label>
                <div className="text-right">
                  <p className="font-semibold text-orange-600">
                    ₹{totals.remainingBalance.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </RadioGroup>
          )}

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
                    amount={totals.remainingBalance}
                    currency="INR"
                    clientSecret={clientSecret}
                    reservationId={reservationData.id}
                    onSuccess={handlePaymentSuccess}
                    onError={(error: string) => {
                      setPaymentStatus("failed");
                      toast.error(`Payment failed: ${error}`);
                    }}
                    onCardSave={(cardDetails) => {
                      console.log("✅ Card saved:", cardDetails);
                      toast.success("Card saved successfully for future use!");
                    }}
                    loading={paymentStatus === "processing"}
                    showAmount={true}
                    title="Complete Payment"
                    description={`Payment for ${
                      availableRooms?.find((r) => r.id === formData.roomId)
                        ?.name
                    }`}
                  />
                </PaymentProvider>
              )}
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Payment Policy:</strong> Card payments are processed
              securely through Stripe and confirm your reservation immediately.
              Cash and bank transfer payments will be marked as pending until
              received.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        {onPrevious && (
          <Button onClick={onPrevious} variant="outline">
            ← Back: Add-ons
          </Button>
        )}
        <div className="flex gap-2">
          <Button
            onClick={onDelete}
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Delete Booking
          </Button>
          <Button
            onClick={() => {
              console.log("💾 Save Changes clicked");
              console.log(
                `   Payment Method: ${formData.payment.paymentMethod}`
              );
              console.log(`   Remaining Balance: ${totals.remainingBalance}`);
              console.log(
                `   Database Paid Amount: ${reservationData.paidAmount}`
              );
              console.log(
                `   Database Payment Status: ${reservationData.paymentStatus}`
              );

              // Check if payment needs to be recorded
              // If cash payment is selected and database shows unpaid/partial payment, record the payment
              const needsPaymentRecording =
                formData.payment.paymentMethod === "cash" &&
                (reservationData.paymentStatus === "UNPAID" ||
                  reservationData.paymentStatus === "PARTIALLY_PAID");

              if (needsPaymentRecording && totals.remainingBalance > 0) {
                console.log("🔵 Calling handleCashPaymentSave...");
                handleCashPaymentSave();
              } else if (
                totals.remainingBalance === 0 &&
                reservationData.status === "CONFIRMATION_PENDING" &&
                (reservationData.paymentStatus === "PAID" ||
                  reservationData.paymentStatus === "PARTIALLY_PAID")
              ) {
                // Auto-confirm reservation when fully paid
                console.log("✅ Auto-confirming reservation (fully paid)...");
                onStatusUpdate?.("CONFIRMED", "Auto-confirmed: Fully paid");
              } else {
                console.log("⚪ Calling onSave fallback...");
                // For other payment methods or no balance, just save
                onSave?.();
              }
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};
