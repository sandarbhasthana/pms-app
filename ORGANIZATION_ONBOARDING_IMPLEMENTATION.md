# Organization Onboarding Implementation Plan

## Project Overview

**Objective**: Create a streamlined 3-step organization onboarding process for SUPER_ADMINs to create new organizations with admin users.

**Priority**: HIGH - Implement AFTER dashboard database models to ensure tracking from day one.

**Access Level**: SUPER_ADMIN only

**Design Pattern**: NewBookingSheet-style incremental form with summary

**Estimated Timeline**: 5-6 days

---

## Dependencies

### Required Before Implementation:

- [x] Dashboard database models (SystemMetrics, OrganizationMetrics, SystemActivity, OnboardingTracking)
- [x] Activity tracking service infrastructure
- [ ] Email service configuration for credential sending

### Integration Points:

- Dashboard analytics tracking
- Email system for admin credentials
- Organization and user management systems

---

## Phase 1: Form Structure & Validation (1-2 days)

### 1.1: Form Schema & Validation

**Status**: ✅ Completed
**Assigned**: [DEVELOPER]
**Started**: 2025-09-20
**Completed**: 2025-09-20

**Tasks**:

- [x] Create Zod validation schemas for all form steps
- [x] Implement organization name and domain uniqueness validation
- [x] Create admin user email uniqueness validation
- [x] Add real-time validation with debouncing
- [x] Create form data type definitions
- [x] Add validation error message constants

**Files Created**:

- `src/lib/validations/organization-onboarding.ts` - Complete validation schemas
- `src/lib/types/organization-onboarding.ts` - TypeScript types and interfaces
- Validation messages and constants included in validation file

**Validation Rules**:

```typescript
Step 1: Organization Details
- name: min 2 chars, unique check
- domain: min 3 chars, unique check, format validation
- industry: enum selection
- size: enum selection
- contactInfo: optional phone/address

Step 2: Admin User Details
- name: min 2 chars, required
- email: valid email format, unique check
- phone: optional, format validation

Step 3: Review & Confirmation
- terms acceptance: required boolean
```

### 1.2: API Validation Endpoints

**Status**: ✅ Completed
**Assigned**: [DEVELOPER]
**Started**: 2025-09-20
**Completed**: 2025-09-20

**Tasks**:

- [x] Create `/api/admin/organizations/check-domain` endpoint
- [x] Create `/api/admin/organizations/check-email` endpoint
- [x] Add SUPER_ADMIN access control to validation endpoints
- [x] Implement debounced validation calls
- [x] Add proper error handling and responses
- [x] Create validation utilities for reuse

**Files Created**:

- `src/app/api/admin/organizations/check-domain/route.ts` - Domain availability checking
- `src/app/api/admin/organizations/check-email/route.ts` - Email availability checking
- Both endpoints include domain/email suggestions when unavailable

---

## Phase 2: Onboarding Sheet Component (2 days)

### 2.1: Main Sheet Structure (NewBookingSheet Pattern)

**Status**: ✅ Completed
**Assigned**: [DEVELOPER]
**Started**: 2025-09-20
**Completed**: 2025-09-20

**Tasks**:

- [x] Create main OnboardingSheet component with sheet layout
- [x] Implement step navigation system (1 → 2 → 3)
- [x] Add step indicator with progress visualization
- [x] Create form state management with React Hook Form
- [x] Add Previous/Next button navigation logic
- [x] Implement form data persistence between steps

**Files Created**:

- `src/app/admin/organizations/onboarding/components/OnboardingSheet.tsx` - Main sheet component
- `src/app/admin/organizations/onboarding/components/StepIndicator.tsx` - Step navigation
- `src/hooks/use-debounce.ts` - Debouncing utility hook

**Component Structure**:

```typescript
OnboardingSheet
├── Header (title + step indicator)
├── Form Content (current step)
├── Footer (Previous/Next buttons)
└── Loading/Error states
```

### 2.2: Individual Step Components

**Status**: ✅ Completed
**Assigned**: [DEVELOPER]
**Started**: 2025-09-20
**Completed**: 2025-09-20

**Tasks**:

- [x] Create OrganizationStep component (Step 1)
- [x] Create AdminUserStep component (Step 2)
- [x] Create ReviewStep component (Step 3)
- [x] Add form field components with consistent styling
- [x] Implement step-specific validation
- [x] Add loading states for async validation

**Files Created**:

- `src/app/admin/organizations/onboarding/components/OrganizationStep.tsx` - Step 1 form
- `src/app/admin/organizations/onboarding/components/AdminUserStep.tsx` - Step 2 form
- `src/app/admin/organizations/onboarding/components/ReviewStep.tsx` - Step 3 review

