# UI Component Testing Guide

## Overview
This guide provides comprehensive testing instructions for all property-related UI components implemented in Phase 4 of the property migration.

## 🧪 Testing Environment Setup

### Prerequisites
1. Start the development server: `npm run dev`
2. Ensure database is seeded with multi-property data
3. Have test users with different property access levels

### Test Data Verification
Run the following to ensure proper test data:
```bash
npx tsx scripts/simple-migration-test.ts
```

Expected results:
- ✅ 2 Properties (Main Property + Beach Property)
- ✅ 5 User-Property Assignments
- ✅ Multiple property roles (PROPERTY_MGR, FRONT_DESK, HOUSEKEEPING, MAINTENANCE)

## 🔄 PropertySwitcher Component Testing

### Location: Header Navigation
**File**: `src/components/PropertySwitcher.tsx`

### Test Cases:

#### 1. **Dropdown Display**
- [ ] PropertySwitcher appears in header between UserMenu and ThemeToggle
- [ ] Shows current property name
- [ ] Displays dropdown arrow icon
- [ ] Responsive design works on mobile/desktop

#### 2. **Property List**
- [ ] Clicking dropdown shows all accessible properties
- [ ] Default property shows "Default" badge
- [ ] Each property shows role badge (PROPERTY_MGR, FRONT_DESK, etc.)
- [ ] Properties are sorted with default first

#### 3. **Property Switching**
- [ ] Clicking different property switches context
- [ ] Page refreshes/updates with new property data
- [ ] URL updates with new property context
- [ ] Loading state shows during switch

#### 4. **Access Control**
- [ ] Only shows properties user has access to
- [ ] ORG_ADMIN users see all organization properties
- [ ] Property-level users see only assigned properties

## 🏢 Property Management Components Testing

### Location: Admin Settings → Properties Tab
**Files**: 
- `src/components/admin/PropertyManagement.tsx`
- `src/components/admin/PropertyForm.tsx`
- `src/components/admin/PropertyList.tsx`

### Test Cases:

#### 1. **Property List View**
- [ ] Navigate to `/admin/settings` → Properties tab
- [ ] All organization properties display in grid
- [ ] Each property card shows: name, address, default badge, stats
- [ ] "Add Property" button visible for ORG_ADMIN
- [ ] Edit/Delete actions available for each property

#### 2. **Property Creation (ORG_ADMIN only)**
- [ ] Click "Add Property" opens form modal
- [ ] Form validation works for required fields
- [ ] Can set property as default
- [ ] Success message on creation
- [ ] New property appears in list immediately

#### 3. **Property Editing**
- [ ] Click edit button opens populated form
- [ ] All fields editable except organization
- [ ] Can change default property status
- [ ] Changes save successfully
- [ ] Updated data reflects immediately

#### 4. **Property Deletion**
- [ ] Delete button shows confirmation dialog
- [ ] Cannot delete default property (error message)
- [ ] Cannot delete property with existing data
- [ ] Successful deletion removes from list

#### 5. **Default Property Management**
- [ ] Only one property can be default at a time
- [ ] Setting new default unsets previous default
- [ ] Default property shows special badge/indicator

## 👥 User-Property Assignment Testing

### Location: Admin Settings → User Assignments Tab
**Files**:
- `src/components/admin/UserPropertyManagement.tsx`
- `src/components/admin/UserPropertyForm.tsx`
- `src/components/admin/UserPropertyList.tsx`

### Test Cases:

#### 1. **Assignment List View**
- [ ] Navigate to `/admin/settings` → User Assignments tab
- [ ] All user-property assignments display
- [ ] Shows user name, property name, role
- [ ] Filter by property works
- [ ] Filter by user works

#### 2. **Creating Assignments (ORG_ADMIN only)**
- [ ] "Add Assignment" button opens form
- [ ] User dropdown shows organization users
- [ ] Property dropdown shows organization properties
- [ ] Role dropdown shows property roles
- [ ] Prevents duplicate assignments
- [ ] Success message on creation

#### 3. **Managing Assignments**
- [ ] Edit assignment changes role
- [ ] Delete assignment removes access
- [ ] Bulk operations work (if implemented)
- [ ] Changes reflect in PropertySwitcher immediately

## 📊 Property-Aware Dashboard Testing

### Location: Main Dashboard
**Files**:
- `src/app/dashboard/page.tsx`
- `src/components/dashboard/PropertyDashboard.tsx`
- `src/app/api/dashboard/stats/route.ts`

### Test Cases:

#### 1. **Dashboard Data Filtering**
- [ ] Dashboard shows data for current property only
- [ ] Statistics are property-specific
- [ ] Charts/graphs filter by property
- [ ] Property name/context visible on dashboard

#### 2. **Property Switching Impact**
- [ ] Switching property updates all dashboard data
- [ ] Loading states show during data refresh
- [ ] No cross-property data leakage
- [ ] Real-time updates work correctly

#### 3. **Dashboard Stats API**
- [ ] `/api/dashboard/stats` returns property-scoped data
- [ ] Statistics match database counts
- [ ] Performance is acceptable
- [ ] Error handling works

## 🔒 Access Control UI Testing

### Test Different User Roles:

#### 1. **ORG_ADMIN User**
- [ ] Can access all properties in organization
- [ ] Can create/edit/delete properties
- [ ] Can manage user-property assignments
- [ ] PropertySwitcher shows all properties

#### 2. **PROPERTY_MGR User**
- [ ] Can access assigned properties only
- [ ] Can manage rooms/reservations in assigned properties
- [ ] Cannot access property management settings
- [ ] PropertySwitcher shows assigned properties only

#### 3. **FRONT_DESK User**
- [ ] Can access assigned properties
- [ ] Can manage reservations
- [ ] Limited room management access
- [ ] Cannot access admin settings

#### 4. **Other Property Roles**
- [ ] HOUSEKEEPING: Limited to housekeeping functions
- [ ] MAINTENANCE: Limited to maintenance functions
- [ ] Proper role-based UI restrictions

## 🌐 Cross-Browser Testing

### Browsers to Test:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)
- [ ] Edge (latest)

### Responsive Testing:
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

## 🚨 Error Handling Testing

### Test Error Scenarios:
- [ ] Network errors during property switching
- [ ] Invalid property access attempts
- [ ] Session expiration during property operations
- [ ] Database connection issues
- [ ] Malformed API responses

## ✅ UI Testing Checklist Summary

### Critical Components:
- [ ] PropertySwitcher functionality
- [ ] Property management CRUD operations
- [ ] User-property assignment management
- [ ] Property-aware dashboard
- [ ] Role-based access control

### Performance:
- [ ] Property switching is fast (<2 seconds)
- [ ] Dashboard loads quickly with property data
- [ ] No memory leaks during property switching
- [ ] Smooth animations and transitions

### Accessibility:
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Proper ARIA labels
- [ ] Color contrast compliance

## 🎯 Success Criteria

All tests should pass with:
- ✅ No JavaScript errors in console
- ✅ Proper property data isolation
- ✅ Smooth user experience
- ✅ Correct role-based access control
- ✅ Responsive design on all devices

## 📝 Test Results Documentation

After completing tests, document:
1. Which tests passed/failed
2. Any bugs discovered
3. Performance observations
4. User experience feedback
5. Recommendations for improvements
