// src/components/settings/StripeOnboarding.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StripeStatus {
  hasStripeAccount: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  requirementsCurrentlyDue?: string[];
  requirementsEventuallyDue?: string[];
  accountType?: string;
  country?: string;
  defaultCurrency?: string;
  businessProfile?: {
    name?: string;
    url?: string;
    supportEmail?: string;
  };
}

interface StripeOnboardingProps {
  organizationId: string;
  organizationName: string;
}

export default function StripeOnboarding({
  organizationId,
  organizationName
}: StripeOnboardingProps) {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Stripe account status
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/organizations/stripe-onboarding?organizationId=${organizationId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch Stripe status");
      }

      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Start Stripe onboarding
  const startOnboarding = async () => {
    try {
      setOnboarding(true);
      setError(null);

      const response = await fetch("/api/organizations/stripe-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          organizationId,
          refreshUrl: `${window.location.origin}${window.location.pathname}?refresh=true`,
          returnUrl: `${window.location.origin}${window.location.pathname}?success=true`
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create onboarding link");
      }

      const data = await response.json();

      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start onboarding"
      );
      setOnboarding(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh when returning from Stripe onboarding
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("refresh") || urlParams.get("success")) {
      // Add a small delay to ensure Stripe webhooks have processed
      setTimeout(() => {
        fetchStatus();
      }, 2000);

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [fetchStatus]);

  if (loading) {
    return (
      <Card className="stripe-onboarding-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <CreditCard className="h-5 w-5" />
            Payment Processing Setup
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Configure Stripe Connect for payment processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
            <span className="ml-2 text-gray-700 dark:text-gray-300">
              Loading Stripe status...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="stripe-onboarding-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Processing Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchStatus} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  const getStatusBadge = () => {
    if (!status.hasStripeAccount) {
      return <Badge variant="secondary">Not Set Up</Badge>;
    }
    if (status.onboardingComplete && status.chargesEnabled) {
      return (
        <Badge variant="default" className="bg-green-500">
          Active
        </Badge>
      );
    }
    if (status.hasStripeAccount && !status.onboardingComplete) {
      return <Badge variant="destructive">Setup Incomplete</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <Card
      className="stripe-onboarding-card"
      style={{
        backgroundColor: "var(--card)",
        color: "var(--card-foreground)",
        borderColor: "var(--border)"
      }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Processing Setup
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Configure Stripe Connect to accept payments for {organizationName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!status.hasStripeAccount ? (
          // No Stripe account
          <div className="space-y-4">
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                You need to set up a Stripe Connect account to accept payments.
                This will allow you to process credit card payments, manage
                refunds, and track financial transactions.
              </AlertDescription>
            </Alert>

            <Button
              onClick={startOnboarding}
              disabled={onboarding}
              className="w-full"
            >
              {onboarding ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Setting up Stripe...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Set Up Stripe Connect
                </>
              )}
            </Button>
          </div>
        ) : (
          // Has Stripe account
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">
                  Account Status
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  {status.onboardingComplete && status.chargesEnabled ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400">
                        Ready to accept payments
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                      <span className="text-orange-600 dark:text-orange-400">
                        Setup required
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">
                  Account ID
                </h4>
                <p className="text-sm font-mono mt-1 text-gray-800 dark:text-gray-200">
                  {status.accountId}
                </p>
              </div>
            </div>

            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === "development" && (
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs">
                <strong>Debug:</strong> onboardingComplete:{" "}
                {status.onboardingComplete ? "✅" : "❌"}, chargesEnabled:{" "}
                {status.chargesEnabled ? "✅" : "❌"}
              </div>
            )}

            {status.businessProfile && (
              <div>
                <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Business Profile
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-1">
                  {status.businessProfile.name && (
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      <strong>Name:</strong> {status.businessProfile.name}
                    </p>
                  )}
                  {status.businessProfile.supportEmail && (
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      <strong>Support Email:</strong>{" "}
                      {status.businessProfile.supportEmail}
                    </p>
                  )}
                  {status.businessProfile.url && (
                    <p className="text-sm">
                      <strong>Website:</strong> {status.businessProfile.url}
                    </p>
                  )}
                  {status.country && (
                    <p className="text-sm">
                      <strong>Country:</strong> {status.country.toUpperCase()}
                    </p>
                  )}
                  {status.defaultCurrency && (
                    <p className="text-sm">
                      <strong>Currency:</strong>{" "}
                      {status.defaultCurrency.toUpperCase()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {(status.requirementsCurrentlyDue?.length ||
              status.requirementsEventuallyDue?.length) && (
              <div>
                <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Requirements
                </h4>
                {status.requirementsCurrentlyDue?.length ? (
                  <Alert variant="destructive" className="mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Action Required:</strong>{" "}
                      {status.requirementsCurrentlyDue.join(", ")}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {status.requirementsEventuallyDue?.length ? (
                  <Alert className="mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Eventually Due:</strong>{" "}
                      {status.requirementsEventuallyDue.join(", ")}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            )}

            <div className="flex gap-2">
              {(!status.onboardingComplete || !status.chargesEnabled) && (
                <Button onClick={startOnboarding} disabled={onboarding}>
                  {onboarding ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {status.hasStripeAccount
                        ? "Complete Setup"
                        : "Start Onboarding"}
                    </>
                  )}
                </Button>
              )}

              <Button onClick={fetchStatus} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
