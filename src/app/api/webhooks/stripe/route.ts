// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")!;
  const buf = Buffer.from(await req.arrayBuffer());
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    console.error("Webhook signature mismatch:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const resId = intent.metadata.reservationId;
      await prisma.reservation.update({
        where: { id: resId },
        data: { paymentStatus: intent.status }
      });
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const refund = charge.refunds?.data[0];
      if (refund && charge.metadata.reservationId) {
        // record refund if not already in DB
        await prisma.refund.upsert({
          where: { stripeRefundId: refund.id },
          create: {
            stripeRefundId: refund.id,
            reservationId: charge.metadata.reservationId,
            amount: refund.amount,
            status: refund.status || "pending"
          },
          update: { status: refund.status || "pending" }
        });
      }
      break;
    }
    // handle other events as needed…
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
