# 🚀 Stripe Connect Webhook Implementation Plan

## 📋 **Overview**

This document outlines the comprehensive implementation plan for Stripe Connect webhooks in our PMS application. The system is designed for multi-tenant SaaS where organizations manage their own payments while we handle subscription billing.

## 🤔 **Key Decisions & Answers**

### **1. Payout Webhooks - NOT REQUIRED ❌**

Since organizations manage their own payments and funds go directly to their Stripe accounts, payout webhooks are unnecessary. Stripe handles payouts directly to each organization's bank account.

### **2. Delete Webhooks - NOT AVAILABLE ❌**

Stripe doesn't provide delete webhooks for most resources:

- **Accounts**: Use `account.updated` with `charges_enabled: false`
- **Customers**: Rarely deleted, usually deactivated
- **Payment Methods**: Use `payment_method.detached`

### **3. Integration Strategy - ENHANCE EXISTING UI ✅**

We'll enhance existing NewBookingSheet and EditBookingSheet payment tabs while maintaining current UI/UX.

## 📊 **Complete Webhook Implementation Matrix**

### **✅ SELECTED WEBHOOKS (Your Complete List)**

#### **Phase 1: Essential Payment Processing (MUST IMPLEMENT FIRST)**

```typescript
const ESSENTIAL_PAYMENT_WEBHOOKS = [
  // Payment Intent Events
  "payment_intent.succeeded", // ✅ Payment completed
  "payment_intent.payment_failed", // ❌ Payment failed
  "payment_intent.canceled", // 🚫 Payment canceled
  "payment_intent.created", // 📝 Payment intent created
  "payment_intent.processing", // ⏳ Payment processing
  "payment_intent.requires_action", // 🔐 Requires 3D Secure
  "payment_intent.amount_capturable_updated", // 💰 Capturable amount changed
  "payment_intent.partially_funded", // 💸 Partial payment received

  // Charge Events
  "charge.succeeded", // ✅ Charge successful
  "charge.failed", // ❌ Charge failed
  "charge.pending", // ⏳ Charge pending
  "charge.captured", // 💰 Payment captured
  "charge.updated", // 📝 Charge updated
  "charge.refunded" // 💸 Charge refunded
];
```

#### **Phase 2: Business Protection & Disputes (CRITICAL)**

```typescript
const PROTECTION_WEBHOOKS = [
  // Dispute Management
  "charge.dispute.created", // ⚠️ Chargeback initiated
  "charge.dispute.updated", // 📝 Dispute status changed
  "charge.dispute.closed", // ✅ Dispute resolved
  "charge.dispute.funds_withdrawn", // 💸 Funds held for dispute
  "charge.dispute.funds_reinstated", // 💰 Funds returned after dispute win

  // Fraud Protection
  "radar.early_fraud_warning.created", // 🚨 Fraud alert
  "review.opened", // 🔍 Payment under review
  "review.closed" // ✅ Review completed
];
```

#### **Phase 3: Account & Connect Management (IMPORTANT)**

```typescript
const ACCOUNT_WEBHOOKS = [
  // Stripe Connect Account Events
  "account.updated", // 🏢 Connected account updated
  "account.application.authorized", // ✅ App authorized for account
  "account.application.deauthorized", // ❌ App deauthorized
  "account.external_account.created", // 🏦 Bank account added
  "account.external_account.updated", // 📝 Bank account updated
  "account.external_account.deleted", // ❌ Bank account removed

  // Person Management (for Connect accounts)
  "person.created", // 👤 Person added to account
  "person.updated", // 📝 Person information updated
  "person.deleted" // ❌ Person removed from account
];
```

#### **Phase 4: Customer & Payment Methods (USEFUL)**

```typescript
const CUSTOMER_WEBHOOKS = [
  // Customer Management
  "customer.created", // 👤 New customer created
  "customer.updated", // 📝 Customer updated
  "customer.deleted", // ❌ Customer deleted

  // Payment Methods
  "payment_method.attached", // 🔗 Payment method saved
  "payment_method.detached", // 🔓 Payment method removed
  "payment_method.updated", // 📝 Payment method updated
  "payment_method.automatically_updated", // 🔄 Card auto-updated
  "payment_method.card_automatically_updated", // 💳 Card details updated

  // Legacy Card Events (for backward compatibility)
  "customer.card.created", // 💳 Card added (legacy)
  "customer.card.updated", // 📝 Card updated (legacy)
  "customer.card.deleted", // ❌ Card removed (legacy)
  "customer.bank_account.created", // 🏦 Bank account added (legacy)
  "customer.bank_account.updated", // 📝 Bank account updated (legacy)
  "customer.bank_account.deleted", // ❌ Bank account removed (legacy)
  "customer.source.created", // 💳 Payment source added (legacy)
  "customer.source.updated", // 📝 Payment source updated (legacy)
  "customer.source.deleted" // ❌ Payment source removed (legacy)
];
```

