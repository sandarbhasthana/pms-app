# Payment Recording Debug Guide ✅

## Issue
After recording a cash payment:
1. Toast shows "Cash payment recorded successfully!"
2. Calendar becomes empty
3. Manual page reload shows status still CONFIRMATION_PENDING
4. Outstanding balance still shows 2500

## Root Cause Investigation

The issue could be one of these:

### 1. Payment API Not Recording Payment
- Payment endpoint might be failing silently
- Reservation might not be updating properly

### 2. Calendar Refresh Not Triggering
- `onUpdate()` might not be called
- `onUpdate()` might not be detecting empty data
- API might not be returning updated data

### 3. Property Context Issue
- `orgId` might not be in cookies
- API might be returning wrong data due to context

## Debug Steps

### Step 1: Check Browser Console
Open browser DevTools (F12) and look for these logs:

**In EditPaymentTab:**
```
🔄 Triggering calendar refresh after cash payment...
✅ Calendar refresh completed
```

**In Bookings Page:**
```
🔄 Refreshing calendar after payment/status change...
📍 Using orgId: [YOUR_ORG_ID]
📊 API Response Status: 200
📦 Received X reservations
✅ Calendar refetch triggered
```

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Record a cash payment
3. Look for these requests:
   - `POST /api/reservations/[id]/payment` - Should return 200
   - `GET /api/reservations?orgId=...` - Should return 200 with updated data

### Step 3: Check Payment API Response
In Network tab, click on the payment POST request:
- Response should show:
  ```json
  {
    "payment": { ... },
    "reservation": {
      "id": "...",
      "status": "CONFIRMED",
      "paymentStatus": "PAID",
      "paidAmount": 2500
    }
  }
  ```

### Step 4: Check Reservations API Response
In Network tab, click on the GET reservations request:
- Response should show updated reservation with:
  - `status: "CONFIRMED"`
  - `paymentStatus: "PAID"`
  - `paidAmount: 2500`

## Possible Issues & Solutions

### Issue A: orgId is undefined
**Symptom:** Console shows `📍 Using orgId: undefined`

**Solution:**
1. Check if orgId cookie is set
2. In browser console, run: `document.cookie`
3. Look for `orgId=...`
4. If missing, check if you're logged in properly

### Issue B: Payment API returns error
**Symptom:** Network tab shows payment POST with status 400/500

**Solution:**
1. Check the error message in response
2. Verify amount is correct (should be 2500)
3. Verify paymentMethod is "cash"
4. Check server logs for errors

### Issue C: Reservations API returns old data
**Symptom:** GET reservations returns status still CONFIRMATION_PENDING

**Solution:**
1. Check if payment was actually recorded in database
2. Verify property context is correct
3. Check if cache is stale (add `?t=` timestamp)

### Issue D: Calendar not refreshing
**Symptom:** Console shows API returned 200 but calendar still empty

**Solution:**
1. Check if `calendarRef.current?.getApi()` is available
2. Verify `api.refetchEvents()` is being called
3. Check if events are being set properly with `setEvents()`

## What Should Happen

```
1. User records cash payment of ₹2,500
   ↓
2. POST /api/reservations/[id]/payment
   ├─ Creates Payment record ✅
   ├─ Updates reservation.status → CONFIRMED ✅
   ├─ Updates reservation.paymentStatus → PAID ✅
   └─ Returns updated reservation
   ↓
3. onUpdate(id, {}) called
   ↓
4. GET /api/reservations?orgId=...
   └─ Returns updated reservation with CONFIRMED status
   ↓
5. setEvents() updates calendar
   ↓
6. api.refetchEvents() refreshes display
   ↓
7. Calendar shows CONFIRMED reservation ✅
```

## Next Steps

1. **Try recording a payment again**
2. **Open browser console (F12)**
3. **Look for the debug logs above**
4. **Share the console output**
5. **Check Network tab for API responses**

This will help identify exactly where the issue is occurring.

