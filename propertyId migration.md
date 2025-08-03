# PropertyId Migration Plan

## Overview

This document outlines the migration from organization-level data isolation to property-level data isolation within organizations. This enables a single organization to manage multiple properties with granular access control.

## Current vs Target Architecture

### Current Architecture

```
Organization (OrgID_123: "Grand Palace Hotels")
├── RoomType: Executive Suite
├── RoomType: Ocean View
├── Rooms: 101, 102, OV01, OV02 (all mixed together)
└── Reservations: All rooms in one pool
```

### Target Architecture

```
Organization (OrgID_123: "Grand Palace Hotels")
├── Property A (PropertyID_456: "Downtown NYC")
│   ├── RoomType: Executive Suite
│   ├── RoomType: Deluxe Room
│   ├── Rooms: 101, 102, 201, 202
│   └── Reservations for Downtown property
└── Property B (PropertyID_789: "Beach Resort")
    ├── RoomType: Ocean View
    ├── RoomType: Beachfront Villa
    ├── Rooms: BV01, BV02, OV101, OV102
    └── Reservations for Beach property
```

## Access Control Model

### Organization Level Access

```typescript
UserOrg {
  userId: "user_123",
  organizationId: "OrgID_123",
  role: "ORG_ADMIN"  // Can access ALL properties A & B
}
```

### Property Level Access

```typescript
UserProperty {
  userId: "user_456",
  propertyId: "PropertyID_456",
  role: "HOUSEKEEPING"  // Can access ONLY Downtown NYC property
}
```

### Role Hierarchy

- **ORG_ADMIN**: Full access to all properties within organization
- **ORG_MANAGER**: Management access to all properties within organization
- **PROPERTY_MGR**: Full access to assigned property only
- **FRONT_DESK**: Booking/guest access to assigned property only
- **HOUSEKEEPING**: Room status access to assigned property only

## Database Schema Changes

### New Tables

#### Property Table

```prisma
model Property {
  id             String       @id @default(cuid())
  organizationId String       // Links to Organization
  name           String       // "Downtown NYC", "Beach Resort"
  address        String?
  phone          String?
  email          String?
  timezone       String       @default("UTC")
  currency       String       @default("USD")
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id])
  roomTypes      RoomType[]
  rooms          Room[]
  reservations   Reservation[]
  userProperties UserProperty[]

  @@index([organizationId])
  @@unique([organizationId, name])
}
```

#### UserProperty Table

```prisma
model UserProperty {
  id         String       @id @default(cuid())
  userId     String
  propertyId String
  role       PropertyRole
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  user       User         @relation(fields: [userId], references: [id])
  property   Property     @relation(fields: [propertyId], references: [id])

  @@unique([userId, propertyId])
  @@index([userId])
  @@index([propertyId])
}
```

#### New Enums

```prisma
enum PropertyRole {
  PROPERTY_MGR
  FRONT_DESK
  HOUSEKEEPING
  MAINTENANCE
  SECURITY
  GUEST_SERVICES
}
```

### Modified Tables

#### Organization (Add Properties Relationship)

```prisma
model Organization {
  // ... existing fields
  properties   Property[]    // NEW: Has many properties
}
```

#### User (Add Property Access)

```prisma
model User {
  // ... existing fields
  userProperties UserProperty[] // NEW: Property-level access
}
```

#### RoomType (Change to Property-based)

```prisma
model RoomType {
  // CHANGE: organizationId → propertyId
  propertyId String   // Links to Property instead of Organization
  property   Property @relation(fields: [propertyId], references: [id])
  // Remove: organization relationship
}
```

#### Room (Change to Property-based)

````

## Migration Strategy

### Phase 1: Database Migration (2-3 days)

#### Step 1: Create New Tables
```sql
-- Create Property table
CREATE TABLE "Property" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
);

-- Create UserProperty table
CREATE TABLE "UserProperty" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  role TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "User"(id),
  FOREIGN KEY ("propertyId") REFERENCES "Property"(id),
  UNIQUE("userId", "propertyId")
);
````

#### Step 2: Create Default Properties

```sql
-- Create default property for each existing organization
INSERT INTO "Property" (id, "organizationId", name, address)
SELECT
  CONCAT(id, '_default'),
  id,
  CONCAT(name, ' - Main Property'),
  'Default Property'
