// app/api/payments/refund/route.ts
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

  const { reservationId, amount } = (await req.json()) as {
    reservationId: string;
    amount?: number; // in cents; if omitted, full refund
  };

  // load reservation + paymentIntent
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId }
  });
  if (!reservation?.stripePaymentIntentId) {
    return NextResponse.json(
      { error: "No payment to refund" },
      { status: 400 }
    );
  }

  // fetch the PaymentIntent to get its latest charge
  const intent = await stripe.paymentIntents.retrieve(
    reservation.stripePaymentIntentId
  );
  if (!intent.latest_charge) {
    return NextResponse.json(
      { error: "No charge found for payment intent" },
      { status: 400 }
    );
  }

  // Retrieve the charge details
  const charge = await stripe.charges.retrieve(intent.latest_charge as string);

  // create refund
  const refund = await stripe.refunds.create({
    charge: charge.id,
    amount // omit for full refund
  });

  // save refund record
  await prisma.refund.create({
    data: {
      stripeRefundId: refund.id,
      reservationId,
      amount: refund.amount,
      status: refund.status || "pending"
    }
  });

  // optionally update reservation status if full refunded
  const isFull = refund.amount === charge.amount;
  if (isFull) {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { paymentStatus: "refunded" }
    });
  }

  return NextResponse.json({ status: refund.status });
}
