# Reservation Status Change Implementation Plan

## Overview
This document outlines the comprehensive plan for implementing reservation status changes with real-time calendar updates and color-coded visual indicators.

## Status Color Scheme

| Status | Color | Hex Code | Tailwind | Use Case |
|--------|-------|----------|----------|----------|
| **Confirmed** | Teal | #14b8a6 | `bg-teal-500` | Booking is confirmed and locked |
| **Confirmation Pending** | Pink | #ec4899 | `bg-pink-500` | Awaiting guest confirmation |
| **In-House** | Green | #22c55e | `bg-green-500` | Guest is currently checked in |
| **Cancelled** | Gray | #6b7280 | `bg-gray-500` | Booking has been cancelled |
| **Checked Out** | Purple | #8b5cf6 | `bg-purple-500` | Guest has checked out |
| **No-Show** | Orange | #f97316 | `bg-orange-500` | Guest did not arrive |

---

## Phase 1: Backend Implementation

### 1.1 Status Transition Validation
**File:** `src/lib/reservation-status/utils.ts`

**Requirements:**
- Implement `validateStatusTransition(currentStatus, newStatus)` function
- Define valid status transitions:
  - `CONFIRMATION_PENDING` → `CONFIRMED`, `CANCELLED`
  - `CONFIRMED` → `IN_HOUSE`, `CANCELLED`, `NO_SHOW`
  - `IN_HOUSE` → `CHECKED_OUT`
  - `CHECKED_OUT` → (terminal state, no transitions)
  - `CANCELLED` → (terminal state, no transitions)
  - `NO_SHOW` → (terminal state, no transitions)

**Validation Rules:**
- Prevent invalid transitions (e.g., `CHECKED_OUT` → `IN_HOUSE`)
- Log all transition attempts for audit trail
- Return error messages for invalid transitions

### 1.2 Status Update API Endpoint
**File:** `src/app/api/reservations/[id]/status/route.ts` (NEW)

**Endpoint:** `PATCH /api/reservations/[id]/status`

**Request Body:**
```json
{
  "status": "CONFIRMED",
  "reason": "Guest confirmed via phone",
  "notes": "Optional additional notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "reservation-id",
    "status": "CONFIRMED",
    "updatedAt": "2025-10-21T10:30:00Z"
  }
}
```

**Implementation Details:**
- Validate user has `FRONT_DESK` or `PROPERTY_MANAGER` role
- Validate property access using `withPropertyContext()`
- Validate status transition using `validateStatusTransition()`
- Update reservation status in database
- Create audit log entry
- Clear reservations cache for the property
- Return updated reservation

### 1.3 Audit Trail Logging
**File:** `src/lib/reservation-status/audit.ts` (NEW)

**Requirements:**
- Create `ReservationStatusLog` table in Prisma schema
- Log fields:
  - `id`: Unique identifier
  - `reservationId`: Reference to reservation
  - `previousStatus`: Status before change
  - `newStatus`: Status after change
  - `reason`: Why the status changed
  - `notes`: Additional context
  - `userId`: Who made the change
  - `createdAt`: Timestamp
  - `propertyId`: For multi-tenant isolation

**Function:** `logStatusChange(reservationId, previousStatus, newStatus, reason, userId, propertyId)`

---

## Phase 2: Frontend - EditBookingSheet Updates

### 2.1 Status Dropdown Handler
**File:** `src/components/bookings/EditBookingSheet.tsx`

**Current Implementation:**
- Status dropdown with 6 options
- Color-coded button based on current status
- Calls `handleStatusUpdate(newStatus, reason)`

**Enhancement Needed:**
- Add loading state during status update
- Show confirmation dialog for certain transitions
- Display error messages if transition is invalid
- Optimistically update UI before API response

### 2.2 Status Update Handler
**File:** `src/components/bookings/EditBookingSheet.tsx`

**Function:** `handleStatusUpdate(newStatus, reason)`