#### **Phase 5: Invoicing & Subscriptions (OPTIONAL)**

```typescript
const BILLING_WEBHOOKS = [
  // Invoice Events (for damage charges, etc.)
  "invoice.created", // 📄 Invoice created
  "invoice.upcoming", // ⏰ Upcoming invoice notification

  // Subscription Schedule Events (if using subscriptions)
  "subscription_schedule.created", // 📅 Subscription schedule created
  "subscription_schedule.updated", // 📝 Schedule updated
  "subscription_schedule.canceled", // ❌ Schedule canceled
  "subscription_schedule.completed", // ✅ Schedule completed
  "subscription_schedule.expiring", // ⏰ Schedule expiring
  "subscription_schedule.released" // 🔓 Schedule released
];
```

#### **Phase 6: Transfers & Payouts (ADVANCED)**

```typescript
const TRANSFER_WEBHOOKS = [
  // Transfer Events (for revenue sharing if needed)
  "transfer.created", // 💸 Transfer created
  "transfer.updated", // 📝 Transfer updated
  "transfer.canceled", // ❌ Transfer canceled
  "transfer.reversed" // 🔄 Transfer reversed
];
```

## 📋 **Implementation Status Tracker**

### **✅ COMPLETED**

- ✅ Database schema updated with Stripe Connect fields
- ✅ Payment routes updated for Stripe Connect
- ✅ **Phase 1 Webhook Implementation Complete** - All 16 essential payment processing webhooks
- ✅ `payment_intent.succeeded` - Enhanced with comprehensive handling
- ✅ `payment_intent.payment_failed` - Full implementation
- ✅ `payment_intent.canceled` - Full implementation
- ✅ `payment_intent.created` - Full implementation
- ✅ `payment_intent.processing` - Full implementation
- ✅ `payment_intent.requires_action` - Full implementation
- ✅ `payment_intent.amount_capturable_updated` - Full implementation
- ✅ `payment_intent.partially_funded` - Full implementation
- ✅ `charge.succeeded` - Full implementation
- ✅ `charge.failed` - Full implementation
- ✅ `charge.pending` - Full implementation
- ✅ `charge.captured` - Full implementation
- ✅ `charge.updated` - Full implementation
- ✅ `charge.refunded` - Enhanced with comprehensive handling
- ✅ Webhook idempotency system implemented
- ✅ Error handling and logging system
- ✅ Database models for WebhookEvent and PaymentTransaction
- ✅ **Organization Onboarding API Complete** - Stripe Connect account creation
- ✅ **Phase 3 Account Management Complete** - All 9 account/connect webhooks
- ✅ `account.updated` - Organization status sync
- ✅ `account.application.authorized` - App authorization tracking
- ✅ `account.application.deauthorized` - Deauthorization handling
- ✅ `account.external_account.created` - Bank account addition
- ✅ `account.external_account.updated` - Bank account updates
- ✅ `account.external_account.deleted` - Bank account removal
- ✅ `person.created` - Person management for compliance
- ✅ `person.updated` - Person information updates
- ✅ `person.deleted` - Person removal tracking
- ✅ **Stripe Onboarding UI Component** - React component for setup

### **🚧 IN PROGRESS**

- 🚧 Phase 2 webhook implementation (Business Protection)

### **⏳ PENDING IMPLEMENTATION**

#### **Phase 1: Essential (Priority 1) - ✅ COMPLETED**

- ✅ `payment_intent.payment_failed`
- ✅ `payment_intent.canceled`
- ✅ `payment_intent.created`
- ✅ `payment_intent.processing`
- ✅ `payment_intent.requires_action`
- ✅ `payment_intent.amount_capturable_updated`
- ✅ `payment_intent.partially_funded`
- ✅ `charge.succeeded`
- ✅ `charge.failed`
- ✅ `charge.pending`
- ✅ `charge.captured`
- ✅ `charge.updated`

#### **Phase 2: Protection (Priority 2)**

- ⏳ `charge.dispute.created`
- ⏳ `charge.dispute.updated`
- ⏳ `charge.dispute.closed`
- ⏳ `charge.dispute.funds_withdrawn`
- ⏳ `charge.dispute.funds_reinstated`
- ⏳ `radar.early_fraud_warning.created`
- ⏳ `review.opened`
- ⏳ `review.closed`

