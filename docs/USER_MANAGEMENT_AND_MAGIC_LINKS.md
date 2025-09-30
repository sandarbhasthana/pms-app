# User Management & Magic Link Implementation Guide

## Overview

This document outlines the implementation plan for admin-controlled user management and magic link invitations for the PMS application. The current authentication setup is perfectly positioned for this enterprise-grade approach.

## Current Authentication Foundation

### ✅ What We Have
- **Secure by default**: No public signup allowed
- **Role-based access**: `UserRole` enum with `ORG_ADMIN`, `PROPERTY_MGR`, etc.
- **Multi-tenant architecture**: Users scoped to organizations via `UserOrg`
- **NextAuth + PrismaAdapter**: Handles OAuth flows and user creation
- **Email-based auth**: Unique email field in User model

### 🔒 Current Security Model
```typescript
// Authentication Flow
1. User exists in database → ✅
2. User has UserOrg membership → ✅  
3. User has valid role → ✅
4. Access granted → ✅

// If any step fails → ❌ Access denied
```

## Phase 1: Admin User Management Dashboard

### Database Schema Extensions

```prisma
model InvitationToken {
  id             String       @id @default(cuid())
  email          String
  organizationId String
  role           UserRole
  token          String       @unique
  expiresAt      DateTime
  createdBy      String       // Admin who sent invite
  createdAt      DateTime     @default(now())
  used           Boolean      @default(false)
  usedAt         DateTime?
  
  organization   Organization @relation(fields: [organizationId], references: [id])
  creator        User         @relation(fields: [createdBy], references: [id])
  
  @@index([token])
  @@index([email])
  @@index([organizationId])
}

model UserOrg {
  // ... existing fields
  invitedBy      String?      // Who invited this user
  invitedAt      DateTime?    // When they were invited
  
  inviter        User?        @relation("UserInvitations", fields: [invitedBy], references: [id])
}
```

### API Routes

#### 1. User Management APIs
```typescript
// GET /api/admin/users
// - List all users in organization
// - Filter by role, status, etc.
// - Pagination support

// POST /api/admin/users/invite
// - Create invitation token
// - Send magic link email
// - Role: ORG_ADMIN only

// DELETE /api/admin/users/[id]
// - Remove user from organization
// - Role: ORG_ADMIN only

// PATCH /api/admin/users/[id]/role
// - Update user role
// - Role: ORG_ADMIN only
```

#### 2. Invitation APIs
```typescript
// GET /api/admin/invitations
// - List pending invitations
// - Show sent, used, expired status

// POST /api/admin/invitations/resend
// - Resend magic link
// - Generate new token

// DELETE /api/admin/invitations/[id]
// - Cancel pending invitation
```

### UI Components

#### User Management Table
```typescript
// Location: /settings/users/page.tsx
interface UserManagementProps {
  users: OrganizationUser[];
  currentUserRole: UserRole;
}

// Features:
// - View all organization members
// - Filter by role, status
// - Invite new users
// - Manage user roles
// - Remove users
```

#### Invitation Form
```typescript
// Component: InviteUserModal
interface InviteUserFormData {
  email: string;
  role: UserRole;
  message?: string; // Optional personal message
}

// Features:
// - Email validation
// - Role selection dropdown
// - Bulk invite (CSV upload)
// - Preview invitation email
```

## Phase 2: Magic Link Implementation

### NextAuth Configuration Update

```typescript
// Add to authOptions.providers
import { EmailProvider } from "next-auth/providers/email";

providers: [
  // ... existing providers
  
  EmailProvider({
    server: {
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    },
    from: process.env.EMAIL_FROM,
  }),
]
```

### Magic Link Flow

#### 1. Invitation Creation
```typescript
// POST /api/admin/users/invite
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Verify admin role
  if (session?.user?.role !== "ORG_ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { email, role } = await req.json();
  const orgId = session.user.orgId;
  
  // Generate secure token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  // Store invitation
  await prisma.invitationToken.create({
    data: {
      email,
      organizationId: orgId,
      role,
      token,
      expiresAt,
      createdBy: session.user.id,
    },
  });
  
  // Send magic link email
  await sendInvitationEmail({
    email,
    token,
    organizationName: session.user.orgName,
    inviterName: session.user.name,
  });
  
  return NextResponse.json({ success: true });
}
```

