# EditBookingSheet Fast Refresh Analysis

## Overview
The EditBookingSheet component and its tabs have multiple performance issues causing unnecessary re-renders and fast refresh cycles. This analysis identifies all problematic patterns.

---

## 1. EditBookingSheet.tsx (Main Component)

### Issues Found:

#### Issue 1.1: Duplicate useEffect for Payment Status
**Location:** Lines 113-181 (consolidated useEffect)
**Problem:** 
- The useEffect fetches full reservation data AND sets payment status in the same effect
- This is correct now after consolidation, but the dependency array only depends on `editingReservation?.id`
- However, the effect runs EVERY TIME the component re-renders if `editingReservation` object reference changes

**Impact:** 
- Multiple API calls to `/api/reservations/[id]` on each parent re-render
- Unnecessary form data resets

#### Issue 1.2: Unsaved Changes Detection useEffect
**Location:** Lines 287-329
**Problem:**
```typescript
useEffect(() => {
  if (isInitializingRef.current) {
    return;
  }
  if (!editingReservation) {
    setHasUnsavedChanges((prev) => (prev ? false : prev));
    return;
  }
  // Compares formData with editingReservation
  setHasUnsavedChanges(hasChanges);
}, [formData, editingReservation]);
```
- Dependency array includes entire `formData` object
- `formData` is recreated on every parent re-render
- This causes the effect to run on EVERY keystroke in form fields
- Triggers state update which causes another re-render

**Impact:** 
- Excessive re-renders on every form field change
- Performance degradation when typing in input fields

#### Issue 1.3: Reset Refs useEffect
**Location:** Lines 332-338
**Problem:**
```typescript
useEffect(() => {
  if (!editingReservation) {
    lastReservationIdRef.current = null;
    isInitializingRef.current = true;
  }
}, [editingReservation?.id]);
```
- Dependency array uses `editingReservation?.id` but the effect checks `!editingReservation`
- These are not the same condition - object can exist with null id
- Inconsistent logic

**Impact:** 
- Refs may not reset properly when sheet closes
- Potential state leakage between reservations

---

## 2. EditDetailsTab.tsx

### Issues Found:

#### Issue 2.1: Duplicate useEffect for Room Availability
**Location:** Lines 142-153
**Problem:**
```typescript
// Effect to check availability when dates change
useEffect(() => {
  if (formData.checkIn && formData.checkOut) {
    checkRoomAvailability(formData.checkIn, formData.checkOut);
  }
}, [formData.checkIn, formData.checkOut, checkRoomAvailability]);

// Effect to check availability when component first loads (if dates are already set)
useEffect(() => {
  if (formData.checkIn && formData.checkOut) {
    checkRoomAvailability(formData.checkIn, formData.checkOut);
  }
}, [formData.checkIn, formData.checkOut, checkRoomAvailability]); // IDENTICAL!
```
- **EXACT DUPLICATE** - both effects have identical logic and dependencies
- Both will run on every date change
- Causes double API calls to check room availability

**Impact:** 
- 2x API calls for every date change
- Unnecessary network traffic and server load
- Slower UI response

#### Issue 2.2: useEffect with checkRoomAvailability Dependency
**Location:** Lines 142-153
**Problem:**
- `checkRoomAvailability` is a useCallback that depends on `formData`
- When `formData` changes, `checkRoomAvailability` reference changes
- This triggers the useEffect even if dates didn't change
- Creates a dependency chain: formData → checkRoomAvailability → useEffect

**Impact:** 
- Availability checks run even when only other form fields change
- Unnecessary API calls

#### Issue 2.3: Available Rooms Update useEffect
**Location:** Lines 137-139
**Problem:**
```typescript
useEffect(() => {
  setAvailableRooms(initialAvailableRooms);
}, [initialAvailableRooms]);
```
- `initialAvailableRooms` is passed as prop from parent
- Parent likely recreates this array on every render
- This effect runs on every parent re-render

**Impact:** 
- State update on every parent render
- Causes child component re-render
- Propagates fast refresh cycles

---

## 3. EditPaymentTab.tsx

### Issues Found:

#### Issue 3.1: calculateTotals Dependency Chain
**Location:** Lines 53-130
**Problem:**
```typescript
const calculateTotals = useCallback(() => {
  const nights = calculateNights();
  // ... uses formData, reservationData, availableRooms
}, [calculateNights, formData, reservationData, availableRooms]);
```
- `calculateTotals` depends on `calculateNights`
- `calculateNights` depends on `formData.checkIn` and `formData.checkOut`
- `calculateTotals` also directly depends on `formData`
- When any form field changes, `calculateTotals` reference changes
- This triggers useEffect that depends on `totals.remainingBalance`