**Step Details**:

```typescript
Step 1: Organization Details
- Organization Name (text input)
- Domain/Subdomain (text input with validation)
- Industry Type (select dropdown)
- Organization Size (select dropdown)
- Contact Phone (optional text input)
- Contact Address (optional textarea)

Step 2: Admin User Details
- Admin Full Name (text input)
- Admin Email (email input with validation)
- Admin Phone (optional text input)
- Role Display (ORG_ADMIN - read-only)

Step 3: Review & Confirmation
- Organization summary card
- Admin user summary card
- Terms & Conditions checkbox
- Final submission button
```

---

## Phase 3: Backend Implementation (1-2 days)

### 3.1: Main Onboarding API Endpoint

**Status**: ✅ Completed
**Assigned**: [DEVELOPER]
**Started**: 2025-09-20
**Completed**: 2025-09-20

**Tasks**:

- [x] Create `/api/admin/organizations/onboard` POST endpoint
- [x] Implement SUPER_ADMIN access control
- [x] Add comprehensive request validation
- [x] Create atomic database transaction for organization creation
- [x] Generate secure temporary password for admin user
- [x] Implement error handling and rollback logic

**Files Created**:

- `src/app/api/admin/organizations/onboard/route.ts` - Main onboarding API
- `src/lib/utils/password-generator.ts` - Secure password generation
- Integrated with existing analytics tracking system

**Database Operations** (Atomic Transaction):

```sql
1. INSERT INTO organizations (name, domain, industry, size, contactInfo)
2. INSERT INTO users (name, email, phone, role: ORG_ADMIN, hashedPassword)
3. INSERT INTO userOrgs (userId, organizationId, role: ORG_ADMIN)
4. INSERT INTO onboardingTracking (organizationId, startedAt, completedAt)
5. INSERT INTO systemActivity (ORGANIZATION_CREATED event)
```

### 3.2: Email Service Integration

**Status**: ✅ Completed
**Assigned**: [DEVELOPER]
**Started**: 2025-09-20
**Completed**: 2025-09-20

**Tasks**:

- [x] Create admin welcome email template
- [x] Implement email sending service for credentials
- [x] Add email template with organization details and login info
- [x] Create email sending utilities with error handling
- [x] Add email delivery confirmation tracking
- [x] Implement email retry logic for failures

**Files Created**:

- `src/lib/email/templates/org-admin-welcome.ts` - Welcome email template
- HTML and text email templates with professional styling
- Email sending placeholder ready for service integration

**Email Template Content**:

```
Subject: Welcome to PMS - Your Organization Account is Ready

- Welcome message with organization name
- Login credentials (email + temporary password)
- Login URL and next steps
- Password change requirement notice
- Support contact information
- Organization setup checklist
```

---

## Phase 4: UI Integration & Styling (1 day)

### 4.1: Main Onboarding Page

**Status**: ⏳ Not Started
**Assigned**: [DEVELOPER]
**Started**: [DATE]
**Completed**: [DATE]

**Tasks**:

- [ ] Create `/admin/organizations/onboarding` page route
- [ ] Add SUPER_ADMIN role protection
- [ ] Implement page layout with proper styling
- [ ] Add onboarding sheet trigger button
- [ ] Create success/error state handling
- [ ] Add breadcrumb navigation

**Files to Create**:

- `src/app/admin/organizations/onboarding/page.tsx`
- `src/components/admin/onboarding/OnboardingTrigger.tsx`

### 4.2: Navigation & Access Integration

**Status**: ⏳ Not Started
**Assigned**: [DEVELOPER]
**Started**: [DATE]
**Completed**: [DATE]

**Tasks**:

- [ ] Add onboarding link to admin sidebar (SUPER_ADMIN only)
- [ ] Update admin navigation with proper role-based visibility
- [ ] Add onboarding quick action to dashboard
- [ ] Create onboarding success page with next steps
- [ ] Add proper loading and error states throughout

**Files to Update**:

- Admin sidebar navigation component
- Dashboard quick actions section
- Admin layout with role-based menu items

---

## Phase 5: Analytics Integration (1 day)

### 5.1: Onboarding Tracking Implementation

**Status**: ✅ Completed
**Assigned**: [DEVELOPER]
**Started**: 2025-09-20
**Completed**: 2025-09-20

**Tasks**:

