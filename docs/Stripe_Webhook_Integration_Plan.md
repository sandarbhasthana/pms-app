# Stripe Webhook Integration with New Booking Payment System

## 📋 Overview

This document outlines the complete implementation plan for integrating Stripe webhooks with the New Booking Payment system in the PMS application. The goal is to create a seamless, real-time payment processing flow that automatically updates booking status based on webhook events.

## 🎯 Current State

### ✅ What's Already Working

- **Stripe webhook system** - Fully functional with event logging
- **Webhook testing interface** - `/test-stripe` page with comprehensive testing
- **Event handlers** - Processing payment_intent, charge, and account events
- **Database logging** - All webhook events stored and tracked
- **New Booking Sheet** - Multi-tab interface with Payment tab

### ❓ What Needs Integration

- Connect webhook events to booking payment status
- Real-time payment status updates in UI
- Automatic booking confirmation on successful payment
- Error handling for failed payments

## 🏗️ Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Reservations Table Extensions

```sql
-- Add payment tracking columns to Reservations table
ALTER TABLE Reservations ADD COLUMN stripe_payment_intent_id VARCHAR(255);
ALTER TABLE Reservations ADD COLUMN stripe_charge_id VARCHAR(255);
ALTER TABLE Reservations ADD COLUMN payment_status ENUM('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded') DEFAULT 'pending';
ALTER TABLE Reservations ADD COLUMN total_amount DECIMAL(10,2);
ALTER TABLE Reservations ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE Reservations ADD COLUMN payment_method VARCHAR(50);
ALTER TABLE Reservations ADD COLUMN paid_at TIMESTAMP NULL;
ALTER TABLE Reservations ADD COLUMN payment_failed_at TIMESTAMP NULL;
ALTER TABLE Reservations ADD COLUMN payment_failure_reason TEXT;

-- Add indexes for performance
CREATE INDEX idx_reservations_payment_intent ON Reservations(stripe_payment_intent_id);
CREATE INDEX idx_reservations_payment_status ON Reservations(payment_status);
```

#### 1.2 Payment Transactions Table (Optional)

```sql
-- Create separate table for detailed payment tracking
CREATE TABLE PaymentTransactions (
  id VARCHAR(36) PRIMARY KEY,
  reservation_id VARCHAR(36) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'),
  payment_method VARCHAR(50),
  failure_reason TEXT,
  stripe_fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (reservation_id) REFERENCES Reservations(id) ON DELETE CASCADE,
  INDEX idx_payment_transactions_reservation (reservation_id),
  INDEX idx_payment_transactions_payment_intent (stripe_payment_intent_id)
);
```

### Phase 2: API Endpoints

#### 2.1 Payment Intent Creation