#### **Phase 3: Account Management (Priority 3) - ✅ COMPLETED**

- ✅ `account.updated`
- ✅ `account.application.authorized`
- ✅ `account.application.deauthorized`
- ✅ `account.external_account.created`
- ✅ `account.external_account.updated`
- ✅ `account.external_account.deleted`
- ✅ `person.created`
- ✅ `person.updated`
- ✅ `person.deleted`

#### **Phase 4: Customer Management (Priority 4)**

- ⏳ All customer and payment method webhooks (16 total)

#### **Phase 5: Billing (Priority 5)**

- ⏳ All invoice and subscription schedule webhooks (8 total)

#### **Phase 6: Transfers (Priority 6)**

- ⏳ All transfer webhooks (4 total)

### **📊 Progress Summary**

- **Total Webhooks Selected:** 61
- **Phase 1 Completed:** 16 (26%) ✅
- **Phase 3 Completed:** 9 (15%) ✅
- **Completed:** 25 (41%)
- **In Progress:** 1 (2%)
- **Pending:** 35 (57%)

## 🏗️ **Multi-Property Stripe Architecture Decision**

### **📋 Current Implementation: Organization-Level Stripe Connect**

The current implementation uses **one Stripe Connect account per organization**, not per property:

```
Organization (Hotel Chain ABC)
├── stripeAccountId: "acct_123" ← ONE Stripe account for entire organization
├── Property A (Downtown Hotel)
├── Property B (Airport Hotel)
└── Property C (Beach Resort)
```

### **✅ How Multi-Property Currently Works:**

#### **Payment Flow:**

1. **Guest books** at Property A (Downtown Hotel)
2. **Payment intent created** with metadata:
   ```json
   {
     "reservationId": "res_123",
     "orgId": "org_abc",
     "propertyId": "prop_downtown",
     "type": "reservation_payment"
   }
   ```
3. **Webhook processes** payment using organization's Stripe account
4. **Database tracks** which property each payment belongs to
5. **Reports filter** by property using `propertyId`

#### **Financial Separation:**

- ✅ **Same Stripe account** processes all payments
- ✅ **Database tracks** property-specific transactions
- ✅ **Property managers** see only their property's data via UI filtering
- ✅ **Reports separate** revenue by property in application layer

### **🔄 Alternative Architecture: Property-Level Stripe Connect**

An alternative approach would be **separate Stripe accounts per property**:

```
Organization (Hotel Chain ABC)
├── Property A → Stripe Connect Account (acct_123)
├── Property B → Stripe Connect Account (acct_456)
└── Property C → Stripe Connect Account (acct_789)
```

### **📊 Architecture Comparison:**

| Feature                    | Organization-Level (Current)    | Property-Level (Alternative)      |
| -------------------------- | ------------------------------- | --------------------------------- |
| **Setup Complexity**       | ✅ Simple - One onboarding      | ❌ Complex - Multiple onboardings |
| **Financial Management**   | ✅ Centralized dashboard        | ✅ Separate property finances     |
| **Bank Accounts**          | ❌ Shared across properties     | ✅ Separate per property          |
| **Stripe Fees**            | ✅ Lower - Single account       | ❌ Higher - Multiple accounts     |
| **Compliance**             | ✅ One set of requirements      | ❌ Multiple compliance processes  |
| **Property Autonomy**      | ❌ Limited financial control    | ✅ Full financial independence    |
| **Reporting**              | ❌ Requires app-layer filtering | ✅ Native Stripe separation       |
| **Webhook Complexity**     | ✅ Simple routing               | ❌ Complex account mapping        |
| **Multi-tenant Isolation** | ✅ Database-level separation    | ✅ Stripe-level separation        |

### **🎯 Current Implementation Benefits:**

#### **For Hotel Chains/Management Companies:**

- ✅ **Centralized financial oversight** across all properties
- ✅ **Simplified accounting** - one bank account, one reconciliation
- ✅ **Lower operational overhead** - single Stripe dashboard
- ✅ **Easier compliance management** - one set of requirements

#### **For Individual Property Managers:**

- ✅ **Property-specific reporting** via application filtering
- ✅ **Role-based access control** limits data to assigned properties
- ✅ **Consistent payment processing** across all properties

### **⚠️ Current Implementation Limitations:**

#### **Financial Separation:**

- ❌ **Mixed bank deposits** - all properties deposit to same account
- ❌ **Complex financial reconciliation** - requires manual property separation
- ❌ **Limited property autonomy** - cannot have separate banking arrangements

#### **Scalability Concerns:**

