// app/api/payments/authorize/route.ts
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

  const { reservationId, amount, currency } = (await req.json()) as {
    reservationId: string;
    amount: number; // in cents
    currency: string; // e.g. "usd"
  };

  // fetch reservation to verify ownership (optional)
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId }
  });
  if (!reservation)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 1) create PaymentIntent
  const intent = await stripe.paymentIntents.create({
    amount,
    currency,
    capture_method: "manual",
    metadata: { reservationId }
  });

  // 2) persist
  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      stripePaymentIntentId: intent.id,
      paymentStatus: intent.status,
      amountHeld: intent.amount
    }
  });

  return NextResponse.json({ clientSecret: intent.client_secret });
}
