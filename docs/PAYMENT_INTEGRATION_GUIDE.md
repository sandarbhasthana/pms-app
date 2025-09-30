# Payment Integration Guide for PMS

## 📋 Current Payment Status Implementation

### Current Logic (Manual System)
The current payment status is calculated in `/src/lib/payments/utils.ts`:

```typescript
export async function calculatePaymentStatus(reservationId: string): Promise<"PAID" | "PARTIALLY_PAID" | "UNPAID"> {
  // Calculate total due: nights × rate per night
  const nights = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24);
  const ratePerNight = room.pricing?.basePrice || 2000; // fallback
  const totalDue = ratePerNight * nights;
  
  // Sum all payments
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  // Determine status
  if (paid === 0) return "UNPAID";
  if (paid >= totalDue) return "PAID";
  return "PARTIALLY_PAID";
}
```

### Current Payment Status Criteria

| Status | Criteria | Color | Description |
|--------|----------|-------|-------------|
| **🔴 UNPAID** | `paid === 0` | Pink | No payments recorded |
| **🟠 PARTIALLY_PAID** | `0 < paid < totalDue` | Orange | Some payment made, but incomplete |
| **🟢 PAID** | `paid >= totalDue` | Green | Full payment received |

### Current Database Schema

```sql
-- Payment table
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "gatewayTxId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
```

## 🚀 Recommended Payment Gateway Solutions

### 1. **Razorpay (Recommended for India)**

**Why Razorpay is Perfect for Indian PMS:**
- ✅ **Native INR support** with local payment methods
- ✅ **UPI, NetBanking, Wallets** integration
- ✅ **Lower transaction fees** compared to international providers
- ✅ **Instant settlements** available
- ✅ **Payment Links** for remote guest payments
- ✅ **Comprehensive webhook system**
- ✅ **Built-in fraud protection**

**Installation:**
```bash
npm install razorpay
npm install @types/razorpay # For TypeScript
```

**Key Features for PMS:**
- **Payment Gateway**: Accept online payments
- **Payment Links**: Send payment links to guests via SMS/Email
- **Subscriptions**: For recurring payments
- **Refunds**: Easy refund processing
- **Webhooks**: Real-time payment status updates
- **Smart Collect**: Virtual accounts for bank transfers

### 2. **Stripe (International Standard)**

**Why Stripe for Global Reach:**
- ✅ **Global payment methods** support
- ✅ **Advanced fraud protection**
- ✅ **Excellent developer experience**
- ✅ **Comprehensive API documentation**
- ✅ **Strong webhook system**
- ✅ **Built-in analytics and reporting**

**Installation:**
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 3. **PayPal (Alternative)**

**Installation:**
```bash
npm install @paypal/react-paypal-js
```

### 4. **Square (POS Integration)**

**Installation:**
```bash
npm install @square/web-payments-sdk-react
```

## 🏗️ Enhanced Payment System Architecture

### Enhanced Payment Status Enum

```typescript
export enum PaymentStatus {
  UNPAID = "UNPAID",
  PENDING = "PENDING",                    // Payment initiated but not completed
  PARTIALLY_PAID = "PARTIALLY_PAID",
  PAID = "PAID",
  FAILED = "FAILED",                      // Payment failed
  REFUNDED = "REFUNDED",                  // Full refund
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
  DISPUTED = "DISPUTED",                  // Chargeback/dispute
  CANCELLED = "CANCELLED"                 // Payment cancelled
}

export enum PaymentType {
  ADVANCE = "ADVANCE",                    // Advance payment
  FULL = "FULL",                         // Full payment
  REFUND = "REFUND",                     // Refund transaction
  ADJUSTMENT = "ADJUSTMENT",             // Manual adjustment
  PENALTY = "PENALTY",                   // Late fee, cancellation fee
  TAX = "TAX",                          // Tax payment
  FEE = "FEE"                           // Service fee
}

export enum PaymentMethod {
  UPI = "UPI",
  CARD = "CARD",
  NETBANKING = "NETBANKING",
  WALLET = "WALLET",
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  CHEQUE = "CHEQUE",
  CREDIT_NOTE = "CREDIT_NOTE"
}
```

### Enhanced Database Schema

