# SUPER_ADMIN & Platform Dashboard Architecture

## Overview

This document outlines the architecture and implementation strategy for the SUPER_ADMIN role and platform dashboard in our multi-tenant Property Management System (PMS).

## Role Hierarchy & Definitions

### Platform Roles

| Role | Scope | Purpose | Example Users |
|------|-------|---------|---------------|
| **SUPER_ADMIN** | Platform-wide | Platform management & support | Your development team, platform support |
| **ORG_ADMIN** | Organization | Business operations management | Hotel chain executives, company administrators |
| **OWNER** | Property-specific | Asset/property ownership | Individual hotel owners, property investors |
| **PROPERTY_MGR** | Property-specific | Day-to-day property operations | Hotel managers, property supervisors |

### SUPER_ADMIN Responsibilities

#### 1. Platform Management
- **Organization Onboarding**: Create new hotel chains/companies
- **Subdomain Provisioning**: Set up `marriott.pms-app.com`, `hilton.pms-app.com`
- **Billing & Subscriptions**: Manage payments, plan limits, feature access
- **System Monitoring**: Platform health, performance across all tenants

#### 2. Cross-Tenant Operations
- **Customer Support**: Help customers across different organizations
- **Data Migration**: Move data between environments or fix issues
- **System Maintenance**: Database updates, security patches
- **Analytics**: Platform-wide usage statistics, business intelligence

#### 3. Business Operations
- **Sales Support**: Demo accounts, trial setups
- **Customer Success**: Onboarding new hotel chains
- **Compliance**: GDPR, data retention policies across all tenants
- **Feature Rollouts**: Beta testing, gradual feature releases

## Architecture Design

### Multi-Tenant Structure

```
Your PMS Platform (pms-app.com)
├── admin.pms-app.com (Platform Dashboard)
│   ├── SUPER_ADMIN access only
│   ├── View all organizations
│   ├── Create new organizations
│   ├── Billing management
│   ├── Support tools
│   └── Platform analytics
│
├── marriott.pms-app.com (Customer Subdomain)
│   ├── ORG_ADMIN: Marriott corporate team
│   ├── Tenant isolation enforced
│   └── Only Marriott's data accessible
│
├── hilton.pms-app.com (Customer Subdomain)
│   ├── ORG_ADMIN: Hilton corporate team
│   ├── Tenant isolation enforced
│   └── Only Hilton's data accessible
│
└── grandpalace.pms-app.com (Customer Subdomain)
    ├── ORG_ADMIN: Grand Palace hotel owner
    ├── Tenant isolation enforced
    └── Only Grand Palace's data accessible
```

### SUPER_ADMIN Access Pattern

#### Single Global Account
- **One SUPER_ADMIN account** for your team (not one per organization)
- **Cross-tenant access** capability
- **Bypass subdomain restrictions** when needed for support

#### Session Structure
```typescript
// SUPER_ADMIN session
{
  user: {
    id: "your-user-id",
    role: "SUPER_ADMIN",
    orgId: null,              // Not tied to any specific org
    canAccessAllOrgs: true,   // Global access flag
    email: "admin@pms-app.com"
  }
}
```

## Implementation Strategy

### 1. Platform Dashboard (`admin.pms-app.com`)

#### Dashboard Features
- **Organization Overview**: List all onboarded organizations
- **Organization Management**: Create, edit, suspend organizations
- **User Management**: View users across all organizations
- **Billing Dashboard**: Revenue, subscriptions, usage metrics
- **Support Tools**: Impersonation, data access, troubleshooting
- **System Health**: Performance metrics, error logs, uptime

#### API Endpoints
```typescript
// Platform-level APIs (SUPER_ADMIN only)
GET  /api/platform/organizations     // List all organizations
POST /api/platform/organizations     // Create new organization
GET  /api/platform/users            // List users across all orgs
GET  /api/platform/analytics        // Platform-wide analytics
POST /api/platform/impersonate      // Impersonate organization
```

### 2. Cross-Tenant Access Implementation

#### Middleware Enhancement
```typescript
// Enhanced middleware for SUPER_ADMIN access
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const subdomain = host.split(".")[0];
  
  // Check if SUPER_ADMIN is accessing customer subdomain
  const session = getSession(req);
  if (session?.user?.role === 'SUPER_ADMIN') {
    // Allow access with special headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-super-admin-access", "true");
    requestHeaders.set("x-target-subdomain", subdomain);
    
    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  }
  
  // Normal tenant isolation for regular users
  // ... existing logic
}
```

#### API Access Control
```typescript
// API middleware for cross-tenant access
export async function validateAccess(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role === 'SUPER_ADMIN') {
    // SUPER_ADMIN can access any organization
    const targetOrgId = req.headers.get('x-admin-target-org');
    return {
      success: true,
      orgId: targetOrgId || null,
      isSuperAdmin: true
    };
  }
  
  // Regular tenant isolation
  const orgId = getOrgIdFromRequest(req);
  return {
    success: !!orgId,
    orgId,
    isSuperAdmin: false
  };
}
```

### 3. Organization Provisioning

#### Automated Onboarding Flow
```typescript
// Organization creation API
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  const { organizationName, domain, adminEmail } = await req.json();
  
  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: organizationName,
      domain: domain, // "marriott"
    }
  });
  
  // 2. Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Organization Admin",
    }
  });
  
  // 3. Link User to Organization
  await prisma.userOrg.create({
    data: {
      userId: adminUser.id,
      organizationId: org.id,
      role: "ORG_ADMIN"
    }
  });
  
  // 4. Send Magic Link Invitation
  await sendMagicLinkInvitation(adminEmail, org.domain);
  
  return NextResponse.json({ 
    organizationId: org.id,
    subdomain: `${domain}.pms-app.com`,
    adminInviteSent: true 
  });
}
```

## Security Considerations

### 1. Access Control
- **SUPER_ADMIN authentication** required for platform dashboard
- **IP restrictions** for admin access (optional)
- **Audit logging** for all SUPER_ADMIN actions
- **Session timeout** for security

### 2. Data Isolation
- **Tenant isolation** maintained for regular users
- **Explicit override** required for cross-tenant access
- **Audit trail** for all cross-tenant operations
- **Data encryption** at rest and in transit

### 3. Compliance
- **GDPR compliance** for data access across tenants
- **SOC 2** compliance for platform operations
- **Data retention** policies across all organizations
- **Privacy controls** for customer data

## Next Steps

### Phase 1: Core Implementation
- [ ] Create platform dashboard (`admin.pms-app.com`)
- [ ] Implement SUPER_ADMIN authentication
- [ ] Build organization management APIs
- [ ] Create organization provisioning flow

### Phase 2: Advanced Features
- [ ] Implement cross-tenant access controls
- [ ] Build support impersonation tools
- [ ] Create billing dashboard
- [ ] Add platform analytics

### Phase 3: Security & Compliance
- [ ] Implement audit logging
- [ ] Add IP restrictions
- [ ] Create compliance reports
- [ ] Security testing and hardening

## Conclusion

The SUPER_ADMIN role is essential for managing a multi-tenant SaaS platform. It provides the necessary tools and access controls to onboard customers, provide support, and maintain the platform while preserving tenant isolation and security.

This architecture follows industry best practices used by successful SaaS platforms like Stripe, Shopify, and Salesforce.
