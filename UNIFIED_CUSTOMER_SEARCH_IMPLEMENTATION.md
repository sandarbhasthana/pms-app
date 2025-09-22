# Unified Customer Search Implementation

## 📋 Project Overview

**Goal**: Replace individual field autocomplete with a unified search bar in the NewBooking form header to fix iPad keyboard flickering and improve UX.

**Current Issue**:

- Multiple autocomplete dropdowns on Name/Email/Phone fields
- Persistent "No customers found" dropdowns
- iPad keyboard flickering due to focus management issues
- Multiple API calls per keystroke

**Solution**:

- Single search bar in booking header row
- Unified customer search with auto-fill functionality
- Debounced API calls
- Clean dropdown with customer selection

## 🎯 Target UI Layout

```
Booking Information          🔍 Search customer...          [Details] [Add-ons] [Payment]
Complete all sections...                                    Progress: 0/3 completed
```

## 📁 Files to Modify

### 1. **NewBookingSheet Component**

- **File**: `src/components/bookings/NewBookingSheet.tsx`
- **Changes**: Add search bar to header row between title and tabs
- **Status**: 🔄 Pending

### 2. **Customer Search API**

- **File**: `src/app/api/customers/search/route.ts`
- **Changes**: Verify/optimize existing search endpoint
- **Status**: 🔄 Pending

### 3. **Customer Search Hook**

- **File**: `src/hooks/useCustomerSearch.ts` (New)
- **Changes**: Create debounced search hook with proper state management
- **Status**: 🔄 Pending

### 4. **Search Dropdown Component**

- **File**: `src/components/bookings/CustomerSearchDropdown.tsx` (New)
- **Changes**: Create reusable search dropdown component
- **Status**: 🔄 Pending

### 5. **Form State Management**

- **File**: Update form handling to accept auto-filled data
- **Changes**: Integrate search results with form state
- **Status**: 🔄 Pending

## 🔧 Implementation Plan

### Phase 1: Core Search Infrastructure

- [x] Create `useCustomerSearch` hook with debouncing
- [x] Create `CustomerSearchDropdown` component
- [ ] Test search functionality independently

### Phase 2: UI Integration

- [x] Modify NewBookingSheet header layout
- [x] Integrate search bar in header row
- [x] Style search bar to match design system

### Phase 3: Form Integration

- [x] Connect search results to form auto-fill
- [x] Remove individual field autocomplete
- [ ] Test complete workflow

### Phase 4: Testing & Optimization

- [ ] Test on iPad for keyboard flickering fix
- [ ] Performance testing and optimization
- [ ] Edge case handling

## 🎨 Design Specifications

### Search Bar Styling

- **Position**: Header row, between title and tabs
- **Width**: Flexible, ~300px optimal
- **Height**: 40px (touch-friendly)
- **Placeholder**: "Search by name, email, or phone..."
- **Icon**: Search icon (🔍) on left side
- **Background**: Match existing input styling

### Dropdown Styling

- **Position**: Absolute, below search bar
- **Max Height**: 200px with scroll
- **Item Format**: `Name - Email - Phone`
- **Empty State**: Hidden when not searching
- **Loading State**: Subtle spinner

## 🔄 Current Status

**Started**: 2025-01-22
**Current Phase**: Phase 3 - Form Integration (Nearly Complete)
**Next Action**: Test complete workflow and remove old autocomplete

## 📝 Implementation Notes

### Technical Decisions

- Using debounced search (300ms delay)
- Maintaining existing API endpoint structure
- Focus management to prevent keyboard flickering
- Clean state management with proper cleanup

### Key Requirements

- Fix iPad keyboard flickering issue
- Maintain existing form functionality
- Improve performance (fewer API calls)
- Better user experience for front desk staff

## 🧪 Testing Checklist

### Functionality Testing

- [ ] Search by name works correctly
- [ ] Search by email works correctly
- [ ] Search by phone works correctly
- [ ] Auto-fill populates all fields correctly
- [ ] Empty search states handled properly
- [ ] Loading states work correctly

### Device Testing

- [ ] Desktop browser functionality
- [ ] iPad keyboard behavior (primary concern)
- [ ] iPhone mobile experience
- [ ] Android mobile experience

### Performance Testing

- [ ] API call frequency (should be debounced)
- [ ] Re-render optimization
- [ ] Memory leak prevention
- [ ] Focus management stability

## 🐛 Known Issues to Address

1. **Current autocomplete persistence**: Dropdowns don't hide properly
2. **Multiple API calls**: No debouncing on existing implementation
3. **Focus management**: Causing keyboard flickering on iOS
4. **State management**: Multiple dropdown states causing conflicts

## 📚 References

- Original issue: iPad keyboard flickering in NewBooking form
- API endpoint: `/api/customers/search`
- Design pattern: Unified search with auto-fill (industry standard)
