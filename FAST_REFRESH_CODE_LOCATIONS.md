# Fast Refresh Issues - Exact Code Locations

## File: EditBookingSheet.tsx

### Issue 1.1: Dependency on editingReservation?.id
**Lines:** 113-181  
**Type:** useEffect  
**Dependency:** `[editingReservation?.id]`

```typescript
useEffect(() => {
  const currentReservationId = editingReservation?.id || null;
  if (currentReservationId !== lastReservationIdRef.current) {
    lastReservationIdRef.current = currentReservationId;
    if (editingReservation) {
      const fetchFullReservationData = async () => {
        // Fetches from API
        const res = await fetch(`/api/reservations/${editingReservation.id}`, ...);
        // Sets form data AND payment status
      };
      fetchFullReservationData();
    }
  }
}, [editingReservation?.id]); // ← ISSUE: Runs on parent re-render
```

**Problem:** If parent recreates `editingReservation` object, this runs again even if ID is same

---

### Issue 1.2: formData in Dependency Array
**Lines:** 287-329  
**Type:** useEffect  
**Dependency:** `[formData, editingReservation]`

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
  const hasChanges = /* comparison logic */;
  setHasUnsavedChanges(hasChanges);
}, [formData, editingReservation]); // ← ISSUE: formData is entire object
```

**Problem:** Every keystroke changes `formData` → effect runs → state update → re-render

---

### Issue 1.3: Inconsistent Ref Reset Logic
**Lines:** 332-338  
**Type:** useEffect  
**Dependency:** `[editingReservation?.id]`

```typescript
useEffect(() => {
  if (!editingReservation) { // ← Checks entire object
    lastReservationIdRef.current = null;
    isInitializingRef.current = true;
  }
}, [editingReservation?.id]); // ← But depends on .id property
```

**Problem:** Condition and dependency don't match

---

## File: EditDetailsTab.tsx

### Issue 2.1: DUPLICATE useEffect (CRITICAL)
**Lines:** 142-153  
**Type:** useEffect (appears TWICE)  
**Dependency:** `[formData.checkIn, formData.checkOut, checkRoomAvailability]`

```typescript
// FIRST useEffect (Line 142-146)
useEffect(() => {
  if (formData.checkIn && formData.checkOut) {
    checkRoomAvailability(formData.checkIn, formData.checkOut);
  }
}, [formData.checkIn, formData.checkOut, checkRoomAvailability]);

// SECOND useEffect (Line 149-153) - IDENTICAL!
useEffect(() => {
  if (formData.checkIn && formData.checkOut) {
    checkRoomAvailability(formData.checkIn, formData.checkOut);
  }
}, [formData.checkIn, formData.checkOut, checkRoomAvailability]);
```

**Problem:** Both effects are identical → 2x API calls on every date change

---

### Issue 2.2: checkRoomAvailability Dependency Chain
**Lines:** 69-146  
**Type:** useCallback + useEffect  

```typescript
// Line 69-134: useCallback depends on formData
const checkRoomAvailability = useCallback(
  async (checkIn: string, checkOut: string) => {
    // API call to check availability
  },
  [formData] // ← Depends on entire formData object
);

// Line 142-146: useEffect depends on callback
useEffect(() => {
  if (formData.checkIn && formData.checkOut) {
    checkRoomAvailability(formData.checkIn, formData.checkOut);
  }
}, [formData.checkIn, formData.checkOut, checkRoomAvailability]); // ← Depends on callback
```

**Problem:** When ANY form field changes → callback reference changes → effect runs

---

### Issue 2.3: Available Rooms Update useEffect
**Lines:** 137-139  
**Type:** useEffect  
**Dependency:** `[initialAvailableRooms]`

```typescript
useEffect(() => {
  setAvailableRooms(initialAvailableRooms);
}, [initialAvailableRooms]); // ← Parent likely recreates this array
```

**Problem:** Parent recreates array on every render → effect runs → state update

---

## File: EditPaymentTab.tsx

### Issue 3.1: calculateTotals Dependency Chain
**Lines:** 40-130  
**Type:** useCallback  

```typescript
// Line 40-50: calculateNights depends on formData
const calculateNights = useCallback(() => {
  if (!formData.checkIn || !formData.checkOut) return 0;
  // ...
}, [formData.checkIn, formData.checkOut]);