```typescript
// /api/bookings/create-payment-intent
export async function POST(request: NextRequest) {
  const { reservationId, amount, currency = "usd" } = await request.json();

  try {
    // Create PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        reservationId,
        organizationId: session.user.organizationId
      }
    });

    // Update reservation with PaymentIntent ID
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: "pending",
        total_amount: amount
      }
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### 2.2 Payment Status Check

```typescript
// /api/bookings/payment-status/[paymentIntentId]
export async function GET(
  request: NextRequest,
  { params }: { params: { paymentIntentId: string } }
) {
  try {
    const reservation = await prisma.reservation.findFirst({
      where: { stripe_payment_intent_id: params.paymentIntentId },
      select: {
        id: true,
        payment_status: true,
        paid_at: true,
        payment_failure_reason: true
      }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: reservation.payment_status,
      paidAt: reservation.paid_at,
      failureReason: reservation.payment_failure_reason
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### 2.3 Payment Confirmation

```typescript
// /api/bookings/confirm-payment
export async function POST(request: NextRequest) {
  const { paymentIntentId } = await request.json();

  try {
    // Retrieve PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Update reservation based on PaymentIntent status
    const updateData: any = {
      payment_status:
        paymentIntent.status === "succeeded" ? "succeeded" : "failed"
    };

    if (paymentIntent.status === "succeeded") {
      updateData.paid_at = new Date();
      updateData.paid_amount = paymentIntent.amount / 100; // Convert from cents
    }

    const reservation = await prisma.reservation.update({
      where: { stripe_payment_intent_id: paymentIntentId },
      data: updateData
    });

    return NextResponse.json({ reservation });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Phase 3: Enhanced Webhook Handlers

#### 3.1 Payment Intent Success Handler

```typescript
// lib/webhooks/payment-handlers.ts
export async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  try {
    // Find reservation by PaymentIntent ID
    const reservation = await prisma.reservation.findFirst({
      where: { stripe_payment_intent_id: paymentIntent.id }
    });

    if (!reservation) {
      console.log(
        `No reservation found for PaymentIntent: ${paymentIntent.id}`
      );
      return;
    }

    // Update reservation status
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        payment_status: "succeeded",
        paid_amount: paymentIntent.amount / 100,
        paid_at: new Date(),
        payment_method: paymentIntent.payment_method_types[0]
      }
    });

    // Trigger post-payment actions
    await handleSuccessfulPayment(reservation);

    console.log(`Payment succeeded for reservation: ${reservation.id}`);
  } catch (error) {
    console.error("Error handling payment_intent.succeeded:", error);
    throw error;
  }
}
```

#### 3.2 Payment Intent Failed Handler

```typescript
export async function handlePaymentIntentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  try {
    const reservation = await prisma.reservation.findFirst({
      where: { stripe_payment_intent_id: paymentIntent.id }
    });

    if (!reservation) return;

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        payment_status: "failed",
        payment_failed_at: new Date(),
        payment_failure_reason:
          paymentIntent.last_payment_error?.message || "Payment failed"
      }
    });

    // Trigger failure handling
    await handleFailedPayment(
      reservation,
      paymentIntent.last_payment_error?.message
    );

    console.log(`Payment failed for reservation: ${reservation.id}`);
  } catch (error) {
    console.error("Error handling payment_intent.payment_failed:", error);
    throw error;
  }
}
```

#### 3.3 Business Logic Handlers

```typescript
// lib/webhooks/business-logic.ts
async function handleSuccessfulPayment(reservation: any) {
  // 1. Send confirmation email
  await sendBookingConfirmationEmail(reservation);

  // 2. Block room availability
  await updateRoomAvailability(reservation);

  // 3. Create calendar events
  await createCalendarEvents(reservation);

  // 4. Notify staff
  await notifyStaff(reservation);

  // 5. Update analytics
  await updateBookingAnalytics(reservation);
}

async function handleFailedPayment(reservation: any, reason?: string) {
  // 1. Send payment failure notification
  await sendPaymentFailureEmail(reservation, reason);

  // 2. Release room hold (if applicable)
  await releaseRoomHold(reservation);

  // 3. Log failure for analytics
  await logPaymentFailure(reservation, reason);
}
```

## 🔄 UI Integration

### Phase 4: New Booking Payment Tab Updates

#### 4.1 Payment Processing Component

```typescript
// components/bookings/booking-tabs/BookingPaymentTab.tsx
const [paymentStatus, setPaymentStatus] = useState<
  "idle" | "processing" | "succeeded" | "failed"
>("idle");
const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
const [clientSecret, setClientSecret] = useState<string | null>(null);

const handlePayment = async (amount: number) => {
  try {
    setPaymentStatus("processing");

    // Create PaymentIntent
    const response = await fetch("/api/bookings/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reservationId: bookingData.id,
        amount,
        currency: "usd"
      })
    });

    const { clientSecret, paymentIntentId } = await response.json();
    setClientSecret(clientSecret);
    setPaymentIntentId(paymentIntentId);

    // Start polling for status updates
    startPaymentStatusPolling(paymentIntentId);
  } catch (error) {
    setPaymentStatus("failed");
    console.error("Payment creation failed:", error);
  }
};
```

#### 4.2 Real-time Status Polling

```typescript
const startPaymentStatusPolling = (paymentIntentId: string) => {
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(
        `/api/bookings/payment-status/${paymentIntentId}`
      );
      const { status, paidAt, failureReason } = await response.json();

      setPaymentStatus(status);

      if (status === "succeeded") {
        clearInterval(pollInterval);
        // Show success message and redirect
        onPaymentSuccess();
      } else if (status === "failed") {
        clearInterval(pollInterval);
        // Show error message
        onPaymentFailure(failureReason);
      }
    } catch (error) {
      console.error("Status polling error:", error);
    }
  }, 2000); // Poll every 2 seconds

  // Clear interval after 5 minutes to prevent infinite polling
  setTimeout(() => clearInterval(pollInterval), 300000);
};
```

#### 4.3 Payment Status UI Components

```typescript
const PaymentStatusIndicator = ({ status }: { status: string }) => {
  switch (status) {
    case "processing":
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Processing payment...</span>
        </div>
      );
    case "succeeded":
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Payment successful!</span>
        </div>
      );
    case "failed":
      return (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="h-4 w-4" />
          <span>Payment failed</span>
        </div>
      );
    default:
      return null;
  }
};
```

## 🧪 Testing Strategy

### Phase 5: Comprehensive Testing

#### 5.1 Local Development Testing

```bash
# Terminal 1: Start development server
npm run dev

