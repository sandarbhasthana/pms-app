# Day Transition Blocker Implementation - Complete Guide

## Overview

This document consolidates the complete implementation of the Day Transition Blocker system, which prevents automatic calendar day transitions (at 6 AM boundary) when there are unresolved booking issues.

## Problem Statement

The calendar day transitions automatically at 6 AM (property timezone). However, there are scenarios where bookings from the previous day have unresolved issues:

1. **PARTIAL_PAYMENT**: Yesterday's bookings with incomplete payments
2. **CHECKOUT_DUE_NOT_COMPLETED**: Yesterday's bookings marked CHECKOUT_DUE but never checked out
3. **CHECKOUT_DUE_TODAY**: Today's bookings marked CHECKOUT_DUE but not yet checked out

When these issues exist, the system should block the day transition and show a modal prompt allowing users to either resolve issues or proceed anyway.

## Architecture

### 1. Backend Services

#### `src/lib/reservation-status/day-transition-validator.ts`

**Purpose**: Core validation logic for detecting booking issues

**Key Functions**:

- `validateDayTransition(propertyId, timezone)`: Main validation function

  - Queries yesterday's IN_HOUSE reservations with PARTIALLY_PAID status
  - Queries yesterday's CHECKOUT_DUE reservations (never checked out)
  - Queries today's CHECKOUT_DUE reservations (not yet checked out)
  - Returns `DayTransitionValidationResponse` with issues list and `canTransition` flag

- `getIssuesForDate(propertyId, date, timezone)`: Helper for debugging/reporting
  - Returns issues for a specific date

**Database Queries**:

- Uses `getOperationalDayStart()` and `getOperationalDayEnd()` from `src/lib/timezone/day-boundaries.ts`
- Respects property timezone for accurate 6 AM boundaries
- Filters out soft-deleted reservations (`deletedAt: null`)

### 2. API Endpoint

#### `src/app/api/reservations/day-transition/validate/route.ts`

**Purpose**: REST API for day transition validation

**Endpoint**: `GET /api/reservations/day-transition/validate`

**Query Parameters**:

- `propertyId` (required): Property to validate
- `timezone` (required): Property timezone (e.g., 'America/New_York')

**Response**:

```json
{
  "canTransition": false,
  "issues": [
    {
      "reservationId": "cuid123...",
      "guestName": "John Doe",
      "roomNumber": "101",
      "issueType": "PARTIAL_PAYMENT",
      "description": "Guest checked out yesterday but payment is incomplete...",
      "severity": "warning",
      "checkOutDate": "2025-10-30T04:00:00Z",
      "paymentStatus": "PARTIALLY_PAID"
    }
  ],
  "timestamp": "2025-10-30T10:30:00Z"
}
```

**Error Handling**:

- Returns 400 for missing/invalid parameters
- Returns 500 for server errors
- Includes cache headers (1 minute)

### 3. Frontend Components

#### `src/components/bookings/DayTransitionBlockerModal.tsx`

**Purpose**: Modal UI for displaying blocking issues

**Features**:

- Displays all issues with severity indicators (⚠️ warning, 🔴 critical)
- Color-coded backgrounds (yellow for warnings, red for critical)
- Shows guest name, room number, and issue description
- Displays payment status and reservation status
- Two action buttons:
  - "Stay on Current Day" - closes modal without navigating
  - "Proceed to Next Day" - navigates to next day despite issues
- Light/dark mode support
- Mobile responsive design

**Props**:

```typescript
interface DayTransitionBlockerModalProps {
  isOpen: boolean;
  issues: DayTransitionIssue[];
  onProceed: () => void;
  onStay: () => void;
  isLoading?: boolean;
}
```

### 4. Calendar Integration

#### `src/app/dashboard/bookings/page.tsx`

**Changes Made**:

1. **Imports Added**:

   - `DayTransitionBlockerModal` component
   - `DayTransitionIssue` type

2. **State Added**:

   ```typescript
   const [dayTransitionBlockerOpen, setDayTransitionBlockerOpen] =
     useState(false);
   const [dayTransitionIssues, setDayTransitionIssues] = useState<
     DayTransitionIssue[]
   >([]);
   const [dayTransitionLoading, setDayTransitionLoading] = useState(false);
   const [pendingDateNavigation, setPendingDateNavigation] =
     useState<Date | null>(null);
   ```

3. **Modified `handleToday()` Function**:

   - Checks if already on today's date (early return if true)
   - Retrieves property timezone and ID from cookies
   - Calls validation API before navigating
   - Shows modal if issues found
   - Navigates to today if no issues

