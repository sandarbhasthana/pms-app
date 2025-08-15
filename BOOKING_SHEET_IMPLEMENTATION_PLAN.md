# Booking Sheet Implementation Plan

## Overview

Transform the current NewBookingModalFixed into a professional multi-tab sheet interface with enhanced payment processing and secure credit card storage.

## Implementation Status

- ✅ **Complete**: Creating Implementation Plan Document
- 🟡 **In Progress**: Phase 1 - Component Structure Setup
- ⚪ **Pending**: Phase 2 - Tab Implementation
- ⚪ **Pending**: Phase 3 - Payment Integration
- ⚪ **Pending**: Phase 4 - Integration & Testing

---

## Phase 1: Component Structure Setup

**Goal**: Create new booking sheet components without breaking existing functionality

### Step 1.1: Create Base Sheet Component

**Status**: ✅ Complete
**Files Created**:

- ✅ `src/components/bookings/NewBookingSheet.tsx` - Main sheet container
- ✅ `src/components/bookings/booking-tabs/BookingTabNavigation.tsx` - Tab navigation component
- ✅ `src/components/bookings/booking-tabs/BookingDetailsTab.tsx` - Details Tab component
- ✅ `src/components/bookings/booking-tabs/BookingAddonTab.tsx` - Addon Tab component
- ✅ Added image upload functionality with ID scanner integration

**Validation Checkpoint**:

- ✅ Sheet opens and closes properly
- ✅ Basic tab navigation structure visible
- ✅ No impact on existing booking modal functionality
- ✅ Fixed React setState during render error
- ✅ Fixed z-index and transparency issues
- ✅ Fixed tab UI/UX issues (background colors, text size, layout)
- ✅ Moved progress indicator to top-right
- ✅ Improved tab spacing and readability
- ✅ Moved tabs to top-right above progress bar
- ✅ Made form area clutter-free
- ✅ Fixed non-active tab transparency issues
- ✅ Implemented connected tab design with custom border radius
- ✅ Applied specific border radius: Details (left rounded), Add-ons (square), Payment (right rounded)
- ✅ Fixed mobile responsive layout issues
- ✅ Fixed back button styling and sizing
- ✅ Implemented mobile-first responsive design

### Step 1.2: Create Tab Components Structure

**Status**: ✅ Complete
**Files Created**:

- ✅ `src/components/bookings/booking-tabs/BookingDetailsTab.tsx` - Guest details tab
- ✅ `src/components/bookings/booking-tabs/BookingAddonsTab.tsx` - Add-ons tab
- ✅ `src/components/bookings/booking-tabs/BookingPaymentTab.tsx` - Payment tab
- ✅ `src/components/bookings/booking-tabs/types.ts` - Shared types

**Validation Checkpoint**:

- [ ] All tab components render without errors
- [ ] Tab switching works smoothly
- [ ] Proper TypeScript types defined

---

## Phase 2: Tab Implementation

**Goal**: Implement content for each tab with proper state management

### Step 2.1: Implement Details Tab

**Status**: ✅ Complete
**Files to Modify**:

- ✅ `src/components/bookings/booking-tabs/BookingDetailsTab.tsx`

**Features to Implement**:

- ✅ Copy all fields from existing NewBookingModalFixed
- ✅ Added check-in/check-out date fields
- ✅ Added ID type, ID number, and issuing country fields
- ✅ Form validation updated
- ✅ Payment summary bar at bottom
- [ ] Guest autocomplete functionality (Phase 3)
- [ ] ID scanner integration (Phase 3)

**Validation Checkpoint**:

- ✅ All existing booking fields present and functional
- [ ] Guest autocomplete works
- [ ] ID scanner integration works
- [ ] Form validation prevents invalid submissions

### Step 2.2: Implement Add-ons Tab

**Status**: ⚪ Pending
**Files to Modify**:

- `src/components/bookings/booking-tabs/BookingAddonsTab.tsx`

**Features to Implement**:

- [ ] Extra bed option
- [ ] Breakfast add-on
- [ ] Custom add-ons input
- [ ] Pricing calculation for add-ons
- [ ] Future-ready structure for more add-ons

**Validation Checkpoint**:

- [ ] Add-ons can be selected/deselected
- [ ] Pricing updates correctly
- [ ] Data persists when switching tabs

### Step 2.3: Implement Payment Tab

**Status**: ⚪ Pending
**Files to Modify**:

- `src/components/bookings/booking-tabs/BookingPaymentTab.tsx`

**Features to Implement**:

- [ ] Reservation summary section
- [ ] Accommodation summary table
- [ ] Deposit calculation based on room rates
- [ ] Credit card form (secure tokenization)
- [ ] Payment method storage options

**Validation Checkpoint**:

- [ ] Reservation summary displays correctly
- [ ] Deposit calculation is accurate
- [ ] Credit card form validates properly
- [ ] No sensitive data stored locally

---

## Phase 3: Payment Integration

**Goal**: Add secure payment processing and deposit calculations

### Step 3.1: Implement Deposit Calculation

**Status**: ⚪ Pending
**Files to Create**:

- `src/lib/payments/depositCalculation.ts` - Deposit calculation logic
- `src/lib/payments/roomPricing.ts` - Room pricing utilities

**Features to Implement**:

- [ ] Dynamic deposit calculation (30% or ₹1000 minimum)
- [ ] Integration with existing room pricing API
- [ ] Weekend/weekday rate consideration
- [ ] Seasonal rate adjustments

**Validation Checkpoint**:

- [ ] Deposit calculations are accurate
- [ ] Pricing reflects current room rates
- [ ] Calculations update when dates change

### Step 3.2: Implement Secure Credit Card Storage

**Status**: ⚪ Pending
**Files to Create**:

- `src/lib/payments/stripeIntegration.ts` - Stripe payment methods
- `src/components/payments/SecureCreditCardForm.tsx` - Secure card input
- Database migration for payment methods table

**Features to Implement**:

- [ ] Stripe Payment Methods API integration
- [ ] Secure tokenization (no raw card data stored)
- [ ] Payment method display (last 4 digits only)
- [ ] Default payment method selection

**Validation Checkpoint**:

- [ ] Credit cards tokenized securely
- [ ] No sensitive data in database
- [ ] Payment methods can be retrieved and used
- [ ] PCI DSS compliance maintained

---

## Phase 4: Integration & Testing

**Goal**: Replace existing modal with new sheet and ensure full functionality

### Step 4.1: Update Booking Page Integration

**Status**: ⚪ Pending
**Files to Modify**:

- `src/app/dashboard/bookings/page.tsx` - Replace modal import
- Update handleDateClick to open sheet instead of modal

**Validation Checkpoint**:

- [ ] Calendar date clicks open new sheet
- [ ] All existing booking functionality preserved
- [ ] No regression in booking creation process

### Step 4.2: State Management Integration

**Status**: ⚪ Pending
**Files to Modify**:

- Update booking handlers to support new data structure
- Ensure backward compatibility with existing reservations

**Validation Checkpoint**:

- [ ] Bookings created successfully
- [ ] Data persists across tab navigation
- [ ] Form validation works correctly
- [ ] Error handling functions properly

### Step 4.3: Final Testing & Cleanup

**Status**: ⚪ Pending
**Tasks**:

- [ ] Test complete booking flow
- [ ] Verify payment calculations
- [ ] Test credit card tokenization
- [ ] Mobile responsiveness check
- [ ] Dark/light theme compatibility
- [ ] Remove old modal files (after confirmation)

---

## Rollback Plan

If issues arise, we can quickly rollback by:

1. Reverting the import in `src/app/dashboard/bookings/page.tsx`
2. All original files remain untouched
3. New components can be safely removed

## Files Created/Modified Tracking

### New Files Created:

- ✅ `src/components/bookings/NewBookingSheet.tsx`
- ✅ `src/components/bookings/booking-tabs/BookingTabNavigation.tsx`
- ✅ `src/components/bookings/booking-tabs/BookingDetailsTab.tsx`
- ✅ `src/components/bookings/booking-tabs/BookingAddonsTab.tsx`
- ✅ `src/components/bookings/booking-tabs/BookingPaymentTab.tsx`
- ✅ `src/components/bookings/booking-tabs/types.ts`
- [ ] `src/lib/payments/depositCalculation.ts`
- [ ] `src/lib/payments/roomPricing.ts`
- [ ] `src/lib/payments/stripeIntegration.ts`
- [ ] `src/components/payments/SecureCreditCardForm.tsx`

### Files Modified:

- ✅ `src/components/ui/sheet.tsx` (z-index and overlay fixes)
- [ ] `src/app/dashboard/bookings/page.tsx` (import change only)

### Files Preserved (No Changes):

- ✅ `src/components/bookings/NewBookingModalFixed.tsx` (kept as backup)
- ✅ All existing booking handlers and APIs
- ✅ All existing database schemas (until payment methods addition)

---

## Next Steps

1. **Review this plan** - Please confirm the approach and any modifications needed
2. **Start Phase 1** - Create basic component structure
3. **Validate each checkpoint** - Ensure functionality before proceeding
4. **Iterate based on feedback** - Adjust implementation as needed

**Ready to proceed with Phase 1?** Please review and confirm before I start creating the components.

-- New table for add-ons
CREATE TABLE ReservationAddons (
id String PRIMARY KEY,
reservationId String,
type String, -- 'extra_bed', 'breakfast', 'custom'
name String,
price Float,
quantity Int,
-- ... other fields
);
