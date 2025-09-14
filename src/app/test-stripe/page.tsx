"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  CreditCard,
  Webhook,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Play,
  Database,
  Settings,
  XCircle
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  stripeAccountId?: string;
  stripeOnboardingComplete: boolean;
  stripeChargesEnabled: boolean;
}

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

interface WebhookEvent {
  id: string;
  type: string;
  processed: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

// Helper function to convert Stripe requirement keys to user-friendly descriptions
const getRequirementDescription = (requirement: string): string => {
  const requirementMap: { [key: string]: string } = {
    // Individual requirements
    "individual.verification.document": "Government-issued ID verification",
    "individual.verification.additional_document":
      "Additional identity document",
    "individual.first_name": "First name",
    "individual.last_name": "Last name",
    "individual.email": "Email address",
    "individual.phone": "Phone number",
    "individual.dob.day": "Date of birth (day)",
    "individual.dob.month": "Date of birth (month)",
    "individual.dob.year": "Date of birth (year)",
    "individual.address.line1": "Street address",
    "individual.address.city": "City",
    "individual.address.state": "State/Province",
    "individual.address.postal_code": "Postal/ZIP code",
    "individual.address.country": "Country",
    "individual.ssn_last_4": "Last 4 digits of SSN",
    "individual.id_number": "Tax ID number",

    // Business requirements
    business_type: "Business type",
    "company.name": "Company name",
    "company.tax_id": "Business tax ID",
    "company.phone": "Business phone number",
    "company.address.line1": "Business address",
    "company.address.city": "Business city",
    "company.address.state": "Business state/province",
    "company.address.postal_code": "Business postal code",
    "company.address.country": "Business country",
    "company.verification.document": "Business verification document",

    // Bank account requirements
    external_account: "Bank account information",
    "tos_acceptance.date": "Terms of service acceptance",
    "tos_acceptance.ip": "Terms acceptance IP address",

    // Other common requirements
    "business_profile.mcc": "Business category code",
    "business_profile.url": "Business website",
    "business_profile.product_description": "Business description",
    "relationship.representative": "Authorized representative information",
    "relationship.owner": "Business owner information",
    "relationship.executive": "Business executive information"
  };

  return (
    requirementMap[requirement] ||
    requirement.replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
};

export default function TestStripePage() {
  const { data: session, status } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Fetch user's organizations
  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
        if (data.organizations?.length > 0 && !selectedOrgId) {
          setSelectedOrgId(data.organizations[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
      setError("Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId]);

  // Fetch Stripe status for selected organization
  const fetchStripeStatus = useCallback(async () => {
    if (!selectedOrgId) return;

    try {
      const response = await fetch(
        `/api/organizations/stripe-onboarding?organizationId=${selectedOrgId}`
      );
      if (response.ok) {
        const data = await response.json();
        setStripeStatus(data);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch Stripe status");
      }
    } catch (error) {
      console.error("Failed to fetch Stripe status:", error);
      setError("Failed to fetch Stripe status");
    }
  }, [selectedOrgId]);

  // Fetch recent webhook events
  const fetchWebhookEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/webhooks/events");
      if (response.ok) {
        const data = await response.json();
        setWebhookEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch webhook events:", error);
    }
  }, []);

  // Start Stripe onboarding
  const startOnboarding = async () => {
    if (!selectedOrgId) return;

    try {
      setOnboarding(true);
      setError(null);

      const response = await fetch("/api/organizations/stripe-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          refreshUrl: `${window.location.origin}/test-stripe?refresh=true`,
          returnUrl: `${window.location.origin}/test-stripe?success=true`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create onboarding link");
      }

      const data = await response.json();
      window.location.href = data.onboardingUrl;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start onboarding"
      );
      setOnboarding(false);
    }
  };

  // Test webhook endpoint
  const testWebhook = async (eventType: string) => {
    if (!selectedOrgId || !stripeStatus?.accountId) {
      setError("Need Stripe account to test webhooks");
      return;
    }

    try {
      setTestingWebhook(eventType);
      setError(null);

      const response = await fetch("/api/test/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          accountId: stripeStatus.accountId,
          organizationId: selectedOrgId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to test webhook");
      }

      // Refresh webhook events and status
      await Promise.all([fetchWebhookEvents(), fetchStripeStatus()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test webhook");
    } finally {
      setTestingWebhook(null);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchOrganizations();
    }
  }, [session, fetchOrganizations]);

  useEffect(() => {
    if (selectedOrgId) {
      fetchStripeStatus();
      fetchWebhookEvents();
    }
  }, [selectedOrgId, fetchStripeStatus, fetchWebhookEvents]);

  // Auto-refresh on URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("refresh") || urlParams.get("success")) {
      setTimeout(() => {
        fetchStripeStatus();
        fetchWebhookEvents();
      }, 1000);
    }
  }, [fetchStripeStatus, fetchWebhookEvents]);

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to test Stripe functionality
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId);

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
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
            <CreditCard className="h-6 w-6" />
            🧪 Stripe Integration Test Suite
          </CardTitle>
          <CardDescription>
            Test Stripe Connect onboarding, webhooks, and payment processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Organization:
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">Select an organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}{" "}
                    {org.stripeAccountId ? "(Has Stripe)" : "(No Stripe)"}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={fetchOrganizations} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Orgs
              </Button>
              <Button onClick={fetchStripeStatus} variant="outline" size="sm">
                <Database className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
              <Button onClick={fetchWebhookEvents} variant="outline" size="sm">
                <Webhook className="h-4 w-4 mr-2" />
                Refresh Events
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedOrg && (
        <Tabs defaultValue="onboarding" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="events">Event Log</TabsTrigger>
          </TabsList>

          {/* Onboarding Tab */}
          <TabsContent value="onboarding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Stripe Connect Onboarding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stripeStatus && (
                  <div className="bg-gray-50 dark:!bg-gray-800 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      {stripeStatus.hasStripeAccount &&
                      stripeStatus.onboardingComplete &&
                      stripeStatus.chargesEnabled ? (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white border-green-600 dark:bg-green-600 dark:hover:bg-green-700 dark:border-green-500 shadow-sm">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : stripeStatus.hasStripeAccount ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 dark:border-amber-500 shadow-sm">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Setup Required
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-500 hover:bg-gray-600 text-white border-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 dark:border-gray-500 shadow-sm">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Set Up
                        </Badge>
                      )}
                    </div>

