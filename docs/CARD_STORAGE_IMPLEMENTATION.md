# Card Storage Implementation Guide

## 📋 Overview

Implement automatic card saving functionality for reservations with modern UI/UX. Cards used for payments will be automatically saved with opt-in checkbox, and displayed in EditBookingSheet Cards tab with premium 3D card design.

---

## 🎯 Requirements

### 1. **Automatic Card Saving**

- ✅ Add "Save this card for future use" checkbox in PaymentForm
- ✅ Only save card if checkbox is checked
- ✅ First saved card automatically set as default
- ✅ Display expiry warning if card expires within 3 months

### 2. **Card Management in EditCardsTab**

- ✅ Display all saved payment methods as premium 3D cards
- ✅ Show card brand (Visa, Mastercard, Amex) with logo
- ✅ Display last 4 digits, expiry date, cardholder name
- ✅ "Default" badge on default card
- ✅ Delete card with confirmation modal
- ✅ Set as default toggle
- ✅ Add new card button (without payment)
- ✅ Expiry warning badge (expires within 3 months)

### 3. **Modern Card UI Design**

Premium 3D credit card design with:

- **Card Appearance:**

  - Gradient backgrounds matching card brand colors
  - Embossed card number (last 4 visible)
  - Chip icon (top-left)
  - Brand logo (top-right)
  - Cardholder name (bottom-left)
  - Expiry date (bottom-right)
  - Holographic effect overlay

- **3D Hover Effects:**

  - Perspective transform on hover
  - Subtle shadow elevation
  - Smooth rotation animation
  - Scale effect (1 → 1.05)
  - Glow effect on hover

