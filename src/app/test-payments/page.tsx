"use client";

import React, { useState } from "react";
import {
  PaymentForm,
  CompactPaymentForm
} from "@/components/payments/PaymentForm";
import {
  PaymentMethodSelector,
  CompactPaymentMethodSelector
} from "@/components/payments/PaymentMethodSelector";
import { PaymentProvider } from "@/components/payments/PaymentProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  TestTube,
  CreditCard,
  CheckCircle,
  XCircle
} from "lucide-react";
import { SavedPaymentMethod, PaymentResult } from "@/lib/payments/types";
import { formatCurrency } from "@/lib/payments/utils";

export default function TestPaymentsPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(
    null
  );
  const [selectedMethodId, setSelectedMethodId] = useState<string | undefined>(
    undefined
  );

  // Mock saved payment methods for testing
  const mockSavedMethods: SavedPaymentMethod[] = [
    {
      id: "pm_1",
      customerId: "cus_test",
      stripePaymentMethodId: "pm_test_1",
      type: "card",
      cardBrand: "visa",
      cardLast4: "4242",
      cardExpMonth: 12,
      cardExpYear: 2025,
      isDefault: true,
      createdAt: new Date()
    },
    {
      id: "pm_2",
      customerId: "cus_test",
      stripePaymentMethodId: "pm_test_2",
      type: "card",
      cardBrand: "mastercard",
      cardLast4: "5555",
      cardExpMonth: 8,
      cardExpYear: 2026,
      isDefault: false,
      createdAt: new Date()
    }
  ];

  // Test amounts
  const testAmount = 150.0; // $150.00
  const testCurrency = "USD";

  // Create a test payment intent
  const createTestPaymentIntent = async () => {
    setLoading(true);
    setError(null);
    setPaymentResult(null);

    try {
      const response = await fetch("/api/test/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: testAmount * 100, // Convert to cents
          currency: testCurrency.toLowerCase(),
          metadata: {
            test: "true",
            source: "payment-test-page"
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment intent");
      }

      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create payment intent"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (result: PaymentResult) => {
    setPaymentResult(result);
    console.log("Payment successful:", result);
  };

  const handlePaymentError = (error: string) => {
    setError(error);
    console.error("Payment failed:", error);
  };

  const handleSelectMethod = (methodId: string | null) => {
    setSelectedMethodId(methodId || undefined);
    console.log("Selected payment method:", methodId);
  };

  const handleAddNewMethod = () => {
    console.log("Add new payment method clicked");
    // In real implementation, this would open a form to add new payment method
  };

  const handleDeleteMethod = async (methodId: string) => {
    console.log("Delete payment method:", methodId);
    // In real implementation, this would call API to delete the method
  };

  const handleSetDefault = async (methodId: string) => {
    console.log("Set default payment method:", methodId);
    // In real implementation, this would call API to set as default
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <TestTube className="h-8 w-8" />
          Payment Components Test
        </h1>
        <p className="text-muted-foreground">
          Test the Stripe Provider and Payment Components integration
        </p>
      </div>

      {/* Test Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={clientSecret ? "default" : "secondary"}>
                {clientSecret ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
              </Badge>
              <span className="text-sm">Payment Intent</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={paymentResult ? "default" : "secondary"}>
                {paymentResult ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
              </Badge>
              <span className="text-sm">Payment Result</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <CreditCard className="h-3 w-3" />
              </Badge>
              <span className="text-sm">
                Test Amount: {formatCurrency(testAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Display */}
      {paymentResult && (
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Payment successful! Payment Intent ID:{" "}
            {paymentResult.paymentIntentId}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="payment-form" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payment-form">Payment Form</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="compact">Compact Forms</TabsTrigger>
        </TabsList>

        {/* Payment Form Test */}
        <TabsContent value="payment-form" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Form Test</CardTitle>
              <p className="text-sm text-muted-foreground">
                Test the main PaymentForm component with Stripe Elements
              </p>
            </CardHeader>
            <CardContent>
              {!clientSecret ? (
                <div className="text-center py-8">
                  <Button
                    onClick={createTestPaymentIntent}
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Payment Intent...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Create Test Payment Intent
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Click to create a test payment intent for{" "}
                    {formatCurrency(testAmount)}
                  </p>
                </div>
              ) : (
                <PaymentProvider clientSecret={clientSecret}>
                  <PaymentForm
                    amount={testAmount}
                    currency={testCurrency}
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    title="Test Payment"
                    description="This is a test payment form using Stripe Elements"
                  />
                </PaymentProvider>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Test */}
        <TabsContent value="payment-methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Selector Test</CardTitle>
              <p className="text-sm text-muted-foreground">
                Test the PaymentMethodSelector component with mock data
              </p>
            </CardHeader>
            <CardContent>
              <PaymentMethodSelector
                savedMethods={mockSavedMethods}
                selectedMethodId={selectedMethodId}
                onSelectMethod={handleSelectMethod}
                onAddNewMethod={handleAddNewMethod}
                onDeleteMethod={handleDeleteMethod}
                onSetDefault={handleSetDefault}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compact Forms Test */}
        <TabsContent value="compact" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Compact Payment Method Selector</CardTitle>
              </CardHeader>
              <CardContent>
                <CompactPaymentMethodSelector
                  savedMethods={mockSavedMethods}
                  selectedMethodId={selectedMethodId}
                  onSelectMethod={handleSelectMethod}
                  onAddNewMethod={handleAddNewMethod}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compact Payment Form</CardTitle>
              </CardHeader>
              <CardContent>
                {clientSecret ? (
                  <PaymentProvider clientSecret={clientSecret}>
                    <CompactPaymentForm
                      amount={testAmount}
                      currency={testCurrency}
                      clientSecret={clientSecret}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  </PaymentProvider>
                ) : (
                  <div className="text-center py-4">
                    <Button
                      onClick={createTestPaymentIntent}
                      disabled={loading}
                    >
                      Create Payment Intent
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Test Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">🧪 How to Test:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                Click &quot;Create Test Payment Intent&quot; to initialize
                Stripe
              </li>
              <li>
                Use Stripe test card:{" "}
                <code className="bg-muted px-1 rounded">
                  4242 4242 4242 4242
                </code>
              </li>
              <li>Use any future expiry date (e.g., 12/25)</li>
              <li>Use any 3-digit CVC (e.g., 123)</li>
              <li>Fill in any name and address</li>
              <li>Click &quot;Pay&quot; to test the payment flow</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium mb-2">✅ What to Verify:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Stripe Elements load with your theme colors</li>
              <li>Payment form accepts test card information</li>
              <li>Payment method selector shows mock saved cards</li>
              <li>Success/error states display correctly</li>
              <li>Dark/light theme switching works</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
