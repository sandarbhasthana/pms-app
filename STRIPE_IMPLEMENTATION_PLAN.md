# 🚀 Stripe Payment Integration Implementation Plan

## 📋 Current Status
✅ **Database drift resolved**  
✅ **All models in sync**  
✅ **Payment schema ready** (Payment model exists)  
✅ **Data preserved and restored**  

## 🎯 Implementation Roadmap

### Phase 1: Environment Setup & Dependencies
**Estimated Time: 30 minutes**

#### 1.1 Install Stripe Dependencies
```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
npm install --save-dev @types/stripe
```

#### 1.2 Environment Configuration
Add to `.env.local`:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Payment Configuration
PAYMENT_CURRENCY=INR
DEFAULT_DEPOSIT_PERCENTAGE=30
```
---

### Phase 2: Core Payment Infrastructure
**Estimated Time: 2-3 hours**

#### 2.1 Stripe Provider Setup
- [ ] Create `src/components/providers/StripeProvider.tsx`
- [ ] Integrate with existing providers in `src/app/providers.tsx`
- [ ] Configure Stripe Elements theme

#### 2.2 Payment Utilities
- [ ] Create `src/lib/stripe/client.ts` (client-side Stripe)
- [ ] Create `src/lib/stripe/server.ts` (server-side Stripe)
- [ ] Create `src/lib/payments/utils.ts` (payment calculations)
- [ ] Create `src/lib/payments/types.ts` (TypeScript interfaces)

#### 2.3 Database Schema Updates
Add missing tables to schema:
```prisma
model PaymentMethod {
  id                    String   @id @default(cuid())
  customerId            String   // User ID or Guest identifier
  stripePaymentMethodId String   @unique
  type                  String   // "card", "bank_account"
  cardBrand             String?
  cardLast4             String?
  cardExpMonth          Int?
  cardExpYear           Int?
  isDefault             Boolean  @default(false)
  createdAt             DateTime @default(now())
  
  payments              Payment[]
  
  @@index([customerId])
}

model Refund {
  id              String      @id @default(cuid())
  stripeRefundId  String      @unique
  reservationId   String
  amount          Int         // in cents
  status          String      // "succeeded", "failed", "pending"
  reason          String?     // "requested_by_customer", "fraudulent"
  createdAt       DateTime    @default(now())
  
  reservation     Reservation @relation(fields: [reservationId], references: [id])
  
  @@index([reservationId])
}
```

---

### Phase 3: API Routes Development
**Estimated Time: 3-4 hours**

#### 3.1 Payment Intent Management
- [ ] `src/app/api/payments/create-intent/route.ts`
- [ ] `src/app/api/payments/confirm-payment/route.ts`
- [ ] `src/app/api/payments/capture-payment/route.ts`

#### 3.2 Payment Method Management
- [ ] `src/app/api/payments/methods/route.ts` (GET, POST)
- [ ] `src/app/api/payments/methods/[id]/route.ts` (DELETE, PATCH)
- [ ] `src/app/api/payments/methods/set-default/route.ts`

#### 3.3 Webhook Handler
- [ ] `src/app/api/payments/webhook/route.ts`
- [ ] Handle payment_intent.succeeded
- [ ] Handle payment_intent.payment_failed
- [ ] Handle payment_method.attached

#### 3.4 Refund Management
- [ ] `src/app/api/payments/refunds/route.ts`
- [ ] `src/app/api/payments/refunds/[id]/route.ts`

---

### Phase 4: Payment Components
**Estimated Time: 4-5 hours**

#### 4.1 Core Payment Components
- [ ] `src/components/payments/PaymentForm.tsx`
- [ ] `src/components/payments/PaymentMethodSelector.tsx`
- [ ] `src/components/payments/SavedPaymentMethods.tsx`
- [ ] `src/components/payments/PaymentSummary.tsx`

#### 4.2 Booking Integration Components
- [ ] Update `src/components/bookings/BookingSheet.tsx`
- [ ] Add Payment tab to booking flow
- [ ] Create `src/components/bookings/PaymentTab.tsx`
- [ ] Create `src/components/bookings/DepositCalculator.tsx`

#### 4.3 Payment Management Components
- [ ] `src/components/payments/PaymentHistory.tsx`
- [ ] `src/components/payments/RefundDialog.tsx`
- [ ] `src/components/payments/PaymentStatusBadge.tsx`

---

### Phase 5: Booking Flow Integration
**Estimated Time: 3-4 hours**

#### 5.1 Enhanced Booking Sheet
Update the existing 3-tab booking sheet:
- **Details Tab**: Existing functionality
- **Add-ons Tab**: Existing functionality  
- **Payment Tab**: NEW - Payment processing

#### 5.2 Payment Flow States
```typescript
type PaymentFlowState = 
  | 'selecting_method'
  | 'processing_payment' 
  | 'payment_succeeded'
  | 'payment_failed'
  | 'requires_action'
