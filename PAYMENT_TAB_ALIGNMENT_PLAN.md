# EditPaymentTab Alignment Plan - Detailed Analysis

## Problem Statement
The EditPaymentTab and BookingPaymentTab look different because they have different structures and layouts. The user wants them to look and function identically (except EditPaymentTab should NOT have "Pay at Check-in" option).

## Current Differences Analysis

### BookingPaymentTab (NewBookingSheet) - Reference Implementation
**Structure:**
1. Reservation Summary (2x3 grid)
2. **Accommodation Summary** ← MISSING in EditPaymentTab
3. Payment Information section with:
   - Purple banner showing "Payment Required" with total amount
   - RadioGroup with 4 options (card, cash, bank_transfer, pay_at_checkin)
   - Each option has:
     - Radio button + Label with title + description
     - Amount displayed on the right
     - Bordered container styling
   - Stripe Payment Form (shown when card selected)
   - Blue info banner about payment policy
4. Navigation (Previous button + Submit button)

### EditPaymentTab (Current) - Needs Alignment
**Structure:**
1. Reservation Summary (2x3 grid) ✅ SAME
2. Payment Status (3-column grid: Paid, Total, Balance Due) ← DIFFERENT
3. Make Payment section with:
   - Simple RadioGroup (no descriptions, no amounts)
   - Payment Amount input field ← EXTRA (not in BookingPaymentTab)
   - Stripe Payment Form
4. Booking Summary ← DIFFERENT LAYOUT
5. Navigation

## Key Differences to Address

### 1. **Accommodation Summary Section** (MISSING)
- BookingPaymentTab shows: Room Rate, Extra Bed, Breakfast with amounts
- EditPaymentTab should show the same but with actual add-ons from formData
- Should display in same format with flex justify-between layout

### 2. **Payment Information Section** (NEEDS REDESIGN)
**Current EditPaymentTab:**
- Has "Payment Status" section showing Paid/Total/Balance
- Has "Make Payment" section with simple radio buttons

**Should be:**
- Combine into single "Payment Information" section
- Add purple banner showing "Payment Required" with total amount
- Redesign RadioGroup items to match BookingPaymentTab:
  - Each option in bordered container
  - Include title + description
  - Show amount on right side
  - Remove "Pay at Check-in" option (user requirement)

### 3. **Payment Amount Input** (NEEDS REMOVAL)
- EditPaymentTab has manual payment amount input
- BookingPaymentTab doesn't have this
- For EditPaymentTab: Should always pay full remaining balance (not partial)
- Remove the amount input field and "Full Amount" button

### 4. **Booking Summary Section** (NEEDS REDESIGN)
- EditPaymentTab: Uses grid layout with monospace font
- BookingPaymentTab: Uses flex justify-between with cleaner spacing
- Should match BookingPaymentTab's "Accommodation Summary" style

### 5. **Payment Form Display Logic** (NEEDS UPDATE)
**Current:**
```typescript
{paymentAmount > 0 && formData.payment.paymentMethod === "card" && clientSecret && (
  <PaymentProvider>
    <PaymentForm ... />
  </PaymentProvider>
)}
```

**Should be:**
```typescript
{formData.payment.paymentMethod === "card" && (
  <div className="mt-6 p-4 bg-gray-50 dark:!bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
    {isCreatingPaymentIntent || !clientSecret ? (
      <LoadingSpinner />
    ) : (
      <PaymentProvider clientSecret={clientSecret}>
        <PaymentForm ... />
      </PaymentProvider>
    )}
  </div>
)}
```

### 6. **Payment Policy Banner** (MISSING)
- BookingPaymentTab has blue info banner at bottom
- EditPaymentTab should have similar banner

## Implementation Plan

### Step 1: Add createPaymentIntent Function
- Create payment intent when card is selected
- Similar to BookingPaymentTab but call `/api/reservations/[id]/payment` endpoint
- Auto-initialize when card method is selected

### Step 2: Redesign Payment Information Section
- Replace "Payment Status" + "Make Payment" with single "Payment Information" section
- Add purple banner with "Payment Required" message
- Redesign RadioGroup with bordered containers and descriptions
- Remove "Pay at Check-in" option
- Remove payment amount input field

### Step 3: Add Accommodation Summary Section
- Insert between Reservation Summary and Payment Information
- Show room rate, add-ons, and total
- Match BookingPaymentTab styling

### Step 4: Update Payment Form Display
- Add loading state with spinner
- Wrap in styled container
- Add payment policy banner below

### Step 5: Update Navigation
- Keep Previous, Delete, Save buttons
- Match BookingPaymentTab styling

## Key Code Changes Required

1. **Import createPaymentIntent logic** from BookingPaymentTab
2. **Add useEffect** to auto-create payment intent when card selected
3. **Restructure JSX** to match BookingPaymentTab layout
4. **Remove paymentAmount state** (not needed)
5. **Update handlePaymentMethodChange** to create payment intent
6. **Add payment policy banner**

## Expected Result
EditPaymentTab will have identical visual structure and functionality to BookingPaymentTab, with:
- Same layout and styling
- Same payment method options (minus "Pay at Check-in")
- Same Stripe integration
- Same user experience
- Proper handling of existing reservations with partial payments