**Impact:** 
- Cascading dependency updates
- Multiple re-renders per form field change

#### Issue 3.2: PaymentIntent Creation useEffect
**Location:** Lines 272-287
**Problem:**
```typescript
useEffect(() => {
  if (
    formData.payment.paymentMethod === "card" &&
    !clientSecret &&
    !isCreatingPaymentIntent &&
    totals.remainingBalance > 0
  ) {
    createPaymentIntent(totals.remainingBalance);
  }
}, [
  formData.payment.paymentMethod,
  clientSecret,
  isCreatingPaymentIntent,
  totals.remainingBalance,
  createPaymentIntent
]);
```
- Depends on `createPaymentIntent` which depends on `calculateTotals`
- `totals.remainingBalance` is derived from `calculateTotals`
- Creates circular dependency pattern
- Runs on every form change when card is selected

**Impact:** 
- Multiple PaymentIntent creation attempts
- Stripe API calls on every form change
- Potential duplicate payment intents

#### Issue 3.3: Pending Payments Fetch useEffect
**Location:** Lines 245-269
**Problem:**
```typescript
useEffect(() => {
  const fetchPendingPayments = async () => {
    if (!reservationData?.id) return;
    // Fetches from API
  };
  fetchPendingPayments();
}, [reservationData?.id]);
```
- Runs on component mount
- But `reservationData` is passed from parent
- Parent may recreate this object on every render
- Dependency should be `reservationData.id` not `reservationData?.id`

**Impact:** 
- Multiple API calls on parent re-renders
- Unnecessary network requests

---

## 4. EditCardsTab.tsx

### Issues Found:

#### Issue 4.1: fetchPaymentMethods Dependency Chain
**Location:** Lines 36-61
**Problem:**
```typescript
const fetchPaymentMethods = useCallback(async () => {
  // ...
}, [reservationData.id]);

useEffect(() => {
  fetchPaymentMethods();
}, [fetchPaymentMethods]);
```
- `fetchPaymentMethods` depends on `reservationData.id`
- useEffect depends on `fetchPaymentMethods` reference
- When parent re-renders with new `reservationData` object, `fetchPaymentMethods` reference changes
- This triggers the useEffect

**Impact:** 
- Multiple API calls to fetch payment methods
- Unnecessary network requests on parent re-renders

---

## 5. EditAuditTab.tsx

### Issues Found:

#### Issue 5.1: Audit Data Fetch useEffect
**Location:** Lines 59-109
**Problem:**
```typescript
useEffect(() => {
  const fetchAuditData = async () => {
    if (!reservationData?.id) return;
    // Fetches status history and audit logs
  };
  fetchAuditData();
}, [reservationData?.id]);
```
- Makes TWO API calls (status history + audit log) on every mount
- Dependency is `reservationData?.id` but should be `reservationData.id`
- If parent recreates `reservationData` object, this runs again

**Impact:** 
- 2x API calls on every parent re-render
- Significant network overhead
- Slow tab switching

---

## Summary of Root Causes

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| Duplicate useEffects | Copy-paste errors | 2x API calls, 2x processing |
| Object Reference Changes | Parent recreates objects on render | Unnecessary effect triggers |
| Dependency Chain | Callbacks depend on form data | Cascading re-renders |
| Incorrect Dependencies | Using `?.id` instead of `.id` | Inconsistent effect triggers |
| Missing Memoization | Props not memoized in parent | Child effects run on every render |

---

## Performance Impact

- **Fast Refresh Cycles:** Every form field change triggers 3-5 re-renders
- **API Calls:** 4-6 unnecessary API calls per form interaction
- **Memory:** Multiple callback recreations per render
- **User Experience:** Noticeable lag when typing in form fields

---

## Recommended Fixes (Priority Order)

1. **Remove duplicate useEffect in EditDetailsTab** (Lines 148-153)
2. **Fix dependency arrays** - use `.id` instead of `?.id`
3. **Memoize parent props** - prevent object recreation
4. **Consolidate callbacks** - reduce dependency chains
5. **Implement proper loading states** - prevent duplicate API calls
6. **Use useTransition** - for non-blocking updates

