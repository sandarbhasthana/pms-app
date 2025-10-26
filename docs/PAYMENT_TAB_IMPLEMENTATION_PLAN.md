# EditPaymentTab Implementation Plan - Final Approved

## Overview
Align EditPaymentTab with BookingPaymentTab structure while maintaining EditBookingSheet-specific functionality for handling existing reservations with partial payments.

---

## Section-by-Section Implementation

### 1. Reservation Summary ✅
**Status:** Keep as-is
- 2x3 grid layout
- Check-in, Check-out, Guest, Room, Guests, Nights

---

### 2. Accommodation Summary (REDESIGNED)
**Current:** Shows room rate and add-ons
**New Requirements:**
- Show room rate breakdown
- Show add-ons (breakfast, extra bed, custom add-ons)
- **Add outstanding balance display**
- **Create total payment calculation** (same as NewBookingPaymentTab)
- Format: flex justify-between with amounts on right

**Layout:**
```
Room Rate (X nights)          ₹XXXX
Extra Bed × Q × N nights      ₹XXXX
Breakfast × Q × N nights      ₹XXXX
Custom Add-ons                ₹XXXX
─────────────────────────────────
Accommodation Subtotal        ₹XXXX
Outstanding Balance           ₹XXXX (in red if > 0)
─────────────────────────────────
Total Payment Due             ₹XXXX (bold, purple)
```

---

### 3. Payment Status Section (ENHANCED - NOT REMOVED)
**Current:** Shows Paid/Total/Balance Due
**New Requirements:**
- Keep the 3-column grid (Paid, Total, Balance Due)
- **Add total amount breakdown** showing:
  - Base accommodation cost
  - Additional extras (breakfast, bed, custom add-ons)
  - Total amount to be paid
- Display in same 3-column format or enhanced format

**Layout:**
```
Paid: ₹XXXX
Total: ₹XXXX (includes all extras)
Balance Due: ₹XXXX
```

---

### 4. Payment Information Section (NEW - UNIFIED)
**Replaces:** "Make Payment" section
**Structure:**
- Purple banner: "Payment Required" with total amount due
- RadioGroup with 3 options (card, cash, bank_transfer):
  - Each in bordered container
  - Title + description
  - Amount on right
  - **NO "Pay at Check-in" option**
- Stripe Payment Form (shown when card selected)
  - Loading spinner while creating payment intent
  - System-style styling (no specific gray background)
- Blue payment policy banner

**Payment Method Options:**
1. **Pay with Credit/Debit Card**
   - Description: "Secure payment processing via Stripe"
   - Amount: Full balance due
   
2. **Cash Payment**
   - Description: "Collect payment in cash at check-in"
   - Amount: Full balance due
   
3. **Bank Transfer**
   - Description: "Direct bank transfer or wire transfer"
   - Amount: Full balance due

---

### 5. Full Balance Calculation Logic
**Requirements:**
- Calculate same way as NewBookingPaymentTab
- Include:
  - Room base price × nights
  - Add-ons (breakfast, extra bed, custom)
  - Minus already paid amount
  - Result = Full balance to be paid

**Formula:**
```typescript
const basePrice = roomPrice × nights
const addonsTotal = breakfast + extraBed + customAddons
const subtotal = basePrice + addonsTotal
const fullBalanceDue = subtotal - paidAmount
```

---

### 6. Payment Form Display
**When card is selected:**
- Show loading spinner while creating payment intent
- Auto-initialize payment intent on card selection
- Display PaymentForm in PaymentProvider
- System-style styling (light/dark theme compatible)
- No specific gray background

---

### 7. Payment Policy Banner
**Location:** Below payment form
**Content:** Same as BookingPaymentTab
**Styling:** Blue info banner with system theme support

---

### 8. Navigation Buttons
**Status:** Keep as-is
- Previous: "← Back: Add-ons"
- Delete: "Delete Booking" (red outline)
- Save: "Save Changes" (purple fill)
- No changes to styling or functionality

---

## Code Implementation Steps

### Step 1: Add createPaymentIntent Function
```typescript
const createPaymentIntent = useCallback(
  async (amount: number) => {
    // Call /api/reservations/[id]/payment endpoint
    // Similar to BookingPaymentTab but for existing reservation
  },
  [reservationData.id, ...]
);
```

### Step 2: Add useEffect for Auto-initialization
```typescript
useEffect(() => {
  if (
    formData.payment.paymentMethod === "card" &&
    !clientSecret &&
    !isCreatingPaymentIntent &&
    totals.fullBalanceDue > 0
  ) {
    createPaymentIntent(totals.fullBalanceDue);
  }
}, [formData.payment.paymentMethod, ...]);
```

### Step 3: Update calculateTotals Function
- Add `fullBalanceDue` calculation
- Include all add-ons
- Subtract already paid amount

### Step 4: Restructure JSX
1. Keep Reservation Summary
2. Add/Update Accommodation Summary with outstanding balance
3. Keep/Enhance Payment Status section
4. Add unified Payment Information section
5. Add payment policy banner
6. Keep navigation buttons

### Step 5: Update handlePaymentMethodChange
- Auto-create payment intent when card selected
- Clear payment intent for other methods

### Step 6: Update handlePaymentSuccess
- Call `/api/reservations/[id]/payment` endpoint
- Update reservation status if fully paid
- Refresh payment status display

---

## Key Differences from BookingPaymentTab
1. ❌ No "Pay at Check-in" option
2. ✅ Shows existing payment status (Paid/Balance Due)
3. ✅ Handles partial payments (can add multiple payments)
4. ✅ Shows outstanding balance in Accommodation Summary
5. ✅ Calculates full balance due (not just total)

---

## Expected Result
EditPaymentTab will:
- Match BookingPaymentTab visual structure
- Show complete payment breakdown with outstanding balance
- Support multiple payment methods (card, cash, bank transfer)
- Auto-initialize Stripe when card selected
- Display system-style themed components
- Handle existing reservations with partial payments
- Calculate and display full balance due correctly

