# End-to-End Testing Guide for Property Migration

## 🎯 Overview

This guide provides comprehensive end-to-end testing scenarios to validate the complete property migration implementation across all user roles and multi-property scenarios.

## 🚀 Pre-Test Setup

### 1. Environment Preparation

```bash
# Start the application
npm run dev

# Verify database migration
npx tsx scripts/simple-migration-test.ts

# Verify API endpoints
npx tsx scripts/test-api-endpoints.ts
```

### 2. Test Data Requirements

- ✅ 2+ Properties (Main + Beach Resort)
- ✅ Multiple user roles (ORG_ADMIN, PROPERTY_MGR, FRONT_DESK, etc.)
- ✅ Sample rooms, room types, and reservations
- ✅ User-property assignments

## 🧪 End-to-End Test Scenarios

### Scenario 1: ORG_ADMIN Complete Workflow

#### **User Story**: Organization administrator manages multi-property setup

**Steps:**

1. **Login as ORG_ADMIN**

   - [ ] Login with organization admin credentials
   - [ ] Verify PropertySwitcher shows all organization properties
   - [ ] Confirm default property is pre-selected

2. **Property Management**

   - [ ] Navigate to Admin Settings → Properties
   - [ ] View existing properties list
   - [ ] Create new property "Downtown Branch"
   - [ ] Edit existing property details
   - [ ] Set different property as default
   - [ ] Verify default property changes across system

3. **User Assignment Management**

   - [ ] Navigate to Admin Settings → User Assignments
   - [ ] Assign user to new property with PROPERTY_MGR role
   - [ ] Assign user to multiple properties with different roles
   - [ ] Remove user assignment
   - [ ] Verify changes reflect in PropertySwitcher for affected users

4. **Multi-Property Data Verification**
   - [ ] Switch between properties using PropertySwitcher
   - [ ] Verify dashboard shows different data for each property
   - [ ] Confirm rooms/reservations are property-specific
   - [ ] Check that no cross-property data appears

**Expected Results:**

- ✅ Complete property management control
- ✅ User assignments work correctly
- ✅ Data isolation maintained across properties
- ✅ PropertySwitcher updates immediately

### Scenario 2: PROPERTY_MGR Single Property Workflow

#### **User Story**: Property manager manages their assigned property

**Steps:**

1. **Login as PROPERTY_MGR**

   - [ ] Login with property manager credentials
   - [ ] Verify PropertySwitcher shows only assigned property
   - [ ] Confirm no access to other properties

2. **Room Management**

   - [ ] Navigate to Rooms section
   - [ ] View rooms for assigned property only
   - [ ] Create new room in assigned property
   - [ ] Edit existing room details
   - [ ] Verify room appears in property context

3. **Room Type Management**

   - [ ] Navigate to Room Types section
   - [ ] Create new room type for property
   - [ ] Edit existing room type
   - [ ] Assign rooms to room type
   - [ ] Verify property-scoped room types

4. **Reservation Management**

   - [ ] Navigate to Reservations/Calendar
   - [ ] View reservations for property only
   - [ ] Create new reservation
   - [ ] Edit existing reservation
   - [ ] Verify no access to other property reservations

5. **Access Control Verification**
   - [ ] Attempt to access Admin Settings (should be denied)
   - [ ] Verify cannot create/edit properties
   - [ ] Confirm cannot manage user assignments

**Expected Results:**

- ✅ Access limited to assigned property only
- ✅ Full management rights within property scope
- ✅ No access to admin functions
- ✅ Data isolation enforced

### Scenario 3: FRONT_DESK Multi-Property Workflow

#### **User Story**: Front desk staff with access to multiple properties

**Steps:**

1. **Login as FRONT_DESK**

   - [ ] Login with front desk credentials
   - [ ] Verify PropertySwitcher shows assigned properties
   - [ ] Switch between accessible properties

2. **Reservation Management**

   - [ ] Create reservation in Property A
   - [ ] Switch to Property B using PropertySwitcher
   - [ ] Create reservation in Property B
   - [ ] Verify reservations are property-specific
   - [ ] Edit reservations in both properties

3. **Guest Management**

   - [ ] Access guest information for current property
   - [ ] Switch properties and verify different guest data
   - [ ] Confirm no cross-property guest data leakage

4. **Limited Access Verification**
   - [ ] Verify cannot create/edit rooms
   - [ ] Confirm cannot manage room types
   - [ ] Check no access to admin settings
   - [ ] Verify appropriate role-based restrictions

**Expected Results:**

- ✅ Multi-property access working correctly
- ✅ Property switching maintains data isolation
- ✅ Role-based permissions enforced
- ✅ Reservation management works across properties