FROM "Organization";
```

#### Step 3: Add PropertyId Columns

```sql
-- Add propertyId to existing tables
ALTER TABLE "RoomType" ADD COLUMN "propertyId" TEXT;
ALTER TABLE "Room" ADD COLUMN "propertyId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "propertyId" TEXT;
```

#### Step 4: Migrate Existing Data

```sql
-- Update RoomType to use default property
UPDATE "RoomType"
SET "propertyId" = CONCAT("organizationId", '_default')
WHERE "propertyId" IS NULL;

-- Update Room to use default property
UPDATE "Room"
SET "propertyId" = CONCAT("organizationId", '_default')
WHERE "propertyId" IS NULL;

-- Update Reservation to use default property
UPDATE "Reservation"
SET "propertyId" = CONCAT("organizationId", '_default')
WHERE "propertyId" IS NULL;
```

#### Step 5: Add Constraints and Remove Old Columns

```sql
-- Make propertyId required
ALTER TABLE "RoomType" ALTER COLUMN "propertyId" SET NOT NULL;
ALTER TABLE "Room" ALTER COLUMN "propertyId" SET NOT NULL;
ALTER TABLE "Reservation" ALTER COLUMN "propertyId" SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE "RoomType" ADD FOREIGN KEY ("propertyId") REFERENCES "Property"(id);
ALTER TABLE "Room" ADD FOREIGN KEY ("propertyId") REFERENCES "Property"(id);
ALTER TABLE "Reservation" ADD FOREIGN KEY ("propertyId") REFERENCES "Property"(id);

-- Remove old organizationId columns (after testing)
-- ALTER TABLE "RoomType" DROP COLUMN "organizationId";
-- ALTER TABLE "Room" DROP COLUMN "organizationId";
-- ALTER TABLE "Reservation" DROP COLUMN "organizationId";
```

### Phase 2: Backend API Updates (3-4 days)

#### Files to Create

- `src/app/api/properties/route.ts` - CRUD for properties
- `src/app/api/properties/[id]/route.ts` - Individual property management
- `src/app/api/user-properties/route.ts` - Property access management
- `src/lib/property-context.ts` - Property-level data filtering

#### Files to Modify

- `src/app/api/rooms/route.ts` - Change from orgId to propertyId filtering
- `src/app/api/room-types/route.ts` - Change from orgId to propertyId filtering
- `src/app/api/reservations/route.ts` - Change from orgId to propertyId filtering
- `src/lib/tenant.ts` - Update to handle property-level context

#### API Changes Example

```typescript
// Before: Organization-level filtering
const rooms = await withTenantContext(orgId, async (tx) => {
  return await tx.room.findMany({
    where: { organizationId: orgId }
  });
});

// After: Property-level filtering
const rooms = await withPropertyContext(propertyId, async (tx) => {
  return await tx.room.findMany({
    where: { propertyId: propertyId }
  });
});
```

### Phase 3: Authentication & Session Updates (2-3 days)

#### Files to Modify

- `src/app/api/auth/[...nextauth]/route.ts` - Include property access in session
- `src/types/next-auth.d.ts` - Add property context to session type
- `src/app/onboarding/select-organization/page.tsx` - Add property selection step

#### Session Structure Changes

```typescript
// Before
interface Session {
  user: {
    id: string;
    orgId: string;
    role: string;
  };
}

