# Flyout Menu - Conditional Rendering Implementation

## Overview
The FlyoutMenu component now displays different options based on whether the reservation is for today or a future date.

## Changes Made

### File: `src/components/bookings/FlyoutMenu.tsx`

#### 1. **Added Imports**
- `useMemo` hook for memoizing calculations
- `ArrowRightIcon` from Heroicons for check-in days display

#### 2. **Helper Functions** (Lines 62-106)

**`isReservationToday(checkInDate: string): boolean`**
- Checks if the reservation check-in date is today
- Compares year, month, and date (ignoring time)

**`getDaysUntilCheckIn(checkInDate: string): number`**
- Calculates the number of days until check-in
- Sets both dates to midnight for accurate calculation
- Returns positive number for future dates

**`getCheckInText(daysUntilCheckIn: number): string`**
- Formats human-readable check-in text
- Examples:
  - 1 day: "Check in tomorrow"
  - 7 days: "Check in next week"
  - 2-6 days: "Check in in X days"
  - 8+ days: "Check in in X weeks and Y days"

#### 3. **Component Logic** (Lines 123-133)

```typescript
const isToday = useMemo(
  () => isReservationToday(flyout.reservation.checkIn),
  [flyout.reservation.checkIn]
);

const daysUntilCheckIn = useMemo(
  () => getDaysUntilCheckIn(flyout.reservation.checkIn),
  [flyout.reservation.checkIn]
);
```

- Memoized calculations to prevent unnecessary re-renders
- Only recalculate when checkIn date changes

#### 4. **Conditional Menu Rendering** (Lines 156-284)

**For TODAY's Reservations:**
- ✅ View Details
- ✅ Edit Booking
- ✅ Current Status badge
- ✅ Quick Status Actions (includes "Check In" button to set IN_HOUSE)
- ✅ Manage Status button
- ✅ Check Out button
- ✅ Cancel Booking

**For FUTURE Reservations (Tomorrow and Beyond):**
- ✅ Check-in days display (e.g., "Check in in 2 days")
- ✅ View Details
- ✅ Edit Booking
- ✅ Cancel Booking
- ❌ No Status Management section
- ❌ No Check Out button

#### 5. **Check-in Days Display**
- Only shown for future reservations
- Blue background with arrow icon
- Positioned at the top of the menu
- Format: "Check in in X days" or "Check in tomorrow" or "Check in next week"

## Business Logic

### Today's Reservation Flow
1. User clicks on today's reservation
2. Flyout menu shows full options including status management
3. User can:
   - View or edit booking details
   - Check in guest (sets status to IN_HOUSE)
   - Check out guest (sets status to CHECKED_OUT)
   - Cancel booking
   - Manage status with full modal

### Future Reservation Flow
1. User clicks on future reservation
2. Flyout menu shows simplified options
3. Check-in days display shows when guest will arrive
4. User can:
   - View or edit booking details
   - Cancel booking
5. No check-out allowed before check-in ✅

## Key Features

✅ **No Check-out Before Check-in**: Check Out button only appears for today's reservations
✅ **Human-Readable Dates**: "Check in tomorrow" instead of "Check in in 1 day"
✅ **Memoized Calculations**: Prevents unnecessary re-renders
✅ **Responsive Design**: Works in light and dark modes
✅ **Consistent Styling**: Matches existing design system

## Testing Checklist

- [ ] Click on today's reservation - verify all options show
- [ ] Click on tomorrow's reservation - verify check-in days display
- [ ] Click on reservation 7 days away - verify "Check in next week" text
- [ ] Click on reservation 2 weeks away - verify "Check in in 2 weeks" text
- [ ] Verify Check Out button only appears for today
- [ ] Verify Status Management only appears for today
- [ ] Verify Cancel Booking appears for all reservations
- [ ] Test in light and dark modes

