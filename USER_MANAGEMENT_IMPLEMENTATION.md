# User Management System Implementation

## Overview

This document provides a comprehensive overview of the user management system implementation for the Property Management System (PMS). The system allows SUPER_ADMIN, ORG_ADMIN, and PROPERTY_MGR roles to invite, manage, and assign staff members with hierarchical permissions and multi-property support.

## Implementation Phases

### ✅ Phase 1: Database Schema Updates

**Status**: Complete  
**Files Modified**:

- `prisma/schema.prisma`

**Changes Made**:

- Added `phone` field to User model for required phone numbers
- Created `InvitationToken` model for managing user invitations
- Added `shift` field to UserProperty model for shift assignments
- Added `ShiftType` enum (MORNING, EVENING, NIGHT, FLEXIBLE)
- Added proper relationships between models
- Schema validation passed

**Key Features**:

- Comprehensive invitation tracking with expiry and usage status
- Multi-property role assignments with shift support
- Audit trail for invitation creators

### ✅ Phase 2: API Routes Implementation

**Status**: Complete  
**Files Created**:

- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/invite/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/admin/invitations/[id]/route.ts`
- `src/app/api/auth/invite/[token]/route.ts`

**API Endpoints**:

- `GET/POST /api/admin/users` - List and create users
- `POST /api/admin/users/invite` - Send invitations
- `GET /api/admin/users/invite` - List pending invitations
- `GET/PATCH/DELETE /api/admin/users/[id]` - Individual user management
- `GET/PATCH/DELETE /api/admin/invitations/[id]` - Invitation management
- `GET/POST /api/auth/invite/[token]` - Magic link processing

**Security Features**:

- Role hierarchy validation (users can only invite equal or lower roles)
- Organization-scoped operations
- Self-protection (users cannot delete themselves)
- Comprehensive input validation
- Error handling and logging

### ✅ Phase 3: Settings Tab Integration

**Status**: Complete  
**Files Modified**:

- `src/components/settings/SettingsTabs.tsx`

**Files Created**:

- `src/app/settings/staff/page.tsx`

**Features**:

- Added "Staff Management" tab with role-based visibility
- Created protected staff management page with authentication checks
- Integrated with existing settings navigation
- Proper role-based access control

### ✅ Phase 4: User Management UI Components

**Status**: Complete  
**Files Created**:

- `src/components/settings/staff/StaffManagement.tsx`
- `src/components/settings/staff/StaffList.tsx`
- `src/components/settings/staff/InviteUserModal.tsx`
- `src/components/settings/staff/InvitationsList.tsx`
- `src/components/settings/staff/EditStaffModal.tsx`
- `src/components/settings/staff/DeleteStaffModal.tsx`

**UI Features**:

- Comprehensive staff management dashboard with statistics
- Tabbed interface for staff members and invitations
- Real-time invitation status tracking
- Role-based action permissions
- Comprehensive form validation
- Responsive design with modern UI components

### 🔄 Phase 5: Email Service Integration

**Status**: Pending  
**Planned Files**:

- Email service configuration
- Email templates for invitations
- SMTP/Resend integration

**Planned Features**:

- Professional invitation email templates
- Magic link email delivery
- Email service integration (Resend recommended)
- Email delivery status tracking

### 🔄 Phase 6: Permission System Enhancement

**Status**: Pending  
**Planned Enhancements**:

- Fine-tune hierarchical role permissions
- Enhanced multi-property role assignments
- Additional security measures
- Performance optimizations

## Technical Architecture

### Database Schema

```prisma
model User {
  id             String          @id @default(cuid())
  email          String          @unique
  name           String?
  phone          String?         // NEW: Required for staff
  // ... other fields
  sentInvitations InvitationToken[] @relation("InvitationCreator")
}

model InvitationToken {
  id             String       @id @default(cuid())
  email          String
  phone          String?
  organizationId String
  role           UserRole
  propertyId     String?      // Optional property assignment
  propertyRole   PropertyRole?
  shift          ShiftType?
  token          String       @unique
  expiresAt      DateTime
  createdBy      String
  used           Boolean      @default(false)
  usedAt         DateTime?
  // ... relationships
}

model UserProperty {
  // ... existing fields
  shift      ShiftType?   // NEW: Shift assignment
}