- ❌ **Stripe account limits** may affect large organizations
- ❌ **Single point of failure** - one account issue affects all properties

### **🔮 Future Architecture Considerations:**

#### **Hybrid Approach (Potential Enhancement):**

```typescript
// Organization can choose architecture per their needs
model Organization {
  stripeArchitecture: "CENTRALIZED" | "PER_PROPERTY"
  stripeAccountId?: String  // For centralized
}

model Property {
  stripeAccountId?: String  // For per-property
}
```

#### **Migration Path:**

If switching to property-level Stripe is needed:

1. **Add `stripeAccountId`** to Property model
2. **Create property onboarding API** endpoints
3. **Update payment routes** to use property's Stripe account
4. **Modify webhooks** to route by property Stripe account
5. **Implement data migration** for existing organizations

### **📝 Stakeholder Decision Required:**

**Key Questions for Business Stakeholders:**

1. **Financial Management:**

   - Do properties need separate bank accounts?
   - Is centralized financial oversight preferred?
   - How important is property-level financial autonomy?

2. **Operational Complexity:**

   - Can the organization handle multiple Stripe onboardings?
   - Is simplified setup more important than financial separation?
   - What's the preferred compliance management approach?

3. **Scalability:**

   - How many properties will the organization have?
   - Will properties be independently managed?
   - Are there regulatory requirements for financial separation?

4. **Use Case Priority:**
   - Hotel chains with centralized management → Organization-level
   - Property management companies with independent owners → Property-level
   - Franchise models → Depends on franchise agreement

### **🎯 Recommendation:**

**Current organization-level architecture is recommended for:**

- ✅ Hotel chains with centralized management
- ✅ Organizations prioritizing simplicity
- ✅ Companies with shared financial oversight
- ✅ Smaller organizations (< 10 properties)

**Property-level architecture should be considered for:**

- 🔄 Property management companies
- 🔄 Organizations with independent property owners
- 🔄 Large enterprises requiring strict financial separation
- 🔄 Regulatory environments requiring separate accounts

### **📋 Action Items:**

- [ ] **Stakeholder meeting** to discuss financial management preferences
- [ ] **Review regulatory requirements** for financial separation
- [ ] **Assess operational capacity** for multiple Stripe account management
- [ ] **Finalize architecture decision** before production deployment
- [ ] **Document chosen approach** and implementation rationale

---

## 🛠️ **Implementation Architecture**

### **1. Webhook Endpoint Structure**

```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { handleWebhookEvent } from "@/lib/webhooks/webhook-handlers";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = headers().get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new NextResponse("Webhook Error", { status: 400 });
  }

  // Idempotency check
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { stripeEventId: event.id }
  });

  if (existingEvent) {
    return new NextResponse("Event already processed", { status: 200 });
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
        data: event.data.object
      }
    });

    return new NextResponse("Success", { status: 200 });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return new NextResponse("Processing Error", { status: 500 });
  }
}
```

### **2. Webhook Event Router**

```typescript
// src/lib/webhooks/webhook-handlers.ts
export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    // Payment Events
    case "payment_intent.succeeded":
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case "payment_intent.canceled":
      await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
      break;

    // Charge Events
    case "charge.succeeded":
      await handleChargeSucceeded(event.data.object as Stripe.Charge);
      break;
    case "charge.failed":
      await handleChargeFailed(event.data.object as Stripe.Charge);
      break;

    // Refund Events
    case "refund.created":
      await handleRefundCreated(event.data.object as Stripe.Refund);
      break;

    // Dispute Events
    case "charge.dispute.created":
      await handleDisputeCreated(event.data.object as Stripe.Dispute);
      break;
    case "charge.dispute.updated":
      await handleDisputeUpdated(event.data.object as Stripe.Dispute);
      break;

    // Account Events
    case "account.updated":
      await handleAccountUpdated(event.data.object as Stripe.Account);
      break;
    case "capability.updated":
      await handleCapabilityUpdated(event.data.object as Stripe.Capability);
      break;

    // Fraud Events
    case "radar.early_fraud_warning.created":
      await handleFraudWarning(
        event.data.object as Stripe.Radar.EarlyFraudWarning
      );
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
```

### **3. Payment Event Handlers**