4. **New Handler Functions**:

   - `handleDayTransitionProceed()`: Navigates to pending date and closes modal
   - `handleDayTransitionStay()`: Closes modal without navigating

5. **Modal Rendering**:
   - Added `<DayTransitionBlockerModal />` component to JSX

## Data Flow

```
User clicks "Today" button
    ↓
handleToday() checks if already on today
    ↓
If not today, retrieve propertyId & timezone from cookies
    ↓
Call /api/reservations/day-transition/validate
    ↓
validateDayTransition() queries database for 3 issue types
    ↓
Return DayTransitionValidationResponse
    ↓
If canTransition = true → Navigate to today
If canTransition = false → Show modal with issues
    ↓
User clicks "Proceed" or "Stay"
    ↓
handleDayTransitionProceed/Stay() handles action
```

## Issue Detection Logic

### Issue Type 1: PARTIAL_PAYMENT

- **Query**: Yesterday's IN_HOUSE reservations with PARTIALLY_PAID status
- **Severity**: Warning
- **Description**: "Guest checked out yesterday but payment is incomplete. Remaining balance due."

### Issue Type 2: CHECKOUT_DUE_NOT_COMPLETED

- **Query**: Yesterday's CHECKOUT_DUE reservations
- **Severity**: Critical
- **Description**: "Guest was marked for checkout yesterday but never completed checkout. Manual intervention required."

### Issue Type 3: CHECKOUT_DUE_TODAY

- **Query**: Today's CHECKOUT_DUE reservations
- **Severity**: Warning
- **Description**: "Guest is marked for checkout today but has not yet checked out."

## Testing Scenarios

### Scenario 1: No Issues

- Navigate to today when no issues exist
- Expected: Calendar navigates immediately to today

### Scenario 2: Partial Payment Issue

- Create reservation with partial payment, checkout yesterday
- Click "Today" button
- Expected: Modal shows with PARTIAL_PAYMENT issue

### Scenario 3: Checkout Due Not Completed

- Create reservation with CHECKOUT_DUE status, checkout yesterday
- Click "Today" button
- Expected: Modal shows with CHECKOUT_DUE_NOT_COMPLETED issue (critical)

### Scenario 4: Checkout Due Today

- Create reservation with CHECKOUT_DUE status, checkout today
- Click "Today" button
- Expected: Modal shows with CHECKOUT_DUE_TODAY issue

### Scenario 5: Multiple Issues

- Create multiple reservations with different issues
- Click "Today" button
- Expected: Modal shows all issues sorted by severity (critical first)

## Files Created/Modified

### Created:

- `src/types/day-transition.ts` - Type definitions
- `src/lib/reservation-status/day-transition-validator.ts` - Validation service
- `src/app/api/reservations/day-transition/validate/route.ts` - API endpoint
- `src/components/bookings/DayTransitionBlockerModal.tsx` - Modal component

### Modified:

- `src/app/dashboard/bookings/page.tsx` - Calendar integration
- `src/types/next-auth.d.ts` - Added timezone field to PropertyInfo interface

## Dependencies

- `date-fns-tz` - Timezone handling (already in project)

## Implementation Details

### Timezone Retrieval

The property timezone is retrieved from the NextAuth session in the `handleToday` function:

```typescript
// Get propertyId from cookies
const propertyId = document.cookie
  .split("; ")
  .find((row) => row.startsWith("propertyId="))
  ?.split("=")[1];

// Get property timezone from session
const currentProperty = session?.user?.availableProperties?.find(
  (p) => p.id === propertyId
);
const propertyTimezone = currentProperty?.timezone || "UTC";
```

**Key Points:**

- Property timezone is stored in the database (`Property.timezone` field)
- It's populated in the session via `getUserProperties()` function
- The `PropertyInfo` interface in `src/types/next-auth.d.ts` includes the `timezone` field
- Falls back to "UTC" if timezone is not available
- Uses the session's `availableProperties` array which is populated during authentication
- `@prisma/client` - Database queries (already in project)
- `shadcn/ui` - Dialog component (already in project)
- `lucide-react` - Icons (already in project)

## Future Enhancements

1. Add automatic resolution options (e.g., "Mark as Checked Out" button)
2. Add email notifications for unresolved issues
3. Add admin dashboard for tracking day transition blocks
4. Add configurable issue severity levels per property
5. Add bulk operations for resolving multiple issues
