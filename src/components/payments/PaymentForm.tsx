"use client";

import React, { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/payments/utils";
import { PaymentResult, Currency, PaymentStatus } from "@/lib/payments/types";

interface PaymentFormProps {
  amount: number;
  currency?: Currency;
  clientSecret: string;
  onSuccess?: (result: PaymentResult) => void;
  onError?: (error: string) => void;
  loading?: boolean;
  disabled?: boolean;
  showAmount?: boolean;
  title?: string;
  description?: string;
}

export function PaymentForm({
  amount,
  currency = "USD",
  clientSecret,
  onSuccess,
  onError,
  loading = false,
  disabled = false,
  showAmount = true,
  title = "Payment Details",
  description
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "succeeded" | "failed"
  >("idle");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe has not loaded yet. Please try again.");
      return;
    }

    if (!clientSecret) {
      setError("Payment setup incomplete. Please try again.");
      return;
    }

    if (isProcessing || loading || disabled) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPaymentStatus("processing");

    try {
      // Confirm the payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment(
        {
          elements,
          confirmParams: {
            // Return URL after payment (will be handled by webhook)
            return_url: `${window.location.origin}/booking/confirmation`
          },
          redirect: "if_required" // Only redirect if required by payment method
        }
      );

      if (stripeError) {
        // Payment failed
        setError(stripeError.message || "Payment failed. Please try again.");
        setPaymentStatus("failed");
        onError?.(stripeError.message || "Payment failed");
      } else if (paymentIntent) {
        // Payment succeeded
        setPaymentStatus("succeeded");
        const result: PaymentResult = {
          success: true,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status as PaymentStatus
        };
        onSuccess?.(result);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setPaymentStatus("failed");
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormDisabled =
    !stripe || !elements || isProcessing || loading || disabled;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {showAmount && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Total Amount:</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(amount, currency)}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Element - Stripe's unified payment form */}
          <div className="space-y-2">
            <PaymentElement
              options={{
                layout: "tabs",
                paymentMethodOrder: ["card"],
                fields: {
                  billingDetails: "auto"
                },
                terms: {
                  card: "auto"
                }
              }}
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {paymentStatus === "succeeded" && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Payment successful! Your booking is being confirmed.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isFormDisabled}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : paymentStatus === "succeeded" ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Payment Complete
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay {formatCurrency(amount, currency)}
              </>
            )}
          </Button>

          {/* Payment Security Notice */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>🔒 Your payment information is secure and encrypted</p>
            <p>Powered by Stripe • PCI DSS Compliant</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Simplified payment form for quick payments
export function SimplePaymentForm({
  amount,
  currency = "USD",
  clientSecret,
  onSuccess,
  onError,
  className = ""
}: Omit<PaymentFormProps, "title" | "description" | "showAmount"> & {
  className?: string;
}) {
  return (
    <div className={className}>
      <PaymentForm
        amount={amount}
        currency={currency}
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onError={onError}
        showAmount={false}
        title="Complete Payment"
      />
    </div>
  );
}

// Payment form with custom styling for modals/sheets
export function CompactPaymentForm({
  amount,
  currency = "USD",
  clientSecret,
  onSuccess,
  onError
}: Omit<PaymentFormProps, "title" | "description" | "showAmount">) {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || isProcessing) return;

    if (!clientSecret) {
      setError("Payment setup incomplete. Please try again.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment(
        {
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/booking/confirmation`
          },
          redirect: "if_required"
        }
      );

      if (stripeError) {
        setError(stripeError.message || "Payment failed");
        onError?.(stripeError.message || "Payment failed");
      } else if (paymentIntent) {
        onSuccess?.({
          success: true,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status as PaymentStatus
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Payment failed";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">Total:</span>
        <span className="text-lg font-bold">
          {formatCurrency(amount, currency)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card"],
            fields: {
              billingDetails: "auto"
            }
          }}
        />

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${formatCurrency(amount, currency)}`
          )}
        </Button>
      </form>
    </div>
  );
}