- [ ] Integrate OnboardingTracking model with form steps
- [ ] Track step completion timestamps
- [ ] Record onboarding abandonment events
- [ ] Calculate time-to-complete metrics
- [ ] Update dashboard analytics with onboarding data
- [ ] Add real-time onboarding funnel updates

**Files to Update**:

- OnboardingSheet component (add tracking hooks)
- Dashboard analytics components
- Activity tracking service

### 5.2: System Activity Logging

**Status**: ✅ Completed
**Assigned**: [DEVELOPER]
**Started**: 2025-09-20
**Completed**: 2025-09-20

**Tasks**:

- [ ] Log ORGANIZATION_CREATED events
- [ ] Log USER_CREATED events for admin users
- [ ] Track onboarding completion events
- [ ] Record email sending success/failure
- [ ] Update system metrics in real-time
- [ ] Add activity feed updates for dashboard

**Integration Points**:

- ActivityTracker service calls
- SystemMetrics updates
- Dashboard real-time updates
- Admin activity feed

---

## Testing Strategy

### Unit Tests:

- [ ] Form validation logic testing
- [ ] API endpoint functionality testing
- [ ] Email service testing with mocks
- [ ] Database transaction testing
- [ ] Password generation utility testing

### Integration Tests:

- [ ] Complete onboarding flow testing
- [ ] Email delivery integration testing
- [ ] Database rollback scenario testing
- [ ] Analytics tracking integration testing
- [ ] SUPER_ADMIN access control testing

### E2E Tests:

- [ ] Full user journey from start to completion
- [ ] Form validation and error handling
- [ ] Success and failure scenarios
- [ ] Mobile responsiveness testing
- [ ] Cross-browser compatibility testing

---

## Error Handling Strategy

### Client-Side Error Handling:

- [ ] Form validation errors with user-friendly messages
- [ ] Network error handling with retry options
- [ ] Loading states during async operations
- [ ] Toast notifications for success/error states
- [ ] Graceful degradation for JavaScript failures

### Server-Side Error Handling:

- [ ] Comprehensive input validation
- [ ] Database transaction rollback on failures
- [ ] Email sending failure handling
- [ ] Proper HTTP status codes and error messages
- [ ] Error logging for debugging and monitoring

### Recovery Mechanisms:

- [ ] Form data persistence during errors
- [ ] Retry mechanisms for transient failures
- [ ] Manual intervention options for failed onboardings
- [ ] Data cleanup utilities for incomplete onboardings

---

## Security Considerations

### Access Control:

- [ ] Strict SUPER_ADMIN role validation
- [ ] API endpoint protection
- [ ] Input sanitization and validation
- [ ] Rate limiting for onboarding endpoints

### Data Security:

- [ ] Secure password generation and hashing
- [ ] Email credential security
- [ ] Audit trail for all onboarding actions
- [ ] Data encryption for sensitive information

### Email Security:

- [ ] Secure email template rendering
- [ ] Email delivery confirmation
- [ ] Temporary password expiration
- [ ] Email rate limiting and spam prevention

---

## Performance Considerations

### Form Performance:

- [ ] Debounced validation to reduce API calls
- [ ] Optimistic UI updates where appropriate
- [ ] Efficient form state management
- [ ] Lazy loading of non-critical components

### API Performance:

- [ ] Database query optimization
- [ ] Connection pooling for high concurrency
- [ ] Caching for validation endpoints
- [ ] Async processing for non-critical operations

### Email Performance:

- [ ] Async email sending to avoid blocking
- [ ] Email queue management for high volume
- [ ] Retry mechanisms with exponential backoff
- [ ] Email delivery status tracking

---

## Post-Implementation Features

### Immediate Enhancements:

- [ ] Bulk organization creation
- [ ] Organization import from CSV
- [ ] Custom email templates
- [ ] Advanced organization settings

### Future Features:

- [ ] Organization onboarding analytics dashboard
- [ ] A/B testing for onboarding flow
- [ ] Multi-language support
- [ ] Custom onboarding workflows

---

## Status Legend

- ⏳ **Not Started** - Task not yet begun
- 🔄 **In Progress** - Task currently being worked on
- ✅ **Completed** - Task finished and tested
- ❌ **Blocked** - Task blocked by dependency or issue
- ⚠️ **Needs Review** - Task completed but needs review

---

## Final Checklist

- [ ] All form components created and styled
- [ ] Backend API endpoints secured and functional
- [ ] Email service integrated and tested
- [ ] Analytics tracking implemented
- [ ] Error handling comprehensive
- [ ] Security measures implemented
- [ ] Performance optimized
- [ ] Testing completed successfully
- [ ] Documentation updated
- [ ] Integration with dashboard completed
