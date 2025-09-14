// src/app/api/test/webhooks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mock webhook event data generators
const generateMockEventData = (eventType: string, accountId: string, organizationId: string) => {
  const baseEvent = {
    id: `evt_test_${Date.now()}`,
    object: "event",
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: eventType,
  };

  switch (eventType) {
    case 'account.updated':
      return {
        ...baseEvent,
        data: {
          object: {
            id: accountId,
            object: "account",
            business_profile: {
              name: "Test Business",
              support_email: "test@example.com",
            },
            charges_enabled: true,
            country: "US",
            default_currency: "usd",
            details_submitted: true,
            payouts_enabled: true,
            requirements: {
              currently_due: [],
              eventually_due: [],
              past_due: [],
              pending_verification: [],
            },
            type: "standard",
            metadata: {
              organizationId: organizationId,
            },
          },
        },
      };

    case 'payment_intent.succeeded':
      return {
        ...baseEvent,
        data: {
          object: {
            id: `pi_test_${Date.now()}`,
            object: "payment_intent",
            amount: 5000,
            currency: "usd",
            status: "succeeded",
            metadata: {
              reservationId: `res_test_${Date.now()}`,
              orgId: organizationId,
              propertyId: `prop_test_${Date.now()}`,
              type: "reservation_payment",
            },
          },
        },
      };

    case 'payment_intent.payment_failed':
      return {
        ...baseEvent,
        data: {
          object: {
            id: `pi_test_${Date.now()}`,
            object: "payment_intent",
            amount: 5000,
            currency: "usd",
            status: "requires_payment_method",
            last_payment_error: {
              code: "card_declined",
              message: "Your card was declined.",
            },
            metadata: {
              reservationId: `res_test_${Date.now()}`,
              orgId: organizationId,
              propertyId: `prop_test_${Date.now()}`,
              type: "reservation_payment",
            },
          },
        },
      };

    case 'charge.succeeded':
      return {
        ...baseEvent,
        data: {
          object: {
            id: `ch_test_${Date.now()}`,
            object: "charge",
            amount: 5000,
            currency: "usd",
            status: "succeeded",
            payment_intent: `pi_test_${Date.now()}`,
            metadata: {
              reservationId: `res_test_${Date.now()}`,
              orgId: organizationId,
              propertyId: `prop_test_${Date.now()}`,
              type: "reservation_payment",
            },
          },
        },
      };

    case 'charge.failed':
      return {
        ...baseEvent,
        data: {
          object: {
            id: `ch_test_${Date.now()}`,
            object: "charge",
            amount: 5000,
            currency: "usd",
            status: "failed",
            failure_code: "card_declined",
            failure_message: "Your card was declined.",
            payment_intent: `pi_test_${Date.now()}`,
            metadata: {
              reservationId: `res_test_${Date.now()}`,
              orgId: organizationId,
              propertyId: `prop_test_${Date.now()}`,
              type: "reservation_payment",
            },
          },
        },
      };

    case 'charge.refunded':
      return {
        ...baseEvent,
        data: {
          object: {
            id: `ch_test_${Date.now()}`,
            object: "charge",
            amount: 5000,
            amount_refunded: 2500,
            currency: "usd",
            status: "succeeded",
            refunded: true,
            payment_intent: `pi_test_${Date.now()}`,
            metadata: {
              reservationId: `res_test_${Date.now()}`,
              orgId: organizationId,
              propertyId: `prop_test_${Date.now()}`,
              type: "reservation_payment",
            },
          },
        },
      };

    default:
      throw new Error(`Unsupported event type: ${eventType}`);
  }
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventType, accountId, organizationId } = await request.json();

    if (!eventType || !accountId || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: eventType, accountId, organizationId" },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const userOrg = await prisma.userOrg.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: { in: ["OWNER", "ORG_ADMIN"] },
      },
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
        { status: 403 }
      );
    }

    // Generate mock event data
    const mockEvent = generateMockEventData(eventType, accountId, organizationId);

    // Process the mock webhook event through our webhook handler
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature', // Mock signature for testing
      },
      body: JSON.stringify(mockEvent),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      throw new Error(`Webhook processing failed: ${errorText}`);
    }

    return NextResponse.json({
      success: true,
      message: `Mock ${eventType} event processed successfully`,
      eventId: mockEvent.id,
    });

  } catch (error) {
    console.error("Error testing webhook:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to test webhook",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