#### 2. Magic Link Processing
```typescript
// GET /api/auth/invite/[token]
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const invitation = await prisma.invitationToken.findUnique({
    where: { token: params.token },
    include: { organization: true },
  });
  
  // Validate invitation
  if (!invitation || invitation.used || invitation.expiresAt < new Date()) {
    return redirect("/auth/signin?error=InvalidInvitation");
  }
  
  // Create or update user
  const user = await prisma.user.upsert({
    where: { email: invitation.email },
    create: {
      email: invitation.email,
      name: "", // Will be filled during onboarding
    },
    update: {}, // User already exists
  });
  
  // Create organization membership
  await prisma.userOrg.create({
    data: {
      userId: user.id,
      organizationId: invitation.organizationId,
      role: invitation.role,
      invitedBy: invitation.createdBy,
      invitedAt: invitation.createdAt,
    },
  });
  
  // Mark invitation as used
  await prisma.invitationToken.update({
    where: { id: invitation.id },
    data: { used: true, usedAt: new Date() },
  });
  
  // Auto-signin and redirect
  return redirect(`/auth/signin?email=${invitation.email}&auto=true`);
}
```

### Email Templates

#### Invitation Email Template
```html
<!-- templates/invitation-email.html -->
<!DOCTYPE html>
<html>
<head>
  <title>You're invited to join {{organizationName}}</title>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
    <h1>You're invited!</h1>
    
    <p>Hi there,</p>
    
    <p>{{inviterName}} has invited you to join <strong>{{organizationName}}</strong> on our Property Management System.</p>
    
    <p>Your role will be: <strong>{{role}}</strong></p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{magicLink}}" 
         style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Accept Invitation
      </a>
    </div>
    
    <p><small>This invitation expires in 24 hours.</small></p>
    
    <p>If you have any questions, please contact {{inviterName}} at {{inviterEmail}}.</p>
    
    <hr>
    <p><small>If you didn't expect this invitation, you can safely ignore this email.</small></p>
  </div>
</body>
</html>
```

## Implementation Timeline

### Week 1-2: Database & API Foundation
- [ ] Add InvitationToken model to schema
- [ ] Create user management API routes
- [ ] Implement invitation creation logic
- [ ] Set up email service integration

### Week 3-4: Admin Dashboard
- [ ] Build user management UI
- [ ] Create invitation form
- [ ] Add role management interface
- [ ] Implement user removal functionality

### Week 5-6: Magic Link System
- [ ] Add EmailProvider to NextAuth
- [ ] Build magic link processing
- [ ] Create email templates
- [ ] Test invitation flow end-to-end

### Week 7: Polish & Security
- [ ] Add invitation expiry handling
- [ ] Implement resend functionality
- [ ] Add audit logging
- [ ] Security testing & validation

## Security Considerations

### Token Security
- ✅ **Cryptographically secure**: Use `crypto.randomUUID()`
- ✅ **Time-limited**: 24-hour expiration
- ✅ **Single-use**: Mark as used after redemption
- ✅ **Indexed**: Fast lookup without exposing structure

### Access Control
- ✅ **Role-based**: Only ORG_ADMIN can invite users
- ✅ **Organization scoped**: Can't invite to other orgs
- ✅ **Audit trail**: Track who invited whom and when

### Email Security
- ✅ **HTTPS only**: All magic links use secure protocol
- ✅ **Domain validation**: Verify sender domain
- ✅ **Rate limiting**: Prevent invitation spam

## Benefits for PMS Use Case

### For Hotel Managers (ORG_ADMIN)
- 🏨 **Team control**: Invite front desk, housekeeping staff
- 🔐 **Security**: No unauthorized access to guest data
- 👥 **Role management**: Assign appropriate permissions
- 📊 **Audit trail**: Track team member activity

### For Staff Members
- ✨ **Easy onboarding**: Click link, start working
- 🔒 **Secure access**: No password to remember/lose
- 📱 **Mobile friendly**: Works on any device
- 🎯 **Role clarity**: Clear permissions from day one

### For System Administrators
- 🏢 **Multi-property**: Each hotel manages own team
- 📈 **Scalable**: Handles growth automatically
- 🛡️ **Compliant**: Enterprise-grade security
- 🔍 **Traceable**: Full invitation audit log

This implementation provides a professional, secure, and user-friendly way to manage team access in a multi-tenant property management system.
