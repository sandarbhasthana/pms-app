// app/api/payments/capture/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reservationId } = (await req.json()) as { reservationId: string };

  try {
    // Fetch reservation with organization info
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        property: {
          include: { organization: true }
        }
      }
    });

    if (
      !reservation ||
      !reservation.stripePaymentIntentId ||
      !reservation.property
    ) {
      return NextResponse.json(
        { error: "No authorized payment found" },
        { status: 400 }
      );
    }

    const organization = reservation.property.organization;
    const orgWithStripe = organization as typeof organization & {
      stripeAccountId: string;
    };

    // Check if organization has Stripe Connect account
    if (!orgWithStripe.stripeAccountId) {
      return NextResponse.json(
        { error: "Organization payment setup incomplete" },
        { status: 400 }
      );
    }

    // Capture payment on connected account
    const captured = await stripe.paymentIntents.capture(
      reservation.stripePaymentIntentId,
      {},
      {
        stripeAccount: orgWithStripe.stripeAccountId
      }
    );

    // Get charge details
    if (!captured.latest_charge) {
      return NextResponse.json(
        { error: "No charge found for payment intent" },
        { status: 400 }
      );
    }

    // Retrieve the charge details from connected account
    const charge = await stripe.charges.retrieve(
      captured.latest_charge as string,
      {},
      {
        stripeAccount: orgWithStripe.stripeAccountId
      }
    );

    // Record capture in database
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          reservationId,
          type: "capture",
          method: charge.payment_method_details?.type || "card",
          status: charge.status,
          amount: charge.amount / 100,
          currency: charge.currency,
          gatewayTxId: charge.id
        }
      }),
      prisma.reservation.update({
        where: { id: reservationId },
        data: {
          paymentStatus: captured.status,
          amountCaptured: captured.amount / 100
        }
      })
    ]);

    return NextResponse.json({
      status: captured.status,
      amount: captured.amount / 100
    });
  } catch (error) {
    console.error("Payment capture error:", error);
    return NextResponse.json(
      { error: "Payment capture failed" },
      { status: 500 }
    );
  }
}
