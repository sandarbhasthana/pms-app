// app/api/payments/authorize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Organization } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reservationId, amount, currency } = (await req.json()) as {
    reservationId: string;
    amount: number; // in cents
    currency: string; // e.g. "usd"
  };

  try {
    // fetch reservation with organization info
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        property: {
          include: { organization: true }
        }
      }
    });

    if (!reservation || !reservation.property)
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );

    const organization = reservation.property.organization;

    // Check if organization has Stripe Connect account
    const orgWithStripe = organization as Organization;
    if (!orgWithStripe.stripeAccountId) {
      return NextResponse.json(
        { error: "Organization payment setup incomplete" },
        { status: 400 }
      );
    }

    // Create PaymentIntent with Stripe Connect
    const intent = await stripe.paymentIntents.create(
      {
        amount,
        currency,
        capture_method: "manual",
        metadata: {
          reservationId,
          orgId: organization.id,
          propertyId: reservation.propertyId || "",
          type: "reservation_payment"
        }
      },
      {
        stripeAccount: orgWithStripe.stripeAccountId
      }
    );

    // Update reservation with payment intent
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        stripePaymentIntentId: intent.id,
        paymentStatus: intent.status,
        amountHeld: intent.amount
      }
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id
    });
  } catch (error) {
    console.error("Payment authorization error:", error);
    return NextResponse.json(
      {
        error: "Payment authorization failed"
      },
      { status: 500 }
    );
  }
}