enum ShiftType {
  MORNING    // 6 AM - 2 PM
  EVENING    // 2 PM - 10 PM
  NIGHT      // 10 PM - 6 AM
  FLEXIBLE   // No fixed shift
}
```

### Role Hierarchy

```typescript
const roleHierarchy = {
  SUPER_ADMIN: 5, // Platform admin
  ORG_ADMIN: 4, // Organization owner
  PROPERTY_MGR: 3, // Property manager
  FRONT_DESK: 2, // Front desk staff
  HOUSEKEEPING: 1, // Housekeeping staff
  MAINTENANCE: 1, // Maintenance staff
  ACCOUNTANT: 2, // Accounting staff
  OWNER: 4, // Property owner
  IT_SUPPORT: 2 // IT support
};
```

### API Security Model

- **Authentication**: NextAuth session validation
- **Authorization**: Role-based access control
- **Organization Scoping**: All operations scoped to user's organization
- **Role Hierarchy**: Users can only manage equal or lower privilege users
- **Input Validation**: Comprehensive server-side validation
- **Error Handling**: Structured error responses

## Key Features Implemented

### 🔐 Security & Permissions

- **Hierarchical Role System**: SUPER_ADMIN > ORG_ADMIN > PROPERTY_MGR > Others
- **Role-Based Actions**: Users can only invite/manage equal or lower roles
- **Multi-Property Support**: Different roles per property for same user
- **Self-Protection**: Users cannot delete themselves or modify higher-privilege users
- **Organization Isolation**: All operations scoped to user's organization

### 👥 User Management

- **Comprehensive Invitation System**: Email + phone + role + property + shift
- **Magic Link Authentication**: Secure invitation acceptance flow
- **Real-time Status Tracking**: Pending, accepted, expired invitations
- **Bulk Operations**: Resend, cancel invitations
- **User Profile Management**: Edit names, phones, roles, assignments

### 🏨 Property Integration

- **Property-Specific Roles**: Different roles across properties
- **Shift Management**: Morning, Evening, Night, Flexible shifts
- **Multi-Property Assignment**: Single user across multiple properties
- **Property-Scoped Permissions**: Role-based property access

### 🎨 User Experience

- **Modern Interface**: Clean, intuitive design with shadcn/ui components
- **Real-time Feedback**: Toast notifications for all actions
- **Comprehensive Validation**: Client and server-side validation
- **Responsive Design**: Mobile-friendly interface
- **Loading States**: Proper loading indicators and disabled states

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   │   ├── route.ts              # User CRUD operations
│   │   │   │   ├── invite/route.ts       # Invitation management
│   │   │   │   └── [id]/route.ts         # Individual user operations
│   │   │   └── invitations/
│   │   │       └── [id]/route.ts         # Invitation actions
│   │   └── auth/
│   │       └── invite/
│   │           └── [token]/route.ts      # Magic link processing
│   └── settings/
│       └── staff/
│           └── page.tsx                  # Staff management page
├── components/
│   └── settings/
│       ├── SettingsTabs.tsx             # Modified: Added staff tab
│       └── staff/
│           ├── StaffManagement.tsx      # Main staff management component
│           ├── StaffList.tsx            # Staff members table
│           ├── InviteUserModal.tsx      # Invitation form
│           ├── InvitationsList.tsx      # Pending invitations
│           ├── EditStaffModal.tsx       # Edit staff member
│           └── DeleteStaffModal.tsx     # Remove staff member
└── prisma/
    └── schema.prisma                    # Modified: Added user management models
```

## Usage Examples

### Inviting a New Staff Member

1. Navigate to Settings > Staff Management
2. Click "Invite Staff Member"
3. Fill in email, phone, organization role
4. Optionally assign to specific property with role and shift
5. Send invitation

### Managing Existing Staff

1. View staff list with roles and property assignments
2. Edit staff details, roles, and assignments
3. Remove staff members (with proper permissions)
4. Track invitation status and resend if needed

### Role-Based Access

- **SUPER_ADMIN**: Can manage all users and roles
- **ORG_ADMIN**: Can manage all users except SUPER_ADMIN
- **PROPERTY_MGR**: Can manage FRONT_DESK, HOUSEKEEPING, MAINTENANCE, etc.

## Next Steps

