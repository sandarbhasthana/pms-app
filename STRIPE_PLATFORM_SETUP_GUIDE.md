# 🏢 Stripe Platform Setup Guide for PMS SaaS

## 🎯 Overview

This guide covers setting up Stripe for a **multi-tenant PMS platform** where:

- Your platform facilitates bookings
- Payments go directly to individual property owners
- You may collect platform fees
- Each property owner has their own Stripe account

## 🚀 Step 1: Create Your Stripe Platform Account

### 1.1 Sign Up for Stripe

1. Go to [https://stripe.com](https://stripe.com)
2. Click **"Start now"** or **"Sign up"**
3. Choose **"I'm building a platform or marketplace"** when asked about your business type
4. Fill in your business details:
   - Business name: Your PMS Platform Name
   - Business type: Software/SaaS Platform
   - Country: India (based on your currency preference)
   - Business structure: Private Limited Company (or appropriate)

### 1.2 Complete Business Verification

1. **Business Information**:

   - Legal business name
   - Business address
   - Tax ID/GST number
   - Business phone number
   - Website URL

2. **Personal Information** (for primary account holder):

   - Full legal name
   - Date of birth
   - Address
   - Phone number
   - Email address

3. **Banking Information**:
   - Bank account for platform fees (if any)
   - Account holder name
   - Account number
   - IFSC code

## 🔧 Step 2: Configure Stripe Connect

### 2.1 Enable Stripe Connect

1. In your Stripe Dashboard, go to **"Connect"** in the left sidebar
2. Click **"Get started"**
3. Choose your platform type: **"Marketplace or platform"**
4. Select integration type: **"Standard accounts"** (recommended for property owners)

### 2.2 Connect Settings Configuration

1. **Platform Settings**:

   - Platform name: Your PMS Platform
   - Platform URL: Your platform website
   - Support email: Your support email
   - Platform fee structure (if applicable)

2. **Account Requirements**:
   - Enable **"Express accounts"** for faster property owner onboarding
   - Set required information: Business details, banking info
   - Configure payout schedule: Daily/Weekly/Monthly

### 2.3 Branding Configuration

1. Upload your platform logo
2. Set brand colors to match your PMS theme
3. Configure email templates for property owner communications

## 🔑 Step 3: Get Your API Keys

### 3.1 Platform API Keys

1. Go to **"Developers"** → **"API keys"**
2. Copy these keys for your `.env.local`:

```env
# Stripe Platform Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_51xxxxx... # Your platform secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx... # Your platform publishable key

# Stripe Connect
STRIPE_CLIENT_ID=ca_xxxxx... # For Connect OAuth flow
```

### 3.2 Webhook Configuration

1. Go to **"Developers"** → **"Webhooks"**
2. Click **"Add endpoint"**
3. Set endpoint URL:

   **For Development (localhost:4001):**

   ```bash
   # Option 1: Stripe CLI (Recommended)
   stripe listen --forward-to localhost:4001/api/payments/webhook
   # Use the webhook endpoint URL provided by Stripe CLI

   # Option 2: ngrok
   ngrok http 4001
   # Use: https://your-ngrok-url.ngrok.io/api/payments/webhook
   ```

   **For Production:**

   ```
   https://yourdomain.com/api/payments/webhook
   ```

4. Select events to listen for:

   **Payment Intent Events:**

   - `payment_intent.succeeded` ✅
   - `payment_intent.payment_failed` ✅
   - `payment_intent.canceled` ✅
   - `payment_intent.partially_funded` ✅
   - `payment_intent.processing` ✅
   - `payment_intent.requires_action` ✅

   **Transfer Events:**

   - `transfer.created` ✅
   - `transfer.reversed` ✅
   - `transfer.updated` ✅

   **Refund Events:**

   - `refund.created` ✅
   - `refund.failed` ✅
   - `refund.updated` ✅

   **Payout Events:**

   - `payout.created` ✅
   - `payout.failed` ✅
   - `payout.paid` ✅

   **Account Events:**

   - `account.updated` ✅

   **Tax & Invoice Events (Recommended for PMS):**

   - `invoice.created` ✅
   - `invoice.finalized` ✅
   - `invoice.payment_succeeded` ✅
   - `invoice.payment_failed` ✅
   - `tax_rate.created` ✅
   - `tax_rate.updated` ✅

   **Additional Useful Events:**

   - `customer.created` ✅
   - `customer.updated` ✅
   - `payment_method.attached` ✅
   - `setup_intent.succeeded` ✅

5. Copy the webhook secret:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...
```

## 🏨 Step 4: Property Owner Onboarding Flow

### 4.1 Connect Account Creation

Property owners will need to:

1. Create a Stripe Express account through your platform
2. Complete identity verification
3. Add banking information
4. Accept Stripe's terms of service

### 4.2 OAuth Flow Setup

```typescript
// Example Connect account creation
const account = await stripe.accounts.create({
  type: "express",
  country: "IN",
  email: propertyOwner.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true }
  },
  business_type: "individual", // or 'company'
  metadata: {
    property_id: property.id,
    owner_id: propertyOwner.id
  }
});
```

## 💳 Step 5: Payment Flow Architecture

### 5.1 Direct Charges (Recommended)

```typescript
// Create payment intent for property owner's account
const paymentIntent = await stripe.paymentIntents.create(
  {
    amount: bookingAmount,
    currency: "inr",
    application_fee_amount: platformFee, // Your platform fee
    transfer_data: {
      destination: propertyOwnerStripeAccountId
    },
    metadata: {
      booking_id: booking.id,
      property_id: property.id
    }
  },
  {
    stripeAccount: propertyOwnerStripeAccountId // Direct to property owner
  }
);
```

### 5.2 Alternative: Destination Charges

```typescript
// Charge to your platform, then transfer to property owner
const paymentIntent = await stripe.paymentIntents.create({
  amount: bookingAmount,
  currency: "inr",
  application_fee_amount: platformFee,
  on_behalf_of: propertyOwnerStripeAccountId,
  transfer_data: {
    destination: propertyOwnerStripeAccountId
  }
});
```

## 🛡️ Step 6: Security & Compliance

### 6.1 PCI Compliance

- Use Stripe Elements for card collection (PCI compliant)
- Never store raw card data
- Use Stripe's secure vaults for payment methods

### 6.2 Webhook Security

```typescript
// Verify webhook signatures
const sig = request.headers["stripe-signature"];
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
```

### 6.3 Rate Limiting

- Implement rate limiting on payment endpoints
- Use Stripe's idempotency keys for safe retries

## 📊 Step 7: Testing Setup

### 7.1 Test Mode Configuration

1. Use test API keys during development
2. Test with Stripe's test card numbers:
   - Success: `4242424242424242`
   - Decline: `4000000000000002`
   - 3D Secure: `4000002500003155`

### 7.2 Connect Account Testing

1. Create test Connect accounts
2. Test the complete payment flow
3. Verify transfers and payouts

## 🚀 Step 8: Go Live Checklist

### 8.1 Account Activation

- [ ] Complete business verification
- [ ] Add banking information
- [ ] Accept Stripe's terms
- [ ] Submit for review

### 8.2 Production Configuration

- [ ] Switch to live API keys
- [ ] Update webhook endpoints
- [ ] Configure live Connect settings
- [ ] Test with real (small) transactions

### 8.3 Monitoring Setup

- [ ] Set up Stripe Dashboard monitoring
- [ ] Configure email alerts
- [ ] Implement logging for payment events
- [ ] Set up error tracking

## 📞 Next Steps

1. **Create your Stripe account** using the steps above
2. **Get your API keys** and add them to your environment
3. **Set up webhooks** for your development environment
4. **Test the Connect flow** with a sample property owner account
5. **Implement the payment infrastructure** from your existing plan

## 🔗 Important Links

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Connect Account Types](https://stripe.com/docs/connect/accounts)
- [Indian Market Guide](https://stripe.com/docs/india)
- [Testing Guide](https://stripe.com/docs/testing)

---

**Ready to start?** Begin with Step 1 and work through each section. Let me know when you've completed the account setup and I'll help you implement the technical integration!
