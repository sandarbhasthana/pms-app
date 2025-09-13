// app/api/payments/refund/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Type for Organization with Stripe fields
type OrganizationWithStripe = {
  id: string;
  name: string;
  domain: string | null;
  createdAt: Date;
  updatedAt: Date;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  stripeChargesEnabled: boolean;
};

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reservationId, amount, reason } = (await req.json()) as {
    reservationId: string;
    amount?: number; // in cents; if omitted, full refund
    reason?: string; // refund reason
  };

  try {
    // Load reservation with organization info
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        property: {
          include: { organization: true }
        }
      }
    });

    if (!reservation?.stripePaymentIntentId || !reservation.property) {
      return NextResponse.json(
        { error: "No payment to refund" },
        { status: 400 }
      );
    }

    const organization = reservation.property.organization;
    const orgWithStripe = organization as OrganizationWithStripe;

    // Check if organization has Stripe Connect account
    if (!orgWithStripe.stripeAccountId) {
      return NextResponse.json(
        { error: "Organization payment setup incomplete" },
        { status: 400 }
      );
    }

    // Fetch PaymentIntent from connected account
    const intent = await stripe.paymentIntents.retrieve(
      reservation.stripePaymentIntentId,
      {},
      {
        stripeAccount: orgWithStripe.stripeAccountId
      }
    );

    if (!intent.latest_charge) {
      return NextResponse.json(
        { error: "No charge found for payment intent" },
        { status: 400 }
      );
    }

    // Retrieve charge details from connected account
    const charge = await stripe.charges.retrieve(
      intent.latest_charge as string,
      {},
      {
        stripeAccount: orgWithStripe.stripeAccountId
      }
    );

    // Create refund on connected account
    const refund = await stripe.refunds.create(
      {
        charge: charge.id,
        amount, // omit for full refund
        reason:
          (reason as "duplicate" | "fraudulent" | "requested_by_customer") ||
          "requested_by_customer",
        metadata: {
          reservationId,
          orgId: organization.id
        }
      },
      {
        stripeAccount: orgWithStripe.stripeAccountId
      }
    );

    // Save refund record
    await prisma.refund.create({
      data: {
        stripeRefundId: refund.id,
        reservationId,
        amount: refund.amount / 100, // Convert to dollars
        status: refund.status || "pending"
      }
    });

    // Update reservation status if fully refunded
    const isFull = refund.amount === charge.amount;
    if (isFull) {
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { paymentStatus: "refunded" }
      });
    } else {
      // Partial refund
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { paymentStatus: "partially_refunded" }
      });
    }

    return NextResponse.json({
      status: refund.status,
      amount: refund.amount / 100,
      refundId: refund.id
    });
  } catch (error) {
    console.error("Refund processing error:", error);
    return NextResponse.json(
      { error: "Refund processing failed" },
      { status: 500 }
    );
  }
}