// Line 53-130: calculateTotals depends on calculateNights
const calculateTotals = useCallback(() => {
  const nights = calculateNights();
  // ... uses formData, reservationData, availableRooms
}, [calculateNights, formData, reservationData, availableRooms]);
```

**Problem:** Dependency chain: formData → calculateNights → calculateTotals

---

### Issue 3.2: PaymentIntent Creation useEffect
**Lines:** 272-287  
**Type:** useEffect  
**Dependency:** `[formData.payment.paymentMethod, clientSecret, isCreatingPaymentIntent, totals.remainingBalance, createPaymentIntent]`

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
  createPaymentIntent // ← Changes on every form change
]);
```

**Problem:** `createPaymentIntent` depends on `calculateTotals` which depends on `formData`

---

### Issue 3.3: Pending Payments Fetch useEffect
**Lines:** 245-269  
**Type:** useEffect  
**Dependency:** `[reservationData?.id]`

```typescript
useEffect(() => {
  const fetchPendingPayments = async () => {
    if (!reservationData?.id) return;
    const res = await fetch(`/api/reservations/${reservationData.id}`, ...);
    // ...
  };
  fetchPendingPayments();
}, [reservationData?.id]); // ← Parent may recreate object
```

**Problem:** If parent recreates `reservationData`, this runs again

---

## File: EditCardsTab.tsx

### Issue 4.1: fetchPaymentMethods Dependency Chain
**Lines:** 36-61  
**Type:** useCallback + useEffect  

```typescript
// Line 36-56: useCallback depends on reservationData.id
const fetchPaymentMethods = useCallback(async () => {
  try {
    const response = await fetch(
      `/api/reservations/${reservationData.id}/payment-methods`
    );
    // ...
  }
}, [reservationData.id]);

// Line 59-61: useEffect depends on callback reference
useEffect(() => {
  fetchPaymentMethods();
}, [fetchPaymentMethods]); // ← Runs when callback reference changes
```

**Problem:** When parent recreates `reservationData` → callback reference changes → effect runs

---

## File: EditAuditTab.tsx

### Issue 5.1: Audit Data Fetch useEffect
**Lines:** 59-109  
**Type:** useEffect  
**Dependency:** `[reservationData?.id]`

```typescript
useEffect(() => {
  const fetchAuditData = async () => {
    if (!reservationData?.id) return;
    
    // API Call 1: Status history
    const statusResponse = await fetch(
      `/api/reservations/${reservationData.id}/status-history?limit=50&includeAutomatic=true`,
      { credentials: "include" }
    );
    const statusData = await statusResponse.json();
    setStatusHistory(statusData.statusHistory || []);
    
    // API Call 2: Audit log
    const auditResponse = await fetch(
      `/api/reservations/${reservationData.id}/audit-log?limit=100`,
      { credentials: "include" }
    );
    const auditData = await auditResponse.json();
    setAuditLogs(auditData.auditLogs || []);
  };
  
  fetchAuditData();
}, [reservationData?.id]); // ← Makes 2 API calls on every trigger
```

**Problem:** Makes 2 sequential API calls, runs on parent re-render

---

## Summary Table

| File | Line(s) | Issue | Severity |
|------|---------|-------|----------|
| EditBookingSheet.tsx | 113-181 | Dependency on object reference | HIGH |
| EditBookingSheet.tsx | 287-329 | formData in dependency array | CRITICAL |
| EditBookingSheet.tsx | 332-338 | Inconsistent ref logic | MEDIUM |
| EditDetailsTab.tsx | 142-153 | DUPLICATE useEffect | CRITICAL |
| EditDetailsTab.tsx | 69-146 | Dependency chain | HIGH |
| EditDetailsTab.tsx | 137-139 | Parent prop recreation | MEDIUM |
| EditPaymentTab.tsx | 40-130 | Dependency chain | HIGH |
| EditPaymentTab.tsx | 272-287 | PaymentIntent loop | CRITICAL |
| EditPaymentTab.tsx | 245-269 | Pending payments fetch | HIGH |
| EditCardsTab.tsx | 36-61 | Dependency chain | HIGH |
| EditAuditTab.tsx | 59-109 | Double API calls | HIGH |