                    {stripeStatus.accountId && (
                      <p className="text-sm">
                        <strong>Account ID:</strong> {stripeStatus.accountId}
                      </p>
                    )}

                    {stripeStatus.requirementsCurrentlyDue &&
                      stripeStatus.requirementsCurrentlyDue.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2 text-red-600">
                            <strong>Requirements Due:</strong>
                          </p>
                          <ul className="text-sm text-gray-700 dark:text-[#f0f8ff] space-y-1">
                            {stripeStatus.requirementsCurrentlyDue.map(
                              (req, index) => (
                                <li
                                  key={index}
                                  className="flex items-center gap-2"
                                >
                                  <span className="text-red-500 leading-none">
                                    •
                                  </span>
                                  <span>{getRequirementDescription(req)}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                )}

                <div className="flex gap-2">
                  {!stripeStatus?.hasStripeAccount ||
                  !stripeStatus?.onboardingComplete ? (
                    <Button
                      onClick={startOnboarding}
                      disabled={onboarding || !selectedOrgId}
                      className="bg-[#7210a2] dark:bg-[#8b4aff] hover:bg-purple-600 dark:hover:bg-[#8b4aff]/90 text-[#f0f8ff]"
                    >
                      {onboarding ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {stripeStatus?.hasStripeAccount
                            ? "Complete Setup"
                            : "Start Onboarding"}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Badge className="bg-green-500 px-4 py-2">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Onboarding Complete
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            <Card className="stripe-onboarding-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhook Testing
                </CardTitle>
                <CardDescription>
                  Test individual webhook events (requires Stripe account)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      type: "account.updated",
                      label: "Account Updated",
                      category: "Account"
                    },
                    {
                      type: "payment_intent.succeeded",
                      label: "Payment Succeeded",
                      category: "Payment"
                    },
                    {
                      type: "payment_intent.payment_failed",
                      label: "Payment Failed",
                      category: "Payment"
                    },
                    {
                      type: "charge.succeeded",
                      label: "Charge Succeeded",
                      category: "Charge"
                    },
                    {
                      type: "charge.failed",
                      label: "Charge Failed",
                      category: "Charge"
                    },
                    {
                      type: "charge.refunded",
                      label: "Charge Refunded",
                      category: "Charge"
                    }
                  ].map((webhook) => (
                    <Card key={webhook.type} className="p-4">
                      <div className="space-y-2">
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {webhook.category}
                          </Badge>
                          <h4 className="font-medium text-sm mt-1">
                            {webhook.label}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {webhook.type}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => testWebhook(webhook.type)}
                          disabled={
                            testingWebhook === webhook.type ||
                            !stripeStatus?.accountId
                          }
                          className="w-full"
                        >
                          {testingWebhook === webhook.type ? (
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3 mr-1" />
                          )}
                          Test
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card className="stripe-onboarding-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Recent Webhook Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {webhookEvents.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {webhookEvents.map((event) => (
                      <div
                        key={event.id}
                        className="border rounded p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{event.type}</span>
                          <div className="flex items-center gap-2">
                            {event.processed ? (
                              <Badge className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Processed
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Failed</Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(event.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          ID: {event.id}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No webhook events found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
