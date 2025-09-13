// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Import webhook handlers
import {
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handlePaymentIntentCanceled,
  handlePaymentIntentCreated,
  handlePaymentIntentProcessing,
  handlePaymentIntentRequiresAction,
  handlePaymentIntentAmountCapturableUpdated,
  handlePaymentIntentPartiallyFunded
} from "@/lib/webhooks/payment-handlers";

import {
  handleChargeSucceeded,
  handleChargeFailed,
  handleChargePending,
  handleChargeCaptured,
  handleChargeUpdated,
  handleChargeRefunded
} from "@/lib/webhooks/charge-handlers";

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

  // Idempotency check - prevent duplicate processing
  try {
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id }
    });

    if (existingEvent) {
      console.log(`Event ${event.id} already processed`);
      return NextResponse.json({ received: true, status: "already_processed" });
    }
  } catch (error) {
    console.error("Error checking webhook idempotency:", error);
    // Continue processing if idempotency check fails
  }

  try {
    // Process the webhook event
    await handleWebhookEvent(event);

    // Log successful processing
    await prisma.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        processedAt: new Date(),
        data: event.data.object as unknown as Prisma.InputJsonValue
      }
    });

    return NextResponse.json({ received: true, status: "processed" });
  } catch (error) {
    console.error(`Webhook processing failed for event ${event.id}:`, error);

    // Log failed processing attempt
    try {
      await prisma.webhookEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          processedAt: new Date(),
          data: event.data.object as unknown as Prisma.InputJsonValue,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });
    } catch (logError) {
      console.error("Failed to log webhook error:", logError);
    }

    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

// Main webhook event handler
async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    // Phase 1: Essential Payment Processing
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(
        event.data.object as Stripe.PaymentIntent
      );
      break;
    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(
        event.data.object as Stripe.PaymentIntent
      );
      break;
    case "payment_intent.canceled":
      await handlePaymentIntentCanceled(
        event.data.object as Stripe.PaymentIntent
      );
      break;
    case "payment_intent.created":
      await handlePaymentIntentCreated(
        event.data.object as Stripe.PaymentIntent
      );
      break;
    case "payment_intent.processing":
      await handlePaymentIntentProcessing(
        event.data.object as Stripe.PaymentIntent
      );
      break;
    case "payment_intent.requires_action":
      await handlePaymentIntentRequiresAction(
        event.data.object as Stripe.PaymentIntent
      );
      break;
    case "payment_intent.amount_capturable_updated":
      await handlePaymentIntentAmountCapturableUpdated(
        event.data.object as Stripe.PaymentIntent
      );
      break;
    case "payment_intent.partially_funded":
      await handlePaymentIntentPartiallyFunded(
        event.data.object as Stripe.PaymentIntent
      );
      break;
    case "charge.succeeded":
      await handleChargeSucceeded(event.data.object as Stripe.Charge);
      break;
    case "charge.failed":
      await handleChargeFailed(event.data.object as Stripe.Charge);
      break;
    case "charge.pending":
      await handleChargePending(event.data.object as Stripe.Charge);
      break;
    case "charge.captured":
      await handleChargeCaptured(event.data.object as Stripe.Charge);
      break;
    case "charge.updated":
      await handleChargeUpdated(event.data.object as Stripe.Charge);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }
}
