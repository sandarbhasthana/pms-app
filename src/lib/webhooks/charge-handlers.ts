// src/lib/webhooks/charge-handlers.ts
import Stripe from "stripe";
import prisma from "@/lib/prisma";

// Charge Event Handlers
export async function handleChargeSucceeded(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;
  
  if (!paymentIntentId) {
    console.warn("Charge succeeded without payment_intent");
    return;
  }

  try {
    // Find reservation by payment intent
    const reservation = await prisma.reservation.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (reservation) {
      // Update reservation with charge details
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          paymentStatus: 'PAID',
          paidAmount: charge.amount / 100,
          updatedAt: new Date(),
        },
      });

      // Create or update payment transaction
      await prisma.paymentTransaction.upsert({
        where: { 
          reservationId_stripePaymentIntentId: {
            reservationId: reservation.id,
            stripePaymentIntentId: paymentIntentId
          }
        },
        create: {
          reservationId: reservation.id,
          stripePaymentIntentId: paymentIntentId,
          type: 'payment',
          amount: charge.amount / 100,
          status: 'completed',
          currency: charge.currency.toUpperCase(),
          paymentMethod: charge.payment_method_details?.type || 'card',
        },
        update: {
          status: 'completed',
          amount: charge.amount / 100,
          updatedAt: new Date(),
        },
      });

      console.log(`Charge succeeded for reservation ${reservation.id}`);
    }
  } catch (error) {
    console.error('Error handling charge success:', error);
  }
}

export async function handleChargeFailed(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;
  
  if (!paymentIntentId) {
    console.warn("Charge failed without payment_intent");
    return;
  }

  try {
    // Find reservation by payment intent
    const reservation = await prisma.reservation.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (reservation) {
      // Update reservation status
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          paymentStatus: 'FAILED',
          updatedAt: new Date(),
        },
      });

      // Log failed charge
      await prisma.paymentTransaction.create({
        data: {
          reservationId: reservation.id,
          stripePaymentIntentId: paymentIntentId,
          type: 'payment',
          amount: charge.amount / 100,
          status: 'failed',
          currency: charge.currency.toUpperCase(),
          paymentMethod: charge.payment_method_details?.type || 'card',
          failureReason: charge.failure_message || 'Unknown error',
        },
      });

      console.log(`Charge failed for reservation ${reservation.id}: ${charge.failure_message}`);
    }
  } catch (error) {
    console.error('Error handling charge failure:', error);
  }
}

export async function handleChargePending(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;
  
  if (!paymentIntentId) return;

  try {
    const reservation = await prisma.reservation.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (reservation) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          paymentStatus: 'PENDING',
          updatedAt: new Date(),
        },
      });

      console.log(`Charge pending for reservation ${reservation.id}`);
    }
  } catch (error) {
    console.error('Error handling charge pending:', error);
  }
}

export async function handleChargeCaptured(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;
  
  if (!paymentIntentId) return;

  try {
    const reservation = await prisma.reservation.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (reservation) {
      // Update reservation with captured amount
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          paymentStatus: 'PAID',
          amountCaptured: charge.amount / 100,
          paidAmount: charge.amount / 100,
          updatedAt: new Date(),
        },
      });

      // Update payment transaction
      await prisma.paymentTransaction.upsert({
        where: { 
          reservationId_stripePaymentIntentId: {
            reservationId: reservation.id,
            stripePaymentIntentId: paymentIntentId
          }
        },
        create: {
          reservationId: reservation.id,
          stripePaymentIntentId: paymentIntentId,
          type: 'capture',
          amount: charge.amount / 100,
          status: 'completed',
          currency: charge.currency.toUpperCase(),
          paymentMethod: charge.payment_method_details?.type || 'card',
        },
        update: {
          type: 'capture',
          status: 'completed',
          amount: charge.amount / 100,
          updatedAt: new Date(),
        },
      });

      console.log(`Charge captured for reservation ${reservation.id}`);
    }
  } catch (error) {
    console.error('Error handling charge capture:', error);
  }
}

export async function handleChargeUpdated(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;
  
  if (!paymentIntentId) return;

  try {
    const reservation = await prisma.reservation.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (reservation) {
      // Update reservation with latest charge info
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          updatedAt: new Date(),
        },
      });

      console.log(`Charge updated for reservation ${reservation.id}`);
    }
  } catch (error) {
    console.error('Error handling charge update:', error);
  }
}

export async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;
  
  if (!paymentIntentId) return;

  try {
    const reservation = await prisma.reservation.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (reservation && charge.refunds?.data.length) {
      const refund = charge.refunds.data[0];
      
      // Update reservation refund status
      const currentRefunded = reservation.refundedAmount || 0;
      const newRefundAmount = refund.amount / 100;
      const totalRefunded = currentRefunded + newRefundAmount;
      
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          refundedAmount: totalRefunded,
          paymentStatus: refund.amount === charge.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          updatedAt: new Date(),
        },
      });

      // Create or update refund record
      await prisma.refund.upsert({
        where: { stripeRefundId: refund.id },
        create: {
          stripeRefundId: refund.id,
          reservationId: reservation.id,
          amount: newRefundAmount,
          status: refund.status || "pending",
          reason: refund.reason,
        },
        update: { 
          status: refund.status || "pending",
          amount: newRefundAmount,
        }
      });

      // Log refund transaction
      await prisma.paymentTransaction.create({
        data: {
          reservationId: reservation.id,
          stripeRefundId: refund.id,
          type: 'refund',
          amount: newRefundAmount,
          status: 'completed',
          currency: refund.currency.toUpperCase(),
          reason: refund.reason,
        },
      });

      console.log(`Charge refunded for reservation ${reservation.id}: $${newRefundAmount}`);
    }
  } catch (error) {
    console.error('Error handling charge refund:', error);
  }
}
