// src/lib/webhooks/payment-handlers.ts
import Stripe from "stripe";
import prisma from "@/lib/prisma";

// Payment Intent Event Handlers
export async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  const { reservationId, orgId, propertyId, type } = paymentIntent.metadata;

  if (!reservationId) {
    console.warn("PaymentIntent succeeded without reservationId metadata");
    return;
  }

  if (!orgId || !propertyId) {
    console.warn(
      `PaymentIntent succeeded with missing metadata - orgId: ${orgId}, propertyId: ${propertyId}`
    );
    // Continue processing but log the issue
  }

  try {
    if (type === "reservation_payment") {
      // Update reservation payment status
      await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          paymentStatus: "PAID",
          stripePaymentIntentId: paymentIntent.id,
          paidAmount: paymentIntent.amount / 100,
          updatedAt: new Date()
        }
      });

      // Create payment transaction record
      await prisma.paymentTransaction.create({
        data: {
          reservationId,
          stripePaymentIntentId: paymentIntent.id,
          type: "payment",
          amount: paymentIntent.amount / 100,
          status: "completed",
          currency: paymentIntent.currency.toUpperCase(),
          paymentMethod: paymentIntent.payment_method_types[0]
        }
      });

      // TODO: Send confirmation email to guest
      // TODO: Notify property manager
    } else if (type === "damage_charge") {
      // Handle damage/incidental charges
      await handleDamageChargeSuccess(paymentIntent);
    }

    console.log(`Payment succeeded for reservation ${reservationId}`);
  } catch (error) {
    console.error("Error handling payment success:", error);
    throw error;
  }
}

export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
) {
  const { reservationId, orgId, propertyId } = paymentIntent.metadata;

  if (!reservationId) {
    console.warn("PaymentIntent failed without reservationId metadata");
    return;
  }

  if (!orgId || !propertyId) {
    console.warn(
      `PaymentIntent failed with missing metadata - orgId: ${orgId}, propertyId: ${propertyId}`
    );
  }

  try {
    // Update reservation status
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        paymentStatus: "FAILED",
        updatedAt: new Date()
      }
    });

    // Log failed payment
    await prisma.paymentTransaction.create({
      data: {
        reservationId,
        stripePaymentIntentId: paymentIntent.id,
        type: "payment",
        amount: paymentIntent.amount / 100,
        status: "failed",
        currency: paymentIntent.currency.toUpperCase(),
        failureReason: paymentIntent.last_payment_error?.message
      }
    });

    // TODO: Notify property manager of failed payment
    // TODO: Send payment retry email to guest

    console.log(`Payment failed for reservation ${reservationId}`);
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}

export async function handlePaymentIntentCanceled(
  paymentIntent: Stripe.PaymentIntent
) {
  const { reservationId, orgId, propertyId } = paymentIntent.metadata;

  if (!reservationId) {
    console.warn("PaymentIntent canceled without reservationId metadata");
    return;
  }

  if (!orgId || !propertyId) {
    console.warn(
      `PaymentIntent canceled with missing metadata - orgId: ${orgId}, propertyId: ${propertyId}`
    );
  }

  try {
    // Update reservation status
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        paymentStatus: "CANCELED",
        updatedAt: new Date()
      }
    });

    // Log canceled payment
    await prisma.paymentTransaction.create({
      data: {
        reservationId,
        stripePaymentIntentId: paymentIntent.id,
        type: "payment",
        amount: paymentIntent.amount / 100,
        status: "canceled",
        currency: paymentIntent.currency.toUpperCase()
      }
    });

    console.log(`Payment canceled for reservation ${reservationId}`);
  } catch (error) {
    console.error("Error handling payment cancellation:", error);
  }
}

export async function handlePaymentIntentCreated(
  paymentIntent: Stripe.PaymentIntent
) {
  const { reservationId, orgId, propertyId } = paymentIntent.metadata;

  if (!reservationId) {
    console.warn("PaymentIntent created without reservationId metadata");
    return;
  }

  if (!orgId || !propertyId) {
    console.warn(
      `PaymentIntent created with missing metadata - orgId: ${orgId}, propertyId: ${propertyId}`
    );
  }

  try {
    // Update reservation with payment intent ID if not already set
    await prisma.reservation.updateMany({
      where: {
        id: reservationId,
        stripePaymentIntentId: null
      },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        paymentStatus: "PENDING",
        updatedAt: new Date()
      }
    });

    console.log(`Payment intent created for reservation ${reservationId}`);
  } catch (error) {
    console.error("Error handling payment intent creation:", error);
  }
}

export async function handlePaymentIntentProcessing(
  paymentIntent: Stripe.PaymentIntent
) {
  const { reservationId, orgId, propertyId } = paymentIntent.metadata;

  if (!reservationId) return;

  if (!orgId || !propertyId) {
    console.warn(
      `PaymentIntent processing with missing metadata - orgId: ${orgId}, propertyId: ${propertyId}`
    );
  }

  try {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        paymentStatus: "PROCESSING",
        updatedAt: new Date()
      }
    });

    console.log(`Payment processing for reservation ${reservationId}`);
  } catch (error) {
    console.error("Error handling payment processing:", error);
  }
}

export async function handlePaymentIntentRequiresAction(
  paymentIntent: Stripe.PaymentIntent
) {
  const { reservationId, orgId, propertyId } = paymentIntent.metadata;

  if (!reservationId) return;

  if (!orgId || !propertyId) {
    console.warn(
      `PaymentIntent requires action with missing metadata - orgId: ${orgId}, propertyId: ${propertyId}`
    );
  }

  try {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        paymentStatus: "REQUIRES_ACTION",
        updatedAt: new Date()
      }
    });

    // TODO: Send 3D Secure notification to guest
    console.log(`Payment requires action for reservation ${reservationId}`);
  } catch (error) {
    console.error("Error handling payment requires action:", error);
  }
}

export async function handlePaymentIntentAmountCapturableUpdated(
  paymentIntent: Stripe.PaymentIntent
) {
  const { reservationId, orgId, propertyId } = paymentIntent.metadata;

  if (!reservationId) return;

  if (!orgId || !propertyId) {
    console.warn(
      `PaymentIntent amount capturable updated with missing metadata - orgId: ${orgId}, propertyId: ${propertyId}`
    );
  }

  try {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        amountHeld: paymentIntent.amount_capturable,
        updatedAt: new Date()
      }
    });

    console.log(
      `Capturable amount updated for reservation ${reservationId}: ${paymentIntent.amount_capturable}`
    );
  } catch (error) {
    console.error("Error handling capturable amount update:", error);
  }
}

export async function handlePaymentIntentPartiallyFunded(
  paymentIntent: Stripe.PaymentIntent
) {
  const { reservationId, orgId, propertyId } = paymentIntent.metadata;

  if (!reservationId) return;

  if (!orgId || !propertyId) {
    console.warn(
      `PaymentIntent partially funded with missing metadata - orgId: ${orgId}, propertyId: ${propertyId}`
    );
  }

  try {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        paymentStatus: "PARTIALLY_FUNDED",
        updatedAt: new Date()
      }
    });

    console.log(`Payment partially funded for reservation ${reservationId}`);
  } catch (error) {
    console.error("Error handling partial funding:", error);
  }
}

// Helper function for damage charges
async function handleDamageChargeSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { reservationId } = paymentIntent.metadata;

  // TODO: Implement damage charge handling
  // This would create a separate damage charge record
  console.log(`Damage charge succeeded for reservation ${reservationId}`);
}