# Terminal 2: Forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Test payment flows
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

#### 5.2 Test Scenarios

1. **Happy Path Testing:**

   - Create new booking
   - Process payment successfully
   - Verify webhook updates booking status
   - Confirm booking completion

2. **Failure Path Testing:**

   - Create booking with invalid payment
   - Verify failure webhook handling
   - Test retry payment flow
   - Confirm proper error messaging

3. **Edge Case Testing:**
   - Duplicate webhook events
   - Network timeouts during payment
   - Partial refunds
   - Payment method changes

#### 5.3 Production Testing Checklist

- [ ] Webhook endpoints configured in Stripe Dashboard
- [ ] Environment variables set correctly
- [ ] Database schema updated
- [ ] Payment flow end-to-end tested
- [ ] Error handling verified
- [ ] Email notifications working
- [ ] Analytics tracking functional

## 🚀 Deployment Strategy

### Phase 6: Production Deployment

#### 6.1 Pre-deployment Checklist

- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Stripe webhook endpoints updated
- [ ] Payment processing tested in staging
- [ ] Error monitoring setup
- [ ] Backup procedures verified

#### 6.2 Deployment Steps

1. **Deploy database changes** (run migrations)
2. **Deploy application code** to Vercel/production
3. **Update Stripe webhook URLs** to production endpoints
4. **Test webhook delivery** with Stripe Dashboard
5. **Monitor payment processing** for first few transactions
6. **Verify email notifications** and business logic

#### 6.3 Monitoring & Maintenance

- **Webhook delivery monitoring** via Stripe Dashboard
- **Payment status tracking** in application logs
- **Error rate monitoring** for failed payments
- **Performance monitoring** for payment processing times
- **Regular testing** of payment flows

## 📊 Success Metrics

### Key Performance Indicators

- **Payment success rate** > 95%
- **Webhook processing time** < 2 seconds
- **Booking completion rate** after payment success
- **Error recovery rate** for failed payments
- **User satisfaction** with payment experience

### Monitoring Dashboards

- Real-time payment processing status
- Webhook event processing metrics
- Failed payment analysis
- Revenue tracking integration
- Customer support ticket correlation

## 🔧 Maintenance & Support

### Regular Tasks

- Monitor webhook delivery success rates
- Review failed payment patterns
- Update payment method support
- Optimize webhook processing performance
- Maintain test coverage for payment flows

### Troubleshooting Guide

- **Webhook not received:** Check Stripe Dashboard delivery logs
- **Payment stuck in processing:** Verify PaymentIntent status
- **Booking not confirmed:** Check webhook handler execution
- **Duplicate charges:** Implement idempotency keys
- **Refund issues:** Verify charge ID mapping

---

## 📝 Implementation Notes

### Development Environment Setup

```bash
# Required environment variables
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Production Environment Setup

```bash
# Production environment variables
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Security Considerations

- Always verify webhook signatures
- Use HTTPS for all webhook endpoints
- Implement rate limiting for payment APIs
- Store sensitive data encrypted
- Regular security audits of payment flow

---

**Created:** January 2025
**Last Updated:** January 2025
**Status:** Ready for Implementation
**Priority:** High

```

```
