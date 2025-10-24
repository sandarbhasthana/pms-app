import { useState, useCallback } from "react";
import { toast } from "sonner";

interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

interface ProcessPaymentParams {
  reservationId?: string;
  amount: number;
  paymentMethod: "card" | "cash" | "bank_transfer";
  creditCard?: {
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    paymentMethodId: string;
    paymentIntentId?: string;
    stripePaymentIntentId?: string;
  };
  saveCard?: boolean;
  setAsDefault?: boolean;
  metadata?: Record<string, string>;
}

interface PaymentResult {
  success: boolean;
  data?: {
    payment: {
      id: string;
      reservationId: string;
      amount: number;
      method: string;
      status: string;
    };
    reservation: {
      id: string;
      status: string;
      paymentStatus: string;
      paidAmount: number;
      totalAmount: number;
    };
  };
  error?: string;
}

export function usePaymentProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "succeeded" | "failed"
  >("idle");

  // Create payment intent for new bookings
  const createPaymentIntent = useCallback(
    async (amount: number, metadata?: Record<string, string>) => {
      setIsProcessing(true);
      try {
        const requestBody = {
          amount: Math.round(amount * 100), // Convert to cents
          currency: "inr",
          metadata
        };

        const response = await fetch("/api/test/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to create payment intent: ${response.status} ${errorText}`
          );
        }

        const data: PaymentIntentResponse = await response.json();

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          return data;
        } else {
          throw new Error("No clientSecret received from server");
        }
      } catch (error) {
        console.error("Error creating payment intent:", error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  // Process payment for existing reservations
  const processPayment = useCallback(
    async (params: ProcessPaymentParams): Promise<PaymentResult> => {
      setIsProcessing(true);
      setPaymentStatus("processing");

      try {
        const { reservationId, ...paymentData } = params;

        if (!reservationId) {
          throw new Error("Reservation ID is required");
        }

        const response = await fetch(
          `/api/reservations/${reservationId}/payment`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paymentData)
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Payment processing failed");
        }

        const result = await response.json();
        setPaymentStatus("succeeded");
        return { success: true, data: result };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Payment failed";
        setPaymentStatus("failed");
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const resetPaymentState = useCallback(() => {
    setClientSecret(null);
    setPaymentStatus("idle");
    setIsProcessing(false);
  }, []);

  return {
    isProcessing,
    clientSecret,
    paymentStatus,
    createPaymentIntent,
    processPayment,
    resetPaymentState,
    setPaymentStatus,
    setClientSecret
  };
}