1. **Email Service Integration**: Set up Resend and implement email templates
2. **Testing**: Comprehensive testing of all features
3. **Performance Optimization**: Database query optimization
4. **Documentation**: User guides and API documentation
5. **Monitoring**: Error tracking and performance monitoring

## Dependencies Added

- Existing UI components (shadcn/ui)
- Existing authentication system (NextAuth)
- Existing database setup (Prisma)
- No new external dependencies required for current implementation

## Configuration Required

1. **Database Migration**: Run `npx prisma db push` to apply schema changes
2. **Email Service**: Configure Resend API key (Phase 5)
3. **Environment Variables**: Add email service configuration (Phase 5)

## Detailed Component Breakdown

### StaffManagement.tsx

**Purpose**: Main dashboard component with tabs and statistics
**Features**:

- Real-time staff and invitation counts
- Tabbed interface for staff/invitations
- Role-based action buttons
- Statistics cards with activity tracking

### StaffList.tsx

**Purpose**: Comprehensive staff table with management actions
**Features**:

- Staff member details with avatars
- Property assignments with roles and shifts
- Role-based edit/delete permissions
- Hierarchical permission checking

### InviteUserModal.tsx

**Purpose**: Complete invitation form with validation
**Features**:

- Multi-step form with role selection
- Property and shift assignment
- Role hierarchy validation
- Real-time form validation

### InvitationsList.tsx

**Purpose**: Manage pending invitations
**Features**:

- Status tracking (pending, accepted, expired)
- Resend and cancel actions
- Invitation details display
- Bulk operations support

### EditStaffModal.tsx

**Purpose**: Edit existing staff members
**Features**:

- Update basic information
- Modify organization roles
- Manage property assignments
- Add/remove property assignments

### DeleteStaffModal.tsx

**Purpose**: Safe staff removal with confirmations
**Features**:

- Staff information display
- Impact warnings
- Confirmation dialog
- Soft delete (removes from organization)

## API Endpoint Details

### User Management APIs

- **GET /api/admin/users**: Paginated user list with filtering
- **POST /api/admin/users**: Create user (internal use)
- **GET /api/admin/users/[id]**: Get specific user details
- **PATCH /api/admin/users/[id]**: Update user information
- **DELETE /api/admin/users/[id]**: Remove user from organization

### Invitation APIs

- **POST /api/admin/users/invite**: Send new invitation
- **GET /api/admin/users/invite**: List invitations with status filtering
- **GET /api/admin/invitations/[id]**: Get invitation details
- **PATCH /api/admin/invitations/[id]**: Resend invitation
- **DELETE /api/admin/invitations/[id]**: Cancel invitation

### Magic Link APIs

- **GET /api/auth/invite/[token]**: Process invitation acceptance
- **POST /api/auth/invite/[token]**: Complete user onboarding

## Security Considerations

### Input Validation

- Email format validation
- Phone number format checking
- Role hierarchy enforcement
- Property ownership verification
- SQL injection prevention

### Access Control

- Session-based authentication
- Role-based authorization
- Organization-scoped operations
- Self-modification prevention
- Audit trail logging

### Data Protection

- Sensitive data encryption
- Secure token generation
- Invitation expiry enforcement
- Rate limiting (planned)
- GDPR compliance considerations

## Performance Optimizations

### Database Queries

- Indexed foreign keys
- Optimized joins for user listings
- Pagination for large datasets
- Efficient property assignment queries

### Frontend Performance

- Component lazy loading
- Optimistic UI updates
- Debounced search inputs
- Cached API responses

## Error Handling

### API Errors

- Structured error responses
- HTTP status code compliance
- Detailed error messages
- Client-friendly error formatting

### UI Error Handling

- Toast notifications for feedback
- Form validation errors
- Loading state management
- Graceful degradation

## Testing Strategy (Planned)

### Unit Tests

- API endpoint testing
- Component rendering tests
- Utility function tests
- Validation logic tests

### Integration Tests

- End-to-end invitation flow
- Role permission testing
- Multi-property assignment tests
- Database transaction tests

### User Acceptance Tests

- Staff management workflows
- Permission boundary testing
- UI/UX validation
- Cross-browser compatibility

This implementation provides a robust, secure, and user-friendly staff management system that integrates seamlessly with the existing PMS architecture.