### Scenario 4: Property Switching & Data Isolation

#### **User Story**: Verify complete data isolation between properties

**Steps:**

1. **Setup Test Data**

   - [ ] Create unique rooms in Property A
   - [ ] Create unique rooms in Property B
   - [ ] Create reservations in both properties
   - [ ] Assign different users to each property

2. **Data Isolation Testing**

   - [ ] Login as user with access to Property A only
   - [ ] Verify only Property A data visible
   - [ ] Login as user with access to Property B only
   - [ ] Verify only Property B data visible
   - [ ] Login as multi-property user
   - [ ] Switch between properties and verify data changes

3. **Cross-Property Access Prevention**
   - [ ] Attempt direct URL access to other property data
   - [ ] Try API calls with wrong property context
   - [ ] Verify proper error messages and access denial

**Expected Results:**

- ✅ Perfect data isolation between properties
- ✅ No unauthorized cross-property access
- ✅ Proper error handling for invalid access
- ✅ URL-based access properly restricted

### Scenario 5: Performance & User Experience

#### **User Story**: System performs well under multi-property load

**Steps:**

1. **Performance Testing**

   - [ ] Measure property switching speed (<2 seconds)
   - [ ] Test dashboard loading with large datasets
   - [ ] Verify smooth animations and transitions
   - [ ] Check memory usage during property switching

2. **User Experience Testing**

   - [ ] Test responsive design on mobile/tablet
   - [ ] Verify keyboard navigation works
   - [ ] Check accessibility features
   - [ ] Test with slow network conditions

3. **Error Handling**
   - [ ] Test network disconnection during property switch
   - [ ] Verify graceful handling of API errors
   - [ ] Check session expiration handling
   - [ ] Test invalid property access attempts

**Expected Results:**

- ✅ Fast property switching performance
- ✅ Responsive design works on all devices
- ✅ Graceful error handling
- ✅ Good user experience across scenarios

## 🔍 Critical Test Checkpoints

### Data Integrity Checkpoints

- [ ] No orphaned data after property operations
- [ ] Foreign key relationships maintained
- [ ] Default property constraints enforced
- [ ] User assignments properly validated

### Security Checkpoints

- [ ] Role-based access control working
- [ ] Property-level data isolation enforced
- [ ] Session-based property context secure
- [ ] API endpoints properly protected

### Performance Checkpoints

- [ ] Property switching < 2 seconds
- [ ] Dashboard loads < 3 seconds
- [ ] No memory leaks during usage
- [ ] Database queries optimized

### User Experience Checkpoints

- [ ] Intuitive property switching
- [ ] Clear property context indicators
- [ ] Proper error messages
- [ ] Responsive design functional

## 📊 Test Results Documentation

### Test Execution Log

```
Date: ___________
Tester: ___________
Environment: ___________

Scenario 1 (ORG_ADMIN): ☐ PASS ☐ FAIL
Scenario 2 (PROPERTY_MGR): ☐ PASS ☐ FAIL
Scenario 3 (FRONT_DESK): ☐ PASS ☐ FAIL
Scenario 4 (Data Isolation): ☐ PASS ☐ FAIL
Scenario 5 (Performance): ☐ PASS ☐ FAIL

Overall Result: ☐ PASS ☐ FAIL
```

### Issues Found

```
Issue #1: ___________
Severity: ☐ Critical ☐ High ☐ Medium ☐ Low
Status: ☐ Open ☐ Fixed ☐ Deferred

Issue #2: ___________
Severity: ☐ Critical ☐ High ☐ Medium ☐ Low
Status: ☐ Open ☐ Fixed ☐ Deferred
```

## ✅ Success Criteria

**All scenarios must pass with:**

- ✅ No critical or high-severity bugs
- ✅ Complete data isolation between properties
- ✅ Proper role-based access control
- ✅ Acceptable performance metrics
- ✅ Good user experience across all roles

## 🎯 Final Validation

Before marking the property migration complete:

- [ ] All 5 test scenarios pass
- [ ] No critical issues remain
- [ ] Performance meets requirements
- [ ] User acceptance testing completed
- [ ] Documentation updated
- [ ] Team training completed

**🏆 Migration Status: ☐ READY FOR PRODUCTION ☐ NEEDS WORK**

## 🚀 Quick Validation Script

For automated validation of core functionality:

```bash
# Run all validation scripts
npx tsx scripts/simple-migration-test.ts
npx tsx scripts/test-api-endpoints.ts

# Check component structure
ls -la src/components/admin/Property*
ls -la src/components/admin/UserProperty*
ls -la src/components/PropertySwitcher.tsx
```