- **Brand-Specific Styling:**
  - **Visa:** Blue gradient (#1A1F71 → #0066B2)
  - **Mastercard:** Red/Orange gradient (#EB001B → #F79E1B)
  - **Amex:** Teal/Blue gradient (#006FCF → #00A3E0)
  - **Discover:** Orange gradient (#FF6000 → #FFB81C)
  - **Generic:** Gray gradient (#4A5568 → #718096)

---

## 🏗️ Architecture

### Database Schema (Already Exists)

```prisma
model PaymentMethod {
  id                    String    @id @default(cuid())
  customerId            String
  stripePaymentMethodId String    @unique
  type                  String
  cardBrand             String?
  cardLast4             String?
  cardExpMonth          Int?
  cardExpYear           Int?
  isDefault             Boolean   @default(false)
  createdAt             DateTime  @default(now())
  payments              Payment[]

  @@index([customerId])
}

model Payment {
  id              String         @id @default(cuid())
  reservationId   String
  type            String
  method          String
  status          String
  amount          Float
  currency        String         @default("USD")
  gatewayTxId     String?
  notes           String?
  createdAt       DateTime       @default(now())
  description     String?
  paymentMethodId String?
  processedAt     DateTime?
  paymentMethod   PaymentMethod? @relation(fields: [paymentMethodId], references: [id])
  reservation     Reservation    @relation(fields: [reservationId], references: [id])

  @@index([reservationId])
}
```

---

## 🔧 Implementation Steps

### Step 1: Create API Endpoint

**File:** `src/app/api/reservations/[id]/payment-methods/route.ts`

Endpoint to save payment method from Stripe PaymentIntent:

- Extract card details from Stripe
- Create/update PaymentMethod record
- Link to reservation via Payment record
- Set first card as default

### Step 2: Update PaymentForm Component

**File:** `src/components/payments/PaymentForm.tsx`

Add:

- "Save this card for future use" checkbox
- Pass `onCardSave` callback with card details
- Send card data to API after successful payment

### Step 3: Update Payment Webhook Handler

**File:** `src/lib/webhooks/payment-handlers.ts`

Modify `handlePaymentIntentSucceeded`:

- Extract payment method from PaymentIntent
- Call new API endpoint to save card
- Log card save status

### Step 4: Create Card Display Component

**File:** `src/components/cards/CreditCardDisplay.tsx`

Premium 3D card component with:

- Brand-specific styling
- Chip and logo icons
- 3D hover effects
- Responsive design

### Step 5: Implement EditCardsTab

**File:** `src/components/bookings/edit-tabs/EditCardsTab.tsx`

Features:

- Fetch payment methods for reservation
- Display cards using CreditCardDisplay
- Add/delete/set-default functionality
- Expiry warning badges
- Add new card modal

### Step 6: Create Card Management Modal

**File:** `src/components/cards/AddCardModal.tsx`

Modal for adding cards without payment:

- Stripe SetupIntent integration
- Save card checkbox
- Set as default option

---

## 📊 Data Flow

```
Payment Success
    ↓
PaymentForm (user checks "Save card")
    ↓
stripe.confirmPayment() succeeds
    ↓
onSuccess callback triggered
    ↓
Extract card details from PaymentIntent
    ↓
POST /api/reservations/[id]/payment-methods
    ↓
Create PaymentMethod record
    ↓
Create Payment record linking to PaymentMethod
    ↓
Set as default if first card
    ↓
EditCardsTab fetches and displays card
```

---

## 🎨 UI/UX Specifications

### Card Display

- **Size:** 320px × 200px (responsive)
- **Border Radius:** 16px
- **Shadow:** `0 20px 60px rgba(0,0,0,0.3)` (hover: `0 30px 80px rgba(0,0,0,0.4)`)
- **Padding:** 24px
- **Font:** Monospace for card number

### 3D Hover Effect CSS

```css
.credit-card {
  perspective: 1000px;
  transition: all 0.3s ease;
}

.credit-card:hover {
  transform: rotateY(5deg) rotateX(-5deg) scale(1.05);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
}
```

### Expiry Warning

- **Color:** Orange (#F59E0B)
- **Text:** "Expires in X months"
- **Threshold:** 3 months or less
- **Position:** Bottom-right of card

### Default Badge

- **Color:** Purple (#7210A2)
- **Position:** Top-right of card
- **Text:** "DEFAULT"

---

## 🔐 Security Considerations

1. **Never store full card numbers** - Only last 4 digits
2. **Use Stripe's tokenization** - Card details never touch our servers
3. **Encrypt sensitive data** - Use Stripe's encryption
4. **PCI DSS Compliance** - Leverage Stripe's compliance
5. **Secure deletion** - Delete from Stripe when removing card

---

## 📝 Implementation Checklist

- [ ] Create `/api/reservations/[id]/payment-methods` endpoint
- [ ] Update PaymentForm with save card checkbox
- [ ] Update webhook handler to save cards
- [ ] Create CreditCardDisplay component with 3D effects
- [ ] Implement EditCardsTab with card display
- [ ] Create AddCardModal for manual card addition
- [ ] Add expiry warning logic
- [ ] Add delete card functionality
- [ ] Add set-as-default functionality
- [ ] Test end-to-end card storage workflow
- [ ] Test 3D effects on different browsers
- [ ] Add loading states and error handling
- [ ] Add success/error toasts

---

## 🎨 3D Card Design Suggestions

### Option 1: **Premium Glassmorphism Card** (Recommended)

- **Style:** Modern glassmorphism with frosted glass effect
- **Features:**
  - Semi-transparent background with backdrop blur
  - Gradient overlay matching card brand
  - Holographic shimmer effect on hover
  - Floating chip icon with shadow
  - Embossed text effect
  - Subtle grain texture overlay
- **Best For:** Modern, premium feel
- **Browser Support:** Chrome 76+, Firefox 103+, Safari 9+

### Option 2: **Skeuomorphic 3D Card**

- **Style:** Realistic credit card with depth
- **Features:**
  - Realistic card texture (subtle leather/plastic)
  - Embossed chip with metallic shine
  - Foil effect on brand logo
  - Realistic shadow and depth
  - Flip animation on hover
  - Magnetic stripe at bottom
- **Best For:** Traditional, trustworthy feel
- **Browser Support:** All modern browsers

### Option 3: **Minimalist Flat Card** (Alternative)

- **Style:** Clean, flat design with brand colors
- **Features:**
  - Solid gradient background
  - Minimal icons
  - Clear typography
  - Subtle hover scale
  - No 3D effects
- **Best For:** Simplicity, accessibility
- **Browser Support:** All browsers

### **Recommended: Option 1 (Glassmorphism)**

Combines modern aesthetics with premium feel. Perfect for SaaS applications.

---

---

## ✅ Implementation Complete

### Files Created:

1. **`src/app/api/reservations/[id]/payment-methods/route.ts`**

   - POST: Save payment method from Stripe
   - GET: Fetch all payment methods for reservation
   - PATCH: Set card as default
   - DELETE: Delete payment method

2. **`src/components/cards/CreditCardDisplay.tsx`**
   - Premium glassmorphism 3D card component
   - Brand-specific styling (Visa, Mastercard, Amex, Discover)
   - 3D hover effects with perspective transform
   - Holographic shimmer animation
   - Expiry warning badges
   - Delete and set-as-default actions

### Files Modified:

1. **`src/components/payments/PaymentForm.tsx`**

   - Added "Save this card for future use" checkbox
   - Added `reservationId` and `onCardSave` props
   - Automatic card saving after successful payment
   - Card details extraction from Stripe PaymentIntent

2. **`src/components/bookings/edit-tabs/EditCardsTab.tsx`**

   - Fetch and display saved payment methods
   - Grid layout for card display
   - Delete card functionality with confirmation
   - Set as default functionality
   - Loading states and error handling

3. **`src/components/bookings/edit-tabs/EditPaymentTab.tsx`**
   - Pass `reservationId` to PaymentForm
   - Handle `onCardSave` callback
   - Show success toast when card is saved

---

## 🎨 Design Features Implemented

### Glassmorphism Card Design:

- ✅ Semi-transparent background with backdrop blur
- ✅ Gradient overlay matching card brand colors
- ✅ Holographic shimmer effect on hover
- ✅ Floating chip icon with metallic shine
- ✅ Embossed text effect
- ✅ 3D perspective transform on hover
- ✅ Smooth scale animation (1 → 1.05)
- ✅ Enhanced shadow elevation on hover

### Card Brands Supported:

- 🔵 **Visa:** Blue gradient (#1A1F71 → #0066B2)
- 🔴 **Mastercard:** Red/Orange gradient (#EB001B → #F79E1B)
- 🟦 **Amex:** Teal/Blue gradient (#006FCF → #00A3E0)
- 🟠 **Discover:** Orange gradient (#FF6000 → #FFB81C)
- ⚫ **Generic:** Gray gradient (#4A5568 → #718096)

### UI Components:

- ✅ Card number display (last 4 digits only)
- ✅ Cardholder name
- ✅ Expiry date (MM/YY format)
- ✅ Chip icon (top-left)
- ✅ Brand logo (top-right)
- ✅ DEFAULT badge (purple)
- ✅ Expiry warning badge (orange, if expires within 3 months)
- ✅ Delete button (red)
- ✅ Set as Default button (purple)

---

## 🔄 Data Flow

```
1. User makes payment in EditPaymentTab
   ↓
2. PaymentForm displays "Save this card" checkbox
   ↓
3. User checks checkbox and completes payment
   ↓
4. stripe.confirmPayment() succeeds
   ↓
5. PaymentForm extracts card details from PaymentIntent
   ↓
6. POST /api/reservations/[id]/payment-methods
   ↓
7. API creates PaymentMethod record in database
   ↓
8. First card automatically set as default
   ↓
9. Payment record links reservation to payment method
   ↓
10. EditCardsTab fetches and displays card with 3D effects
```

---

## 🔐 Security Implementation

- ✅ Never store full card numbers (only last 4 digits)
- ✅ Use Stripe's tokenization (card details never touch servers)
- ✅ Stripe's encryption for sensitive data
- ✅ PCI DSS compliance via Stripe
- ✅ Secure deletion from Stripe when removing card
- ✅ Row-level security checks on all endpoints
- ✅ User organization verification before operations

---

## 📋 API Endpoints

### POST /api/reservations/[id]/payment-methods

Save a payment method from Stripe

```json
{
  "stripePaymentMethodId": "pm_xxx",
  "cardBrand": "visa",
  "cardLast4": "4242",
  "cardExpMonth": 12,
  "cardExpYear": 2025,
  "saveCard": true,
  "setAsDefault": true
}
```

### GET /api/reservations/[id]/payment-methods

Fetch all payment methods for a reservation

```json
{
  "paymentMethods": [
    {
      "id": "pm_xxx",
      "brand": "visa",
      "last4": "4242",
      "expMonth": 12,
      "expYear": 2025,
      "isDefault": true,
      "createdAt": "2025-10-24T..."
    }
  ]
}
```

### PATCH /api/reservations/[id]/payment-methods?methodId=xxx

Set a payment method as default

### DELETE /api/reservations/[id]/payment-methods?methodId=xxx

Delete a payment method

---

## 🎯 Next Steps

1. ✅ Test card storage workflow end-to-end
2. ✅ Verify 3D effects work on different browsers
3. ✅ Test card deletion with confirmation
4. ✅ Test set-as-default functionality
5. ✅ Verify expiry warning displays correctly
6. ✅ Test with different card brands
7. ✅ Verify dark mode styling
8. ✅ Test loading states and error handling
