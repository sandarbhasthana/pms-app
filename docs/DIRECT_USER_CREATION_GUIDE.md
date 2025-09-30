# Direct User Creation Feature

## Overview

The PMS application now supports **two methods** for adding users to an organization:

1. **Magic Link Invitations** (existing) - Send email invitations for users to join
2. **Direct User Creation** (new) - Create users directly and assign them to the organization immediately

## Features Added

### 1. CreateUserModal Component
**Location**: `src/components/settings/staff/CreateUserModal.tsx`

**Features**:
- ✅ Create users with name, email, and phone
- ✅ Assign organization roles (STAFF, PROPERTY_MGR, ORG_ADMIN)
- ✅ Optional property assignments with roles and shifts
- ✅ Role hierarchy validation based on current user's permissions
- ✅ Form validation with proper error handling
- ✅ Responsive design with proper styling

### 2. Enhanced StaffManagement Interface
**Location**: `src/components/settings/staff/StaffManagement.tsx`

**Updates**:
- ✅ Added "Create User" button alongside "Send Invitation"
- ✅ Integrated CreateUserModal with proper state management
- ✅ Automatic refresh of staff list after user creation

### 3. Updated API Permissions
**Location**: `src/app/api/admin/users/route.ts`

**Changes**:
- ✅ Extended permissions to allow PROPERTY_MGR to create users directly
- ✅ Maintains existing validation and security measures

## User Flow

### Direct User Creation Flow
1. **Admin Access**: User with SUPER_ADMIN, ORG_ADMIN, or PROPERTY_MGR role navigates to Settings → Staff
2. **Create User**: Clicks "Create User" button
3. **Fill Form**: Enters user details:
   - Full Name (required)
   - Email Address (required)
   - Phone Number (required)
   - Organization Role (required)
   - Property Assignments (optional)
4. **Submit**: User is created immediately and added to organization
5. **Immediate Access**: Created user can sign in right away using configured authentication providers

### Magic Link Invitation Flow (Existing)
1. **Admin Access**: Same as above
2. **Send Invitation**: Clicks "Send Invitation" button
3. **Fill Form**: Enters invitation details
4. **Email Sent**: User receives magic link via email
5. **User Accepts**: User clicks link, gets added to organization
6. **Sign In**: User can then sign in

## API Endpoints

### POST /api/admin/users
**Purpose**: Create user directly and assign to organization

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1 (555) 123-4567",
  "organizationRole": "STAFF",
  "propertyAssignments": [
    {
      "propertyId": "property-id",
      "role": "STAFF",
      "shift": "MORNING"
    }
  ]
}
```

**Response**:
```json
{
  "message": "User created successfully",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1 (555) 123-4567",
    "organizationRole": "STAFF"
  }
}
```

## Security & Permissions

### Role-Based Access Control
- **SUPER_ADMIN**: Can create users with any role
- **ORG_ADMIN**: Can create users with roles: STAFF, PROPERTY_MGR, ORG_ADMIN
- **PROPERTY_MGR**: Can create users with role: STAFF only

### Data Validation
- ✅ Email format validation
- ✅ Phone number format validation
- ✅ Required field validation
- ✅ Role hierarchy enforcement
- ✅ Duplicate user prevention

### Database Operations
1. **User Creation**: Creates or updates User record
2. **Organization Membership**: Creates UserOrg relationship
3. **Property Assignments**: Creates UserProperty relationships (if specified)
4. **Atomic Operations**: All operations wrapped in transaction-like behavior

## Benefits

### For Administrators
- **Faster Onboarding**: No need to wait for email acceptance
- **Immediate Access**: Users can start working right away
- **Bulk Operations**: Can create multiple users quickly
- **Control**: Full control over user creation process

### For Organizations
- **Streamlined Workflow**: Reduces onboarding friction
- **Better UX**: Two clear options for different scenarios
- **Flexibility**: Choose method based on situation
- **Consistency**: Same role and permission system

## When to Use Each Method

### Use Direct User Creation When:
- ✅ Creating accounts for employees who are physically present
- ✅ Bulk onboarding during system setup
- ✅ Internal staff who don't need email verification
- ✅ Immediate access is required

### Use Magic Link Invitations When:
- ✅ Inviting external contractors or consultants
- ✅ Users are remote and need email verification
- ✅ Want to include personal messages
- ✅ Prefer email-based workflow

## Technical Implementation

### Component Architecture
```
StaffManagement (Parent)
├── CreateUserModal (New)
├── InviteUserModal (Existing)
├── StaffList (Existing)
└── InvitationsList (Existing)
```

### State Management
- Modal visibility states managed in parent component
- Form data isolated within each modal
- Automatic refresh triggers after successful operations

### Error Handling
- Client-side validation with immediate feedback
- Server-side validation with detailed error messages
- Toast notifications for success/error states
- Graceful fallback for API failures

## Future Enhancements

### Potential Improvements
- [ ] Bulk user import via CSV
- [ ] User templates for common role configurations
- [ ] Integration with HR systems
- [ ] Automated welcome emails for directly created users
- [ ] User activation/deactivation workflow