```sql
-- Enhanced Payment table
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "gatewayProvider" TEXT,              -- 'razorpay', 'stripe', 'manual'
    "gatewayPaymentId" TEXT,             -- Gateway's payment ID
    "gatewayOrderId" TEXT,               -- Gateway's order ID
    "type" TEXT NOT NULL,                -- PaymentType enum
    "method" TEXT NOT NULL,              -- PaymentMethod enum
    "status" TEXT NOT NULL,              -- PaymentStatus enum
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "fees" DOUBLE PRECISION,             -- Gateway fees
    "tax" DOUBLE PRECISION,              -- Tax amount
    "notes" TEXT,
    "failureReason" TEXT,                -- If payment failed
    "webhookData" JSONB,                 -- Raw webhook data
    "processedAt" TIMESTAMP(3),          -- When payment was processed
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- Payment breakdown table for detailed tracking
CREATE TABLE "PaymentBreakdown" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION DEFAULT 0,
    "feeAmount" DOUBLE PRECISION DEFAULT 0,
    "discountAmount" DOUBLE PRECISION DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentBreakdown_pkey" PRIMARY KEY ("id")
);
```

## 💰 Advanced Payment Calculation Logic

### Dynamic Payment Breakdown

```typescript
interface PaymentBreakdown {
  baseAmount: number;
  taxAmount: number;
  feeAmount: number;
  discountAmount: number;
  totalDue: number;
  totalPaid: number;
  balance: number;
  status: PaymentStatus;
}

export async function calculatePaymentBreakdown(reservationId: string): Promise<PaymentBreakdown> {
  const reservation = await getReservationWithPricing(reservationId);
  
  // Base calculation
  const nights = calculateNights(reservation.checkIn, reservation.checkOut);
  const baseAmount = nights * (reservation.room.pricing?.basePrice || 2000);
  
  // Tax calculation (e.g., GST in India)
  const taxAmount = calculateTaxes(baseAmount, reservation.room.location);
  
  // Fee calculation (service fees, cleaning fees, etc.)
  const feeAmount = calculateFees(baseAmount, reservation);
  
  // Discount calculation (early bird, loyalty, etc.)
  const discountAmount = calculateDiscounts(reservation);
  
  // Total calculation
  const totalDue = baseAmount + taxAmount + feeAmount - discountAmount;
  const totalPaid = await getTotalPaid(reservationId);
  const balance = totalDue - totalPaid;
  
  // Status determination
  const status = determinePaymentStatus(totalPaid, totalDue);
  
  return {
    baseAmount,
    taxAmount,
    feeAmount,
    discountAmount,
    totalDue,
    totalPaid,
    balance,
    status
  };
}

function determinePaymentStatus(paid: number, due: number): PaymentStatus {
  if (paid === 0) return PaymentStatus.UNPAID;
  if (paid >= due) return PaymentStatus.PAID;
  return PaymentStatus.PARTIALLY_PAID;
}
```

### Tax Calculation (GST for India)

```typescript
interface TaxConfig {
  gstRate: number;      // 12% for hotel services in India
  serviceTaxRate: number;
  localTaxRate: number;
}

function calculateTaxes(baseAmount: number, location: string): number {
  const taxConfig = getTaxConfigForLocation(location);
  
  const gstAmount = baseAmount * (taxConfig.gstRate / 100);
  const serviceTaxAmount = baseAmount * (taxConfig.serviceTaxRate / 100);
  const localTaxAmount = baseAmount * (taxConfig.localTaxRate / 100);
  
  return gstAmount + serviceTaxAmount + localTaxAmount;
}
```

## 🔄 Real-time Payment Integration

### Razorpay Integration Example

```typescript
// Razorpay payment creation
export async function createRazorpayPayment(reservationId: string, amount: number) {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!
  });
  
  const order = await razorpay.orders.create({
    amount: amount * 100, // Convert to paise
    currency: 'INR',
    receipt: `receipt_${reservationId}`,
    notes: {
      reservationId,
      type: 'hotel_booking'
    }
  });
  
  return order;
}

// Payment link generation
export async function createPaymentLink(reservationId: string, amount: number, guestDetails: any) {
  const razorpay = new Razorpay({ key_id, key_secret });
  
  const paymentLink = await razorpay.paymentLink.create({
    amount: amount * 100,
    currency: 'INR',
    description: `Payment for Reservation ${reservationId}`,
    customer: {
      name: guestDetails.name,
      email: guestDetails.email,
      contact: guestDetails.phone
    },
    notify: {
      sms: true,
      email: true
    },
    reminder_enable: true,
    callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    callback_method: 'get'
  });
  
  return paymentLink.short_url;
}
```

### Webhook Integration