```

#### 5.3 Deposit & Payment Logic
- [ ] Calculate deposit based on room rate
- [ ] Support partial payments
- [ ] Handle payment authorization vs capture
- [ ] Implement payment scheduling

---

### Phase 6: Dashboard & Management
**Estimated Time: 2-3 hours**

#### 6.1 Payment Dashboard
- [ ] Add payment metrics to existing dashboard
- [ ] Payment status cards
- [ ] Recent transactions widget

#### 6.2 Payment Management Pages
- [ ] `src/app/(dashboard)/payments/page.tsx`
- [ ] `src/app/(dashboard)/payments/[id]/page.tsx`
- [ ] `src/app/(dashboard)/refunds/page.tsx`

#### 6.3 Settings Integration
- [ ] Add payment settings to existing Settings page
- [ ] Stripe configuration management
- [ ] Payment terms configuration

---

### Phase 7: Testing & Security
**Estimated Time: 2-3 hours**

#### 7.1 Test Implementation
- [ ] Create test payment scenarios
- [ ] Test with Stripe test cards
- [ ] Test webhook handling
- [ ] Test refund scenarios

#### 7.2 Security Measures
- [ ] Validate webhook signatures
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Secure API endpoints

#### 7.3 Error Handling
- [ ] Payment failure scenarios
- [ ] Network error handling
- [ ] User-friendly error messages
- [ ] Logging and monitoring

---

## 🛠️ Implementation Priority

### **Week 1: Foundation**
1. ✅ Phase 1: Environment Setup (DONE)
2. ✅ Phase 2: Core Infrastructure (START HERE)
3. ✅ Phase 3: API Routes

### **Week 2: User Interface**
4. ✅ Phase 4: Payment Components
5. ✅ Phase 5: Booking Integration

### **Week 3: Management & Polish**
6. ✅ Phase 6: Dashboard Integration
7. ✅ Phase 7: Testing & Security

---

## 🎯 Next Immediate Steps

### **Step 1: Add Missing Schema Tables**
```bash
# Add PaymentMethod and Refund tables
npx prisma migrate dev --name add-payment-method-refund-tables
```

### **Step 2: Install Dependencies**
```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

### **Step 3: Setup Environment Variables**
Add Stripe keys to `.env.local`

### **Step 4: Create Core Infrastructure**
Start with Stripe provider and basic utilities

---

## 📊 Success Metrics

- [ ] **Functional Payment Flow**: Users can make payments for reservations
- [ ] **Saved Payment Methods**: Users can store and reuse payment methods
- [ ] **Deposit Handling**: Proper authorization and capture flow
- [ ] **Refund Management**: Staff can process refunds
- [ ] **Payment History**: Complete audit trail
- [ ] **Error Handling**: Graceful failure scenarios
- [ ] **Security**: PCI compliance and secure handling

---

## 🔗 Useful Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe React Elements](https://stripe.com/docs/stripe-js/react)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)

---

**🚀 Ready to start? Let's begin with Phase 2: Core Payment Infrastructure!**
