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
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId }
  });
  if (!reservation || !reservation.stripePaymentIntentId) {
    return NextResponse.json(
      { error: "No authorized payment found" },
      { status: 400 }
    );
  }

  // 1) capture on Stripe
  const captured = await stripe.paymentIntents.capture(
    reservation.stripePaymentIntentId
  );

  // 2) record capture in our tables
  //    get the charge ID and amount from latest_charge
  if (!captured.latest_charge) {
    return NextResponse.json(
      { error: "No charge found for payment intent" },
      { status: 400 }
    );
  }

  // Retrieve the charge details
  const charge = await stripe.charges.retrieve(
    captured.latest_charge as string
  );
  await prisma.$transaction([
    prisma.payment.create({
      data: {
        reservationId,
        type: "capture",
        method: charge.payment_method_details?.type || "card",
        status: charge.status,
        amount: charge.amount / 100, // convert to your float currency units if desired
        currency: charge.currency,
        gatewayTxId: charge.id
      }
    }),
    prisma.reservation.update({
      where: { id: reservationId },
      data: {
        paymentStatus: captured.status,
        amountCaptured: captured.amount
      }
    })
  ]);

  return NextResponse.json({ status: captured.status });
}