**Implementation:**
```typescript
const handleStatusUpdate = async (newStatus: ReservationStatus, reason: string) => {
  try {
    setIsUpdatingStatus(true);
    
    // Validate transition
    if (!validateStatusTransition(editingReservation.status, newStatus)) {
      toast.error("Invalid status transition");
      return;
    }
    
    // Call API
    const response = await fetch(`/api/reservations/${editingReservation.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, reason })
    });
    
    if (!response.ok) throw new Error("Failed to update status");
    
    const { data } = await response.json();
    
    // Update local state
    setEditingReservation({ ...editingReservation, status: newStatus });
    
    // Trigger calendar refresh
    await reload();
    
    toast.success(`Status updated to ${newStatus}`);
  } catch (error) {
    toast.error(error.message);
  } finally {
    setIsUpdatingStatus(false);
  }
};
```

---

## Phase 3: Calendar Integration

### 3.1 Calendar Event Color Mapping
**File:** `src/app/dashboard/bookings/page.tsx`

**Function:** `getEventColor(status: ReservationStatus): string`

**Implementation:**
```typescript
const getEventColor = (status: ReservationStatus): string => {
  const colorMap: Record<ReservationStatus, string> = {
    CONFIRMED: "#14b8a6",        // Teal
    CONFIRMATION_PENDING: "#ec4899", // Pink
    IN_HOUSE: "#22c55e",          // Green
    CANCELLED: "#6b7280",         // Gray
    CHECKED_OUT: "#8b5cf6",       // Purple
    NO_SHOW: "#f97316"            // Orange
  };
  return colorMap[status] || "#6b7280";
};
```

### 3.2 Event Source Update
**File:** `src/app/dashboard/bookings/page.tsx`

**Requirements:**
- Map reservation status to event color
- Update event rendering to use status colors
- Ensure calendar events reflect current status immediately after update

**Implementation:**
```typescript
const eventSources = useMemo(() => [
  {
    events: (info, successCallback) => {
      // Fetch reservations and map to events
      const events = reservations.map(res => ({
        id: res.id,
        title: `${res.guestName} - ${res.roomNumber}`,
        start: res.checkIn,
        end: res.checkOut,
        backgroundColor: getEventColor(res.status),
        borderColor: getEventColor(res.status),
        extendedProps: {
          status: res.status,
          paymentStatus: res.paymentStatus
        }
      }));
      successCallback(events);
    }
  }
], [reservations]);
```

### 3.3 Real-Time Calendar Refresh
**File:** `src/app/dashboard/bookings/page.tsx`

**Requirements:**
- After status update, refresh calendar immediately
- Show updated event color without page reload
- Maintain calendar view (date range, zoom level)

**Implementation:**
- Call `reload()` function after status update
- `reload()` clears cache and refetches reservations
- Calendar automatically re-renders with new colors

---

## Phase 4: UI/UX Enhancements

### 4.1 Status Transition Confirmation
**File:** `src/components/bookings/EditBookingSheet.tsx`

**Requirements:**
- Show confirmation dialog for critical transitions:
  - `CONFIRMED` → `CANCELLED`
  - `IN_HOUSE` → `CANCELLED`
  - `CONFIRMED` → `NO_SHOW`
- Allow user to add reason/notes before confirming
- Display warning for irreversible transitions

### 4.2 Status History Display
**File:** `src/components/bookings/edit-tabs/EditAuditTab.tsx`

**Requirements:**
- Display all status changes in audit trail
- Show: Previous Status → New Status, Reason, User, Timestamp
- Color-code status badges using the same color scheme
- Sort by most recent first

### 4.3 Calendar Event Tooltips
**File:** `src/app/dashboard/bookings/page.tsx`

**Requirements:**
- Show status in event tooltip on hover
- Display: Guest Name, Room, Status, Check-in/out dates
- Use status color in tooltip

---

## Phase 5: Testing Strategy

### 5.1 Unit Tests
**File:** `src/lib/reservation-status/__tests__/utils.test.ts`

**Test Cases:**
- Valid status transitions
- Invalid status transitions
- Edge cases (null, undefined, invalid status)

### 5.2 Integration Tests
**File:** `src/app/api/reservations/__tests__/status.test.ts`

**Test Cases:**
- Status update API endpoint
- Audit log creation
- Cache invalidation
- Permission validation

### 5.3 E2E Tests
**File:** `cypress/e2e/booking-status.cy.ts`

**Test Cases:**
- Update status from EditBookingSheet
- Verify calendar color updates
- Verify audit trail entry
- Test invalid transitions
- Test permission restrictions

---

## Phase 6: Database Schema Updates

### 6.1 Prisma Schema Changes
**File:** `prisma/schema.prisma`

**New Model:** `ReservationStatusLog`
```prisma
model ReservationStatusLog {
  id                String   @id @default(cuid())
  reservationId     String
  reservation       Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  previousStatus    ReservationStatus
  newStatus         ReservationStatus
  reason            String?
  notes             String?
  userId            String
  user              User @relation(fields: [userId], references: [id])
  propertyId        String
  property          Property @relation(fields: [propertyId], references: [id])
  createdAt         DateTime @default(now())
  
  @@index([reservationId])
  @@index([propertyId])
  @@index([createdAt])
}
```

### 6.2 Migration
```bash
npx prisma migrate dev --name add_reservation_status_log
```

---

## Phase 7: Deployment Checklist

- [ ] Backend API endpoint implemented and tested
- [ ] Status transition validation working
- [ ] Audit logging functional
- [ ] Frontend status dropdown integrated
- [ ] Calendar color mapping implemented
- [ ] Real-time refresh working
- [ ] Confirmation dialogs added
- [ ] Audit trail display working
- [ ] All tests passing
- [ ] Database migration applied
- [ ] Cache invalidation verified
- [ ] Error handling comprehensive
- [ ] User documentation updated

---

## Implementation Priority

1. **High Priority (Week 1)**
   - Backend API endpoint
   - Status transition validation
   - Frontend dropdown integration
   - Calendar color mapping

2. **Medium Priority (Week 2)**
   - Audit logging
   - Confirmation dialogs
   - Real-time refresh optimization
   - Audit trail display

3. **Low Priority (Week 3)**
   - Advanced UI enhancements
   - Comprehensive testing
   - Documentation
   - Performance optimization

---

## Success Criteria

✅ Status changes are reflected in EditBookingSheet dropdown
✅ Calendar events update color immediately after status change
✅ All status transitions are validated
✅ Audit trail logs all status changes
✅ Invalid transitions are prevented with clear error messages
✅ Users can see status history in audit tab
✅ Calendar tooltips show current status
✅ No performance degradation with status updates
✅ All tests passing (unit, integration, E2E)
✅ Proper error handling and user feedback