// After
interface Session {
  user: {
    id: string;
    orgId: string;
    role: string;
    currentPropertyId?: string;
    availableProperties: Property[];
  };
}
```

### Phase 4: UI Implementation (4-5 days)

#### New Components to Create

- `src/components/property/PropertySwitcher.tsx` - Switch between properties
- `src/components/property/PropertyManagement.tsx` - Manage properties
- `src/components/property/UserPropertyAccess.tsx` - Assign users to properties
- `src/components/admin/PropertyCreationForm.tsx` - Create new properties

#### Components to Modify

- `src/components/Header.tsx` - Add PropertySwitcher
- `src/components/UserMenu.tsx` - Show current property context
- `src/app/dashboard/page.tsx` - Property-aware data loading

#### Property Switcher Example

```typescript
export function PropertySwitcher() {
  const { data: session } = useSession();
  const [currentProperty, setCurrentProperty] = useState<string>("");

  return (
    <Select value={currentProperty} onValueChange={setCurrentProperty}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select Property" />
      </SelectTrigger>
      <SelectContent>
        {session?.user?.availableProperties?.map((property) => (
          <SelectItem key={property.id} value={property.id}>
            {property.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Phase 5: Access Control Implementation (3-4 days)

#### Property-Level Permissions

```typescript
// Check if user has access to specific property
export async function hasPropertyAccess(
  userId: string,
  propertyId: string,
  requiredRole?: PropertyRole
): Promise<boolean> {
  const access = await prisma.userProperty.findFirst({
    where: {
      userId,
      propertyId,
      ...(requiredRole && { role: requiredRole })
    }
  });

  return !!access;
}
```

#### API Route Protection

```typescript
// Protect property-specific routes
export async function GET(req: NextRequest) {
  const { propertyId } = await req.json();
  const session = await getServerSession(authOptions);

  // Check property access
  const hasAccess = await hasPropertyAccess(
    session.user.id,
    propertyId,
    "FRONT_DESK"
  );

  if (!hasAccess) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Continue with property-specific data...
}
```

## User Experience Changes

### Onboarding Flow

1. **User signs in** → Selects organization (unchanged)
2. **NEW: Property selection** → Choose default property or see available properties
3. **Dashboard loads** → Shows selected property's data only
4. **Property switching** → Dropdown in header to switch between accessible properties

### Calendar/Dashboard Changes

- **Visual**: Property switcher added to header
- **Data**: Only shows rooms/reservations from selected property
- **Functionality**: All booking/management features work the same
- **Access Control**: Users only see properties they have access to

### Admin Settings Enhancement

- **New tab**: "Properties" in admin settings
- **Property management**: Create, edit, delete properties
- **User assignment**: Assign users to specific properties with roles

## Breaking Changes

### API Endpoints

- All room/reservation APIs now require `propertyId` instead of `organizationId`
- New property selection step in onboarding flow
- Session structure includes property context

### URL Structure

```
Before: grandpalace.pms-app.com/dashboard
After:  grandpalace.pms-app.com/dashboard?property=downtown-nyc
```

## Testing Strategy

### Phase 1 Testing

- Verify data migration completed successfully
- Ensure all existing data accessible through default properties
- Test foreign key constraints

### Phase 2 Testing

- Test all API endpoints with propertyId filtering
- Verify property-level data isolation
- Test property CRUD operations

### Phase 3 Testing

- Test authentication flow with property selection
- Verify session includes property context
- Test property switching functionality

### Phase 4 Testing

- Test UI components render correctly
- Verify property switcher functionality
- Test property-specific data loading

### Phase 5 Testing

- Test role-based access control
- Verify users can only access assigned properties
- Test permission enforcement across all endpoints

## Rollback Plan

### Emergency Rollback

1. **Revert API changes** - Switch back to organizationId filtering
2. **Restore session structure** - Remove property context
3. **Hide property switcher** - Revert to organization-level view
4. **Keep database changes** - Data migration is safe to keep

### Data Safety

- Original organizationId columns kept during migration
- Default properties ensure all existing data remains accessible
- No data loss during migration process

## Timeline Summary

- **Phase 1 (Database):** 2-3 days
- **Phase 2 (Backend):** 3-4 days
- **Phase 3 (Auth):** 2-3 days
- **Phase 4 (UI):** 4-5 days
- **Phase 5 (Access Control):** 3-4 days

**Total Estimated Time: 2-3 weeks**

## Success Criteria

✅ **Data Migration**: All existing data accessible through default properties
✅ **Property Isolation**: Users can only see data from accessible properties
✅ **Role-Based Access**: Property-level permissions working correctly
✅ **UI Functionality**: Property switcher and management interfaces working
✅ **Performance**: No significant performance degradation
✅ **Backward Compatibility**: Existing workflows continue to function
// Remove: organization relationship
}

````

#### Reservation (Change to Property-based)
```prisma
model Reservation {
  // CHANGE: organizationId → propertyId
  propertyId String   // Links to Property instead of Organization
  property   Property @relation(fields: [propertyId], references: [id])
  // Remove: organization relationship
}
````
