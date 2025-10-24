"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentProvider } from "@/components/payments/PaymentProvider";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { PaymentResult } from "@/lib/payments/types";
import { toast } from "sonner";

interface PaymentTabContentProps {
  amount: number;
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  onPaymentSuccess: (result: PaymentResult) => void;
  clientSecret: string | null;
  paymentStatus: "idle" | "processing" | "succeeded" | "failed";
  isCreatingPaymentIntent: boolean;
  roomName?: string;
  showSaveCard?: boolean;
  saveCard?: boolean;
  onSaveCardChange?: (save: boolean) => void;
  setAsDefault?: boolean;
  onSetAsDefaultChange?: (setDefault: boolean) => void;
  showAddCard?: boolean;
  onAddCardClick?: () => void;
}

export const PaymentTabContent: React.FC<PaymentTabContentProps> = ({
  amount,
  paymentMethod,
  onPaymentMethodChange,
  onPaymentSuccess,
  clientSecret,
  paymentStatus,
  isCreatingPaymentIntent,
  roomName,
  showSaveCard = true,
  saveCard = false,
  onSaveCardChange,
  setAsDefault = false,
  onSetAsDefaultChange,
  showAddCard = false,
  onAddCardClick
}) => {
  const [localSaveCard, setLocalSaveCard] = useState(saveCard);
  const [localSetAsDefault, setLocalSetAsDefault] = useState(setAsDefault);

  const handleSaveCardChange = (checked: boolean) => {
    setLocalSaveCard(checked);
    onSaveCardChange?.(checked);
  };

  const handleSetAsDefaultChange = (checked: boolean) => {
    setLocalSetAsDefault(checked);
    onSetAsDefaultChange?.(checked);
  };

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Select Payment Method
        </h3>

        <RadioGroup
          value={paymentMethod}
          onValueChange={onPaymentMethodChange}
          className="space-y-4"
        >
          {/* Card Payment */}
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
                ₹{amount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Cash Payment */}
          <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
            <RadioGroupItem value="cash" id="cash" />
            <Label htmlFor="cash" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">Pay with Cash</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Payment to be collected at reception
                </p>
              </div>
            </Label>
            <div className="text-right">
              <p className="font-semibold text-amber-600">
                ₹{amount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Bank Transfer */}
          <div className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
            <RadioGroupItem value="bank_transfer" id="bank_transfer" />
            <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">Bank Transfer</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Direct bank transfer payment
                </p>
              </div>
            </Label>
            <div className="text-right">
              <p className="font-semibold text-blue-600">
                ₹{amount.toLocaleString()}
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Card Payment Form */}
      {paymentMethod === "card" && (
        <div className="mt-6 p-4 bg-gray-50 dark:!bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium mb-4 text-gray-900 dark:text-gray-100">
            Complete Your Payment
          </h4>

          {clientSecret ? (
            <PaymentProvider clientSecret={clientSecret}>
              <PaymentForm
                amount={amount}
                currency="INR"
                clientSecret={clientSecret}
                onSuccess={onPaymentSuccess}
                onError={(error) => toast.error(error)}
                loading={paymentStatus === "processing"}
                showAmount={true}
                title="Complete Payment"
                description={
                  roomName ? `Payment for ${roomName}` : "Complete Payment"
                }
              />
            </PaymentProvider>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isCreatingPaymentIntent
                  ? "Initializing payment..."
                  : "Payment form will appear here"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Card Storage Options - Only for card payments */}
      {paymentMethod === "card" && showSaveCard && (
        <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="save-card"
              checked={localSaveCard}
              onCheckedChange={handleSaveCardChange}
            />
            <Label htmlFor="save-card" className="cursor-pointer">
              Save this card for future payments
            </Label>
          </div>

          {localSaveCard && (
            <div className="flex items-center space-x-2 ml-6">
              <Checkbox
                id="set-default"
                checked={localSetAsDefault}
                onCheckedChange={handleSetAsDefaultChange}
              />
              <Label htmlFor="set-default" className="cursor-pointer">
                Set as default payment method
              </Label>
            </div>
          )}

          {showAddCard && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddCardClick}
              className="mt-2"
            >
              + Add Another Card
            </Button>
          )}
        </div>
      )}

      {/* Payment Policy */}
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Payment Policy:</strong> Card payments are processed securely
          through Stripe and confirm your reservation immediately. Cash and bank
          transfer payments will be marked as pending until received.
        </p>
      </div>
    </div>
  );
};
