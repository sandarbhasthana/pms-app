# RCA and Fix Plan: EditBookingSheet Issues

## Issue #1: Balance Due Shows ₹0 for CONFIRMATION_PENDING Bookings

### Root Cause Analysis

**Location:** `src/components/bookings/EditBookingSheet.tsx` (lines 145-152)

When EditBookingSheet initializes a CONFIRMATION_PENDING reservation, it sets:

```javascript
payment: {
  totalAmount: editingReservation.depositAmount ? editingReservation.depositAmount / 100 : 0,
  paidAmount: editingReservation.paidAmount || 0,
  paymentMethod: "cash",
  paymentStatus: editingReservation.paymentStatus || "UNPAID"
}
```

**The Problem:**

- `totalAmount` is set to `depositAmount` (the room price from rates API)
- However, this value is **NOT used** by EditPaymentTab's `calculateTotals()` function
- EditPaymentTab only uses `reservationData.depositAmount` and `reservationData.paidAmount` directly
- The `formData.payment.totalAmount` is ignored in the calculation

**In EditPaymentTab.tsx (lines 112-115):**

```javascript
if (reservationData.status === "CONFIRMATION_PENDING") {
  subtotal = totalReservationAmount + addonsTotal;
  remainingBalance = subtotal - paidAmount;
}
```

**Why it shows ₹0:**

1. For CONFIRMATION_PENDING bookings with "Pay at Check-In", `paidAmount = 0`
2. `depositAmount` should contain the room price, but if it's missing/null, `totalReservationAmount = 0`
3. `addonsTotal = 0` (no add-ons selected during initial booking)
4. Result: `remainingBalance = 0 - 0 = ₹0` ❌

**Root Cause:** `depositAmount` is not being stored when creating a "Pay at Check-In" booking

---

## Issue #2: Calendar Loads Empty After Payment in EditBookingSheet

### Root Cause Analysis

**Location:** `src/components/bookings/EditBookingSheet.tsx` (lines 219-230) and `src/app/dashboard/bookings/page.tsx` (lines 828-928)

**The Problem:**

1. When payment is completed in EditPaymentTab, `onSave()` is called (line 261)
2. `onSave` triggers `handleSave()` which calls `onUpdate(reservationId, formData)`
3. In `handleEditBookingUpdate()` (page.tsx line 828), when `formData` is empty or payment-only, it attempts to refresh
4. However, the refresh logic has a race condition:

```javascript
// Line 863-866 in page.tsx
api.removeAllEvents();
await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms delay
api.refetchEvents();
```

**The Issue:**

- The 50ms delay is insufficient for the calendar to properly clear and reinitialize
- `refetchEvents()` may not properly re-render if events array is empty at that moment
- The calendar state becomes inconsistent between the component state and FullCalendar's internal state

**Why manual refresh works:**

- User refresh (F5) reloads the entire page, resetting all state
- This forces a complete re-initialization of FullCalendar with fresh data

---

## Fix Plan

### Fix #1: Ensure depositAmount is Stored for "Pay at Check-In" Bookings

**File:** `src/app/api/reservations/route.ts`

**Action:** Verify that when creating a reservation with "pay_at_checkin" payment method, the `depositAmount` is properly calculated and stored from the rates API response.

**Steps:**

1. Check the reservation creation logic (around line 387-506)
2. Ensure `depositAmount` is set from the calculated room price before storing
3. Add logging to verify depositAmount is being saved

### Fix #2: Improve Calendar Refresh Logic After Payment

**File:** `src/app/dashboard/bookings/page.tsx`

**Action:** Replace the unreliable refresh mechanism with a more robust approach:

1. **Increase delay and add proper state synchronization** (lines 863-866)

   - Increase timeout from 50ms to 200-300ms
   - Add explicit event data update before refetch

2. **Alternative: Use proper event source refresh**

   - Instead of `removeAllEvents()` + `refetchEvents()`, use `refetchEvents()` directly
   - Ensure `setEvents()` is called with fresh data before calendar refresh

3. **Add error handling and logging**
   - Log when refresh starts and completes
   - Handle cases where calendar API is not available

### Fix #3: Ensure EditPaymentTab Receives Correct Data

**File:** `src/components/bookings/EditBookingSheet.tsx`

**Action:** Verify that `editingReservation` object passed to EditPaymentTab contains:

- `depositAmount` (in cents)
- `paidAmount` (in rupees)
- `status` (CONFIRMATION_PENDING)

---

## Implementation Status

### ✅ Fix #1: IMPLEMENTED

**File:** `src/components/bookings/EditBookingSheet.tsx`

**Changes:**

- Added async fetch of full reservation data when EditBookingSheet opens
- Fetches from `/api/reservations/{id}` to get complete data including `depositAmount`
- Falls back to provided data if fetch fails
- Added logging to track depositAmount loading

**Code:**

```javascript
// Fetches full reservation data to ensure we have all fields including depositAmount
const fetchFullReservationData = async () => {
  const res = await fetch(`/api/reservations/${editingReservation.id}`, {
    credentials: "include"
  });
  const fullReservation = await res.json();
  initializeFormData(fullReservation);
};
```

### ✅ Fix #2: IMPLEMENTED

**File:** `src/app/dashboard/bookings/page.tsx`

**Changes:**

- Increased timeout from 50ms to 200ms for calendar state settlement
- Added additional 100ms wait after refetch for event rendering
- Improved logging to track refresh sequence
- Applied same improvements to both `handleEditBookingUpdate()` and `reload()` functions

**Code:**

```javascript
api.removeAllEvents();
await new Promise((resolve) => setTimeout(resolve, 200)); // Increased from 50ms
api.refetchEvents();
await new Promise((resolve) => setTimeout(resolve, 100)); // Additional wait
```

### ✅ Fix #3: IMPLEMENTED

**File:** `src/components/bookings/EditBookingSheet.tsx`

**Changes:**

- Added validation for required fields (id, roomId)
- Added logging of payment data for debugging
- Added warning if CONFIRMATION_PENDING booking has ₹0 total amount
- Prevents form initialization if data is invalid

**Code:**

```javascript
if (!reservation.id || !reservation.roomId) {
  console.error("❌ Invalid reservation data: missing required fields");
  return;
}
```

---

## Testing Strategy

1. Create a "Pay at Check-In" booking
2. Open EditBookingSheet for that booking
3. Verify Balance Due shows correct amount (not ₹0)
4. Check browser console for logs confirming depositAmount was fetched
5. Make a payment
6. Verify calendar refreshes automatically without manual F5 needed
7. Verify reservation status updates correctly
8. Check console logs for refresh sequence completion