```typescript
// src/lib/webhooks/payment-handlers.ts
export async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  const { reservationId, orgId, type } = paymentIntent.metadata;

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

      // Send confirmation email to guest
      await sendPaymentConfirmationEmail(reservationId);

      // Notify property manager
      await notifyPaymentSuccess(reservationId, orgId);
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

export async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { reservationId, orgId } = paymentIntent.metadata;

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

    // Notify property manager of failed payment
    await notifyPaymentFailure(reservationId, paymentIntent.last_payment_error);

    // Send payment retry email to guest
    await sendPaymentRetryEmail(reservationId);

    console.log(`Payment failed for reservation ${reservationId}`);
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}

export async function handleRefundCreated(refund: Stripe.Refund) {
  const charge = refund.charge as Stripe.Charge;
  const paymentIntent = charge.payment_intent as string;

  try {
    // Find reservation by payment intent
    const reservation = await prisma.reservation.findFirst({
      where: { stripePaymentIntentId: paymentIntent }
    });

    if (reservation) {
      // Update reservation refund amount
      const currentRefunded = reservation.refundedAmount || 0;
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          refundedAmount: currentRefunded + refund.amount / 100,
          paymentStatus:
            refund.amount === charge.amount ? "REFUNDED" : "PARTIALLY_REFUNDED",
          updatedAt: new Date()
        }
      });

      // Log refund transaction
      await prisma.paymentTransaction.create({
        data: {
          reservationId: reservation.id,
          stripeRefundId: refund.id,
          type: "refund",
          amount: refund.amount / 100,
          status: "completed",
          currency: refund.currency.toUpperCase(),
          reason: refund.reason
        }
      });

      // Send refund confirmation email
      await sendRefundConfirmationEmail(reservation.id, refund.amount / 100);
    }
  } catch (error) {
    console.error("Error handling refund:", error);
  }
}
```

## 📱 **UI Integration Plan**

### **Enhanced NewBookingSheet Payment Tab**

```typescript
// Key features to add:
// 1. Stripe Elements integration
// 2. Real-time payment status
// 3. Error handling with retry
// 4. Payment confirmation flow
```

### **Enhanced EditBookingSheet Payment Tab**

```typescript
// Key features to add:
// 1. Payment history display
// 2. Refund functionality
// 3. Additional charge capability
// 4. Dispute status monitoring
```

## 🗄️ **Database Schema Updates**

```sql
-- Webhook event tracking
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data JSONB,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment transaction log
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  stripe_payment_intent_id VARCHAR(255),
  stripe_refund_id VARCHAR(255),
  type VARCHAR(50) NOT NULL, -- 'payment', 'refund', 'dispute'
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL,
  payment_method VARCHAR(50),
  failure_reason TEXT,
  reason VARCHAR(100), -- for refunds
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dispute tracking
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  stripe_dispute_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  reason VARCHAR(100),
  status VARCHAR(50),
  evidence_due_by TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization Stripe accounts
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;
```

## ⚙️ **Environment Configuration**

```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Webhook URL (configure in Stripe Dashboard)
WEBHOOK_URL=https://yourdomain.com/api/webhooks/stripe

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 📋 **Implementation Checklist**

### **Phase 1: Core Webhook Setup**

- [ ] Create webhook endpoint (`/api/webhooks/stripe/route.ts`)
- [ ] Implement webhook event router
- [ ] Add essential payment handlers
- [ ] Update database schema
- [ ] Configure webhook in Stripe Dashboard
- [ ] Test with Stripe CLI

### **Phase 2: Payment Integration**

- [ ] Enhance NewBookingSheet payment processing
- [ ] Add Stripe Elements to payment forms
- [ ] Implement payment status tracking
- [ ] Add error handling and retry logic
- [ ] Create payment confirmation flow

### **Phase 3: Advanced Features**

- [ ] Implement refund functionality in EditBookingSheet
- [ ] Add dispute management interface
- [ ] Create additional charge capability
- [ ] Add fraud monitoring alerts
- [ ] Implement payment analytics

### **Phase 4: Testing & Monitoring**

- [ ] Unit tests for webhook handlers
- [ ] Integration tests with Stripe
- [ ] Error monitoring and alerting
- [ ] Performance optimization
- [ ] Security audit

## 🚨 **Security Considerations**

1. **Webhook Signature Verification**: Always verify Stripe signatures
2. **Idempotency**: Prevent duplicate event processing
3. **Error Handling**: Graceful failure with proper logging
4. **Rate Limiting**: Implement webhook endpoint rate limiting
5. **Data Validation**: Validate all incoming webhook data

## 📊 **Monitoring & Alerting**

1. **Webhook Delivery**: Monitor failed webhook deliveries
2. **Payment Failures**: Alert on high failure rates
3. **Dispute Notifications**: Immediate alerts for chargebacks
4. **Fraud Warnings**: Real-time fraud alert notifications
5. **System Health**: Monitor webhook processing performance

---

**Next Steps**: Start with Phase 1 implementation and test thoroughly before proceeding to subsequent phases.
