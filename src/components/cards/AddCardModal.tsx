"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCardIcon } from "@heroicons/react/24/outline";
import {
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { PaymentProvider } from "@/components/payments/PaymentProvider";
import { toast } from "sonner";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardAdded?: () => void;
  reservationId: string;
}

const AddCardModalContent: React.FC<{
  isLoading: boolean;
  setAsDefault: boolean;
  setSetAsDefault: (value: boolean) => void;
  onClose: () => void;
  onCardAdded?: () => void;
  reservationId: string;
  setIsLoading: (value: boolean) => void;
}> = ({
  isLoading,
  setAsDefault,
  setSetAsDefault,
  onClose,
  onCardAdded,
  reservationId,
  setIsLoading
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState("");

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe has not loaded yet. Please try again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Confirm the setup intent to save the card
      console.log("Confirming setup with client secret...");
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}`
        },
        redirect: "if_required"
      });

      if (stripeError) {
        console.error("Stripe error:", stripeError);
        setError(stripeError.message || "Failed to save card");
        toast.error(stripeError.message || "Failed to save card");
      } else if (setupIntent) {
        console.log("Setup intent confirmed:", setupIntent);
        // Save the payment method to our database
        if (setupIntent.payment_method) {
          console.log("Saving payment method:", setupIntent.payment_method);
          const response = await fetch(
            `/api/reservations/${reservationId}/payment-methods`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                stripePaymentMethodId: setupIntent.payment_method,
                saveCard: true,
                setAsDefault,
                cardholderName
              })
            }
          );

          console.log("Save response status:", response.status);
          if (response.ok) {
            const data = await response.json();
            console.log("Card saved successfully:", data);
            toast.success("Card added successfully!");
            onCardAdded?.();
            onClose();
          } else {
            const errorData = await response.json();
            console.error("Failed to save card:", errorData);
            toast.error(
              errorData.error || "Failed to save card to reservation"
            );
          }
        } else {
          console.warn("No payment method in setup intent");
          toast.error("No payment method found in setup intent");
        }
      } else {
        console.warn("No setup intent returned");
        toast.error("Failed to confirm card setup");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      console.error("Error adding card:", err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleAddCard} className="space-y-4">
      {/* Cardholder Name Field */}
      <div className="space-y-2">
        <label
          htmlFor="cardholderName"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Cardholder Name
        </label>
        <input
          type="text"
          id="cardholderName"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          disabled={isLoading}
          className="w-full px-3 py-2 bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:text-[#f0f8ff] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          required
        />
      </div>

      {/* Stripe Payment Element */}
      <div className="space-y-2">
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card"],
            fields: {
              billingDetails: "auto"
            }
          }}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Set as Default Checkbox */}
      <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <input
          type="checkbox"
          id="setAsDefault"
          checked={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
          disabled={isLoading}
          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
        />
        <label
          htmlFor="setAsDefault"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          Set as default payment method
        </label>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          🔒 Your card information is secure and encrypted through Stripe
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !stripe || !elements}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isLoading ? "Adding..." : "Add Card"}
        </Button>
      </div>
    </form>
  );
};

export const AddCardModal: React.FC<AddCardModalProps> = ({
  isOpen,
  onClose,
  onCardAdded,
  reservationId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingSetupIntent, setIsCreatingSetupIntent] = useState(false);

  const createSetupIntent = useCallback(async () => {
    setIsCreatingSetupIntent(true);
    try {
      const response = await fetch("/api/setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId })
      });

      if (response.ok) {
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } else {
        const errorData = await response.json();
        console.error("Setup intent error:", errorData);
        toast.error(errorData.error || "Failed to initialize card form");
      }
    } catch (error) {
      console.error("Error creating setup intent:", error);
      toast.error("Failed to initialize card form");
    } finally {
      setIsCreatingSetupIntent(false);
    }
  }, [reservationId]);

  // Create SetupIntent when modal opens
  useEffect(() => {
    if (isOpen && !clientSecret) {
      createSetupIntent();
    }
  }, [isOpen, clientSecret, createSetupIntent]);

  // Reset clientSecret when modal closes
  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden overflow-x-hidden w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription>
            Add a new card to this reservation for future payments
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isCreatingSetupIntent || !clientSecret ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">
                Initializing form...
              </span>
            </div>
          ) : (
            <PaymentProvider clientSecret={clientSecret}>
              <AddCardModalContent
                isLoading={isLoading}
                setAsDefault={setAsDefault}
                setSetAsDefault={setSetAsDefault}
                onClose={onClose}
                onCardAdded={onCardAdded}
                reservationId={reservationId}
                setIsLoading={setIsLoading}
              />
            </PaymentProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCardModal;