```typescript
// Webhook handler for real-time updates
export async function handlePaymentWebhook(provider: string, payload: any) {
  switch (provider) {
    case 'razorpay':
      return handleRazorpayWebhook(payload);
    case 'stripe':
      return handleStripeWebhook(payload);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function handleRazorpayWebhook(payload: RazorpayWebhook) {
  const { event, payload: data } = payload;
  
  switch (event) {
    case 'payment.captured':
      await handlePaymentCaptured(data.payment.entity);
      break;
    case 'payment.failed':
      await handlePaymentFailed(data.payment.entity);
      break;
    case 'refund.created':
      await handleRefundCreated(data.refund.entity);
      break;
  }
  
  // Broadcast real-time update to calendar
  await broadcastPaymentUpdate(data.payment.entity.notes.reservationId);
}

// Real-time calendar update
async function broadcastPaymentUpdate(reservationId: string) {
  const updatedStatus = await calculatePaymentStatus(reservationId);
  
  // WebSocket/SSE broadcast to update calendar in real-time
  await broadcast('payment_update', {
    reservationId,
    paymentStatus: updatedStatus,
    timestamp: new Date()
  });
}
```

## 🎨 Enhanced Calendar Color Coding

### Extended Color Scheme

```css
/* Enhanced payment status colors */
.paid {
  background-color: rgb(34, 197, 94) !important; /* green-500 */
  border-color: rgb(34, 197, 94) !important;
}

.partially_paid {
  background-color: rgb(249, 115, 22) !important; /* orange-500 */
  border-color: rgb(249, 115, 22) !important;
}

.unpaid {
  background-color: rgb(236, 72, 153) !important; /* pink-500 */
  border-color: rgb(236, 72, 153) !important;
}

.pending_payment {
  background-color: rgb(168, 85, 247) !important; /* purple-500 */
  border-color: rgb(168, 85, 247) !important;
}

.failed_payment {
  background-color: rgb(239, 68, 68) !important; /* red-500 */
  border-color: rgb(239, 68, 68) !important;
}

.refunded {
  background-color: rgb(107, 114, 128) !important; /* gray-500 */
  border-color: rgb(107, 114, 128) !important;
}

.disputed {
  background-color: rgb(245, 158, 11) !important; /* amber-500 */
  border-color: rgb(245, 158, 11) !important;
}
```

## 📊 Payment Analytics & Reporting

### Payment Dashboard Components

```typescript
interface PaymentAnalytics {
  totalRevenue: number;
  pendingPayments: number;
  failedPayments: number;
  refundedAmount: number;
  averagePaymentTime: number; // in hours
  paymentMethodBreakdown: Record<PaymentMethod, number>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    transactions: number;
  }>;
}

// Payment analytics calculation
export async function getPaymentAnalytics(orgId: string, dateRange: DateRange): Promise<PaymentAnalytics> {
  // Implementation for comprehensive payment analytics
}
```

## 🔐 Security & Compliance

### Security Best Practices

1. **PCI DSS Compliance**: Never store card details
2. **Webhook Verification**: Always verify webhook signatures
3. **Encryption**: Encrypt sensitive payment data
4. **Audit Logs**: Log all payment activities
5. **Rate Limiting**: Implement API rate limiting
6. **Fraud Detection**: Use gateway fraud protection

### Environment Variables

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYMENT_SUCCESS_URL=/payment/success
PAYMENT_FAILURE_URL=/payment/failure
```

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Enhanced payment models and database schema
- [ ] Basic Razorpay integration
- [ ] Webhook infrastructure
- [ ] Payment status calculation improvements

### Phase 2: Core Features (Week 3-4)
- [ ] Payment link generation
- [ ] Real-time status updates
- [ ] Enhanced calendar color coding
- [ ] Payment dashboard

### Phase 3: Advanced Features (Week 5-6)
- [ ] Refund processing
- [ ] Payment analytics
- [ ] Automated payment reminders
- [ ] Multi-gateway support

### Phase 4: Production Ready (Week 7-8)
- [ ] Security hardening
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation and training

## 📞 Next Steps

When ready to implement:

1. **Choose Primary Gateway**: Razorpay recommended for Indian market
2. **Set up Gateway Account**: Get API keys and webhook endpoints
3. **Database Migration**: Implement enhanced payment schema
4. **Component Development**: Build payment UI components
5. **Webhook Integration**: Set up real-time payment updates
6. **Testing**: Comprehensive testing with test transactions
7. **Go Live**: Production deployment with monitoring

---

**Note**: This guide provides a comprehensive roadmap for implementing a production-ready payment system. The current manual system works for basic needs, but implementing a gateway solution will provide real-time accuracy, better user experience, and automated reconciliation.
