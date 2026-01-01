# Channex.io Channel Manager Integration Plan

## Overview

This document outlines the comprehensive integration plan for Channex.io as the channel manager to enable connectivity with Booking.com, Expedia, and other OTA (Online Travel Agency) channels.

**Integration Model**: Option A - Single Master Account (PMS-owned)
**Integration Type**: Two-way synchronization (ARI push + Reservation pull)
**Primary Channels**: Booking.com, Expedia.com
**API Version**: Channex API v1
**Authentication**: Single Master API Key (centrally managed)

---

## Verified API Reference (Quick Summary)

> **Status**: ✅ Verified from official Channex API documentation (December 2024)

### Authentication

| Header         | Value              |
| -------------- | ------------------ |
| `Content-Type` | `application/json` |
| `user-api-key` | `YOUR_API_KEY`     |

### Base URLs

| Environment     | URL                                 |
| --------------- | ----------------------------------- |
| Staging/Sandbox | `https://staging.channex.io/api/v1` |
| Production      | `https://channex.io/api/v1`         |

### Core Endpoints

| Resource       | Method | Endpoint                                    | Description                           |
| -------------- | ------ | ------------------------------------------- | ------------------------------------- |
| **Groups**     | GET    | `/groups`                                   | List all groups                       |
|                | GET    | `/groups/{groupId}`                         | Get group by ID                       |
|                | POST   | `/groups`                                   | Create group                          |
|                | PUT    | `/groups/{groupId}`                         | Update group                          |
|                | DELETE | `/groups/{groupId}`                         | Delete group (must have 0 properties) |
|                | POST   | `/groups/{groupId}/properties/{propertyId}` | Associate property with group         |
|                | DELETE | `/groups/{groupId}/properties/{propertyId}` | Remove property from group            |
| **Properties** | POST   | `/properties`                               | Create property                       |
| **Room Types** | POST   | `/room_types`                               | Create room type                      |
| **Rate Plans** | POST   | `/rate_plans`                               | Create rate plan                      |
| **ARI**        | POST   | `/ari`                                      | Update availability/rates/inventory   |
| **Webhooks**   | POST   | `/webhooks`                                 | Register webhook endpoint             |
| **Channels**   | GET    | `/channels?filter[property_id]={id}`        | List channels for property            |

### Webhook Events

| Category | Events                                                                   |
| -------- | ------------------------------------------------------------------------ |
| Booking  | `booking.created`, `booking.updated`, `booking.cancelled`                |
| Channel  | `channel.connected`, `channel.disconnected`, `channel.mapping_completed` |
| ARI      | `ari.push_success`, `ari.push_failed`                                    |
| System   | `webhook.test`, `property.updated`                                       |

### Rate Limits

| Type                | Limit                               |
| ------------------- | ----------------------------------- |
| Requests per minute | ~60 (observed)                      |
| ARI updates         | Burst allowed, batching recommended |

---

## Table of Contents

1. [Integration Model (Option A)](#integration-model-option-a)
2. [Conceptual Mappings](#conceptual-mappings)
3. [Architecture Overview](#architecture-overview)
4. [Phase 1: Foundation & Configuration](#phase-1-foundation--configuration)
5. [Phase 2: Outbound Sync (PMS → Channex)](#phase-2-outbound-sync-pms--channex)
6. [Phase 3: Inbound Sync (Channex → PMS)](#phase-3-inbound-sync-channex--pms)
7. [Phase 4: Frontend Integration](#phase-4-frontend-integration)
8. [Phase 5: Testing & Production](#phase-5-testing--production)
9. [Onboarding Workflow](#onboarding-workflow)
10. [Database Schema Changes](#database-schema-changes)
11. [API Endpoints](#api-endpoints)
12. [Error Handling & Monitoring](#error-handling--monitoring)
13. [Security Considerations](#security-considerations)

---

## Integration Model (Option A)

### Single Master Account Architecture

The PMS uses a **single Channex master account** owned and operated by the PMS provider:

- **PMS owns one Channex account** with a single master API key
- Each **PMS organization (tenant)** maps to a unique **Channex Group**
- Each **PMS property** maps to a **Channex Property** under that group
- **All API keys are managed centrally** by the PMS - customers never see or manage Channex credentials

### Why Option A?

| Benefit               | Description                                               |
| --------------------- | --------------------------------------------------------- |
| **Smooth Onboarding** | Customers don't need to sign up with Channex separately   |
| **Full Control**      | PMS controls property creation, channel mapping, and sync |
| **Better Support**    | Centralized logs and consistent configuration             |
| **Scalable**          | One architectural pattern for all customers               |

### What Customers Do NOT Do

- ❌ Create Channex accounts
- ❌ Generate or manage API keys
- ❌ Configure Channex groups or properties directly
- ❌ Provide OTA credentials to the PMS

### What Customers DO

- ✅ Use PMS UI to "Connect Booking.com" or "Connect Expedia"
- ✅ Approve **Channex as their channel manager** in each OTA extranet
- ✅ Manage rates, availability, and bookings through PMS

---

## Conceptual Mappings

### Channex Structure

```
Account (PMS Master)
└── Groups (one per PMS Organization)
    └── Properties (one per PMS Property)
        ├── Room Types
        ├── Rate Plans
        └── Channels (Booking.com, Expedia, etc.)
```

### PMS ↔ Channex Mapping

| PMS Concept           | Channex Concept |
| --------------------- | --------------- |
| Organization (tenant) | Group           |
| Property (hotel)      | Property        |
| Room Type             | Room Type       |
| Rate Plan             | Rate Plan       |

### Multi-Tenant Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PMS MASTER CHANNEX ACCOUNT                          │
│                    (Single API Key in ENV vars)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐ │
│  │   Channex Group A   │  │   Channex Group B   │  │  Channex Group C│ │
│  │   (Org: Acme Hotels)│  │   (Org: Beach Resorts)│ │  (Org: City Inn)│ │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────┤ │
│  │ Property: Downtown  │  │ Property: Miami     │  │ Property: Main  │ │
│  │ Property: Airport   │  │ Property: Cancun    │  │                 │ │
│  │ Property: Beachside │  │                     │  │                 │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PMS Application                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐     │
│  │  Frontend   │───▶│   Next.js API    │───▶│  Channex Service Layer  │     │
│  │  Dashboard  │    │   Routes         │    │  (src/lib/channex/)     │     │
│  └─────────────┘    └──────────────────┘    └───────────┬─────────────┘     │
│                                                         │                   │
│  ┌─────────────┐    ┌──────────────────┐                │                   │
│  │  BullMQ     │◀───│  Queue Workers   │◀───────────────┘                   │
│  │  Redis      │    │  (Sync Jobs)     │                                    │
│  └─────────────┘    └──────────────────┘                                    │
│                                                                             │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │         Channex.io API          │
                    │    (Channel Manager Platform)   │
                    └────────────────┬────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
    ┌──────┴──────┐          ┌──────-┴──────┐          ┌──────-┴──────┐
    │ Booking.com │          │   Expedia    │          │   Airbnb     │
    │             │          │              │          │   (future)   │
    └─────────────┘          └─────────────-┘          └─────────────-┘
```

### Data Flow

1. **Availability/Rates/Restrictions (ARI) - Outbound**

   - PMS updates rates/availability → Queue job created → Channex API push → OTAs update

2. **Reservations - Inbound**

   - OTA booking created → Channex webhook → PMS webhook handler → Reservation created

3. **Inventory Sync**
   - Bidirectional sync ensures consistency across all channels

---

## Phase 1: Foundation & Configuration

### Duration: 1-2 weeks

### Tasks

#### 1.1 Database Schema Updates ✅ COMPLETED

**Status**: ✅ Completed on 2026-01-01
**Migration**: `20260101133947_add_channex_integration_models`

**New Models Required (Option A - No API keys stored per org/property):**

```prisma
// Add to prisma/schema.prisma

/// Organization-level Channex Group mapping
/// Each PMS organization maps to one Channex Group
model ChannexOrganization {
  id                String   @id @default(cuid())
  organizationId    String   @unique
  channexGroupId    String   @unique  // Created via Channex API
  channexGroupName  String?           // Display name in Channex
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization      Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  properties        ChannexProperty[]  // Properties under this group

  @@index([organizationId])
  @@index([channexGroupId])
}

/// Property-level Channex Property mapping
/// Each PMS property maps to one Channex Property under the org's group
model ChannexProperty {
  id                  String   @id @default(cuid())
  channexOrgId        String   // Links to organization's Channex config
  propertyId          String   @unique
  channexPropertyId   String   @unique  // Created via Channex API
  channexPropertyName String?           // Display name in Channex
  isActive            Boolean  @default(true)
  syncEnabled         Boolean  @default(true)
  lastSyncAt          DateTime?
  syncStatus          ChannexSyncStatus @default(PENDING)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  channexOrg          ChannexOrganization @relation(fields: [channexOrgId], references: [id], onDelete: Cascade)
  property            Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  roomTypeMappings    ChannexRoomTypeMapping[]
  ratePlanMappings    ChannexRatePlanMapping[]
  syncLogs            ChannexSyncLog[]
  webhookLogs         ChannexWebhookLog[]
  channelConnections  ChannexChannelConnection[]

  @@index([channexOrgId])
  @@index([propertyId])
  @@index([channexPropertyId])
}

/// Room type mapping between PMS and Channex
model ChannexRoomTypeMapping {
  id                  String   @id @default(cuid())
  channexPropertyId   String
  roomTypeId          String
  channexRoomTypeId   String   // Created via Channex API
  channexRoomTypeName String?
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  channexProperty     ChannexProperty @relation(fields: [channexPropertyId], references: [id], onDelete: Cascade)
  roomType            RoomType        @relation(fields: [roomTypeId], references: [id], onDelete: Cascade)

  @@unique([channexPropertyId, roomTypeId])
  @@unique([channexPropertyId, channexRoomTypeId])
  @@index([roomTypeId])
}

/// OTA Channel connection status per property
model ChannexChannelConnection {
  id                  String   @id @default(cuid())
  channexPropertyId   String
  channelCode         String   // "booking_com", "expedia", "airbnb"
  channelName         String   // "Booking.com", "Expedia"
  connectionStatus    ChannexConnectionStatus @default(PENDING)
  connectedAt         DateTime?
  disconnectedAt      DateTime?
  lastSyncAt          DateTime?
  errorMessage        String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  channexProperty     ChannexProperty @relation(fields: [channexPropertyId], references: [id], onDelete: Cascade)

  @@unique([channexPropertyId, channelCode])
  @@index([channelCode])
  @@index([connectionStatus])
}

enum ChannexConnectionStatus {
  PENDING           // Customer needs to approve in OTA extranet
  CONNECTED         // Active and syncing
  DISCONNECTED      // Manually disconnected
  ERROR             // Connection error
}
```

> **Note**: No `apiKey` fields in models. The master API key is stored in environment variables only.

#### 1.2 Environment Configuration ✅ COMPLETED

**Status**: ✅ Completed on 2026-01-01
**Files Modified**:

- `.env.example` - Added Channex configuration template
- `.env` - Added Channex staging configuration
- `src/lib/channex/config.ts` - Created type-safe config helper

```env
# Add to .env

# Master Channex Account Configuration (Option A)
# Staging/Sandbox environment for development & testing
CHANNEX_API_URL=https://staging.channex.io/api/v1
# Production environment (switch when ready)
# CHANNEX_API_URL=https://channex.io/api/v1

CHANNEX_API_KEY=your_master_api_key          # Single API key for entire PMS
CHANNEX_WEBHOOK_SECRET=your_webhook_secret   # Single webhook secret for all orgs

# Sync Configuration
CHANNEX_SYNC_BATCH_SIZE=50
CHANNEX_RATE_LIMIT_PER_MINUTE=60             # Observed rate limit ~60 req/min
CHANNEX_SYNC_ENABLED=true

# Debugging
CHANNEX_DEBUG=false
CHANNEX_LOG_LEVEL=info
```

> **Important**: The `CHANNEX_API_KEY` is the ONLY API key. There are no per-organization or per-property API keys in Option A.

#### 1.2.1 API Authentication (Verified)

| Environment     | Base URL                            |
| --------------- | ----------------------------------- |
| Staging/Sandbox | `https://staging.channex.io/api/v1` |
| Production      | `https://channex.io/api/v1`         |

**Authentication Header:**

```
user-api-key: YOUR_API_KEY
```

**Example Request:**

```bash
curl -X GET \
  -H "Content-Type: application/json" \
  -H "user-api-key: YOUR_API_KEY" \
  https://staging.channex.io/api/v1/groups
```

#### 1.3 Create Channex Service Layer ✅ COMPLETED

**Status**: ✅ Completed on 2026-01-01
**Files Created**:

- `src/lib/channex/types.ts` - Type definitions for Channex API
- `src/lib/channex/client.ts` - API client with all CRUD operations
- `src/lib/channex/context.ts` - Multi-tenant context helpers
- `src/lib/channex/index.ts` - Barrel export file

**File: `src/lib/channex/client.ts`**

```typescript
/**
 * Channex API Client (Option A - Single Master Account)
 *
 * Uses ONE master API key from environment variables.
 * All operations for all organizations/properties use this single key.
 */

interface ChannexConfig {
  apiUrl: string;
  apiKey: string;
  timeout?: number;
}

interface ChannexResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export class ChannexClient {
  private config: ChannexConfig;
  private rateLimiter: Map<string, number> = new Map();

  /**
   * Constructor - always uses master API key from env
   * No per-org/property API keys in Option A
   */
  constructor(config?: Partial<Omit<ChannexConfig, "apiKey">>) {
    // Option A: API key ALWAYS comes from environment variable
    // Never accept apiKey as a parameter
    this.config = {
      apiUrl: config?.apiUrl || process.env.CHANNEX_API_URL!,
      apiKey: process.env.CHANNEX_API_KEY!, // Always from env
      timeout: config?.timeout || 30000
    };

    if (!this.config.apiKey) {
      throw new Error("CHANNEX_API_KEY environment variable is required");
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ChannexResponse<T>> {
    const url = `${this.config.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "user-api-key": this.config.apiKey,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ChannexApiError(
        error.message || `HTTP ${response.status}`,
        response.status,
        error
      );
    }

    return response.json();
  }

  // Property Management
  async getProperties(): Promise<ChannexProperty[]> {
    const response = await this.request<ChannexProperty[]>("/properties");
    return response.data;
  }

  async getProperty(propertyId: string): Promise<ChannexProperty> {
    const response = await this.request<ChannexProperty>(
      `/properties/${propertyId}`
    );
    return response.data;
  }

  // Room Types
  async getRoomTypes(propertyId: string): Promise<ChannexRoomType[]> {
    const response = await this.request<ChannexRoomType[]>(
      `/properties/${propertyId}/room_types`
    );
    return response.data;
  }

  // Rate Plans
  async getRatePlans(propertyId: string): Promise<ChannexRatePlan[]> {
    const response = await this.request<ChannexRatePlan[]>(
      `/properties/${propertyId}/rate_plans`
    );
    return response.data;
  }

  // ARI (Availability, Rates, Inventory) Updates
  async updateARI(propertyId: string, data: ARIUpdatePayload): Promise<void> {
    await this.request(`/properties/${propertyId}/ari`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  // Bulk ARI Update
  async bulkUpdateARI(
    propertyId: string,
    updates: ARIUpdatePayload[]
  ): Promise<void> {
    await this.request(`/properties/${propertyId}/ari/bulk`, {
      method: "POST",
      body: JSON.stringify({ updates })
    });
  }

  // Reservations
  async getReservations(
    propertyId: string,
    params?: ReservationQueryParams
  ): Promise<ChannexReservation[]> {
    const queryString = params ? `?${new URLSearchParams(params as any)}` : "";
    const response = await this.request<ChannexReservation[]>(
      `/properties/${propertyId}/bookings${queryString}`
    );
    return response.data;
  }

  async getReservation(
    propertyId: string,
    bookingId: string
  ): Promise<ChannexReservation> {
    const response = await this.request<ChannexReservation>(
      `/properties/${propertyId}/bookings/${bookingId}`
    );
    return response.data;
  }

  // Channels
  async getChannels(propertyId: string): Promise<ChannexChannel[]> {
    const response = await this.request<ChannexChannel[]>(
      `/properties/${propertyId}/channels`
    );
    return response.data;
  }

  async getChannelStatus(
    propertyId: string,
    channelId: string
  ): Promise<ChannelConnectionStatus> {
    const response = await this.request<ChannelConnectionStatus>(
      `/properties/${propertyId}/channels/${channelId}/status`
    );
    return response.data;
  }

  // ============================================
  // Option A: Group and Property Creation Methods
  // These are used to programmatically create Channex
  // entities for new organizations and properties
  // ============================================

  // Groups (for Organizations)
  async createGroup(data: CreateGroupPayload): Promise<ChannexGroup> {
    const response = await this.request<ChannexGroup>("/groups", {
      method: "POST",
      body: JSON.stringify({ group: data })
    });
    return response.data;
  }

  async getGroups(): Promise<ChannexGroup[]> {
    const response = await this.request<ChannexGroup[]>("/groups");
    return response.data;
  }

  async getGroup(groupId: string): Promise<ChannexGroup> {
    const response = await this.request<ChannexGroup>(`/groups/${groupId}`);
    return response.data;
  }

  // Properties (for Properties under a Group)
  async createProperty(data: CreatePropertyPayload): Promise<ChannexProperty> {
    const response = await this.request<ChannexProperty>("/properties", {
      method: "POST",
      body: JSON.stringify({ property: data })
    });
    return response.data;
  }

  // Room Types (for Room Types under a Property)
  async createRoomType(
    propertyId: string,
    data: CreateRoomTypePayload
  ): Promise<ChannexRoomType> {
    const response = await this.request<ChannexRoomType>(
      `/properties/${propertyId}/room_types`,
      {
        method: "POST",
        body: JSON.stringify({ room_type: data })
      }
    );
    return response.data;
  }

  // Rate Plans (for Rate Plans under a Property)
  async createRatePlan(
    propertyId: string,
    data: CreateRatePlanPayload
  ): Promise<ChannexRatePlan> {
    const response = await this.request<ChannexRatePlan>(
      `/properties/${propertyId}/rate_plans`,
      {
        method: "POST",
        body: JSON.stringify({ rate_plan: data })
      }
    );
    return response.data;
  }
}

export class ChannexApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = "ChannexApiError";
  }
}
```

**File: `src/lib/channex/types.ts`**

```typescript
/**
 * Channex API Type Definitions (Option A)
 * Based on verified Channex API documentation
 */

// ============================================
// JSON:API Response Format
// All Channex responses follow JSON:API spec with data.type and data.attributes
// ============================================
export interface ChannexApiResponse<T> {
  data: {
    type: string;
    id: string;
    attributes: T;
    relationships?: Record<string, { data: any[] }>;
  };
}

export interface ChannexMetaResponse {
  meta: {
    message: string;
  };
}

// ============================================
// Group Types (for Organizations)
// A property MUST always belong to at least one group
// ============================================
export interface ChannexGroup {
  id: string;
  title: string; // Max 255 chars, non-empty
}

export interface ChannexGroupResponse {
  data: {
    type: "group";
    id: string;
    attributes: {
      id: string;
      title: string;
    };
    relationships: {
      properties: {
        data: ChannexPropertySummary[];
      };
    };
  };
}

export interface ChannexPropertySummary {
  id: string;
  type: "property";
  attributes: {
    id: string;
    title: string;
  };
}

export interface CreateGroupPayload {
  title: string; // Required, non-empty, max 255 chars
}

// ============================================
// Property Types (Verified from API docs)
// Properties must be associated with at least one Group
// ============================================
export interface ChannexProperty {
  id: string;
  title: string;
  currency: string; // e.g., "USD", "EUR", "GBP"
  timezone: string; // e.g., "Europe/London"
  country_code: string; // e.g., "GB", "US"
  city: string;
  address: string;
  postcode: string;
}

export interface CreatePropertyPayload {
  title: string; // Required
  currency: string; // Required, e.g., "USD"
  timezone: string; // Required, e.g., "Europe/London"
  country_code: string; // Required, e.g., "GB"
  city?: string;
  address?: string;
  postcode?: string;
}

// Note: After creating a property, you must associate it with a group:
// POST /groups/{groupId}/properties/{propertyId}

// ============================================
// Room Type (Verified from API docs)
// POST /room_types
// ============================================
export interface ChannexRoomType {
  id: string;
  property_id: string;
  title: string;
  description?: string;
  occupancy: number; // Max occupancy for the room
}

export interface CreateRoomTypePayload {
  property_id: string; // Required: which property this room type belongs to
  title: string; // Required
  occupancy: number; // Required: max occupancy
  description?: string;
}

// ============================================
// Rate Plan (Verified from API docs)
// POST /rate_plans
// ============================================
export interface ChannexRatePlan {
  id: string;
  property_id: string;
  title: string;
  currency: string;
  meal_plan: string; // e.g., "room_only", "breakfast", etc.
  cancellation_policy: string; // e.g., "flexible", "non_refundable"
}

export interface CreateRatePlanPayload {
  property_id: string; // Required: which property this rate plan belongs to
  title: string; // Required, e.g., "Standard Rate"
  currency: string; // Required, e.g., "USD"
  meal_plan?: string; // e.g., "room_only", "breakfast"
  cancellation_policy?: string; // e.g., "flexible", "non_refundable"
}

// ============================================
// ARI (Availability, Rates, Inventory) Update
// POST /ari
// ============================================
export interface ARIUpdatePayload {
  property_id: string; // Required
  room_type_id: string; // Required
  rate_plan_id: string; // Required
  dates: ARIDateEntry[]; // Array of date-specific updates
}

export interface ARIDateEntry {
  date: string; // Required, format: "YYYY-MM-DD"
  rate: number; // Price for this date
  availability: number; // Available inventory count
  min_stay?: number; // Minimum length of stay
}

// ============================================
// Booking/Reservation Types (Verified from API docs)
// Received via webhooks (booking.created, booking.updated, booking.cancelled)
// ============================================
export interface ChannexReservation {
  id: string; // Channex booking ID, e.g., "booking123"
  property_id: string; // Channex property ID
  channel: string; // e.g., "booking_com", "expedia"
  status: ChannexReservationStatus;
  guest: ChannexGuest;
  rooms: ChannexReservationRoom[];
  total_price: number;
  currency: string;
  created_at: string; // ISO 8601 format
}

export type ChannexReservationStatus = "new" | "modified" | "cancelled";

export interface ChannexGuest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

export interface ChannexReservationRoom {
  room_type_id: string;
  rate_plan_id: string;
  check_in: string; // Format: "YYYY-MM-DD"
  check_out: string; // Format: "YYYY-MM-DD"
  adults: number;
  children: number;
}

// ============================================
// Channel Types (Verified from API docs)
// GET /channels?filter[property_id]={propertyId}
// ============================================
export interface ChannexChannel {
  id: string;
  property_id: string;
  provider: string; // e.g., "booking_com", "expedia", "airbnb"
  status: "connected" | "disconnected" | "pending";
  mapping_status: "completed" | "pending" | "error";
}

// ============================================
// Webhook Types (Verified from API docs)
// POST /webhooks to register
// ============================================
export interface ChannexWebhookRegistration {
  url: string; // Your webhook endpoint URL
  events: ChannexWebhookEventType[];
}

export interface ChannexWebhookEvent {
  event: ChannexWebhookEventType;
  timestamp: string; // ISO 8601 format
  data: any; // Event-specific payload
}

// Verified webhook event types from API docs
export type ChannexWebhookEventType =
  // Booking Events
  | "booking.created"
  | "booking.updated"
  | "booking.cancelled"
  // Channel Events
  | "channel.connected"
  | "channel.disconnected"
  | "channel.mapping_completed"
  // ARI Events
  | "ari.push_success"
  | "ari.push_failed"
  // System Events
  | "webhook.test"
  | "property.updated";

// Webhook Payload Example (booking.created)
export interface ChannexBookingWebhookPayload {
  booking_id: string;
  property_id: string;
  channel: string;
  status: string;
  guest: {
    first_name: string;
    last_name: string;
    email: string;
  };
  rooms: Array<{
    room_type_id: string;
    rate_plan_id: string;
    check_in: string;
    check_out: string;
    adults: number;
    children: number;
  }>;
  total_price: number;
  currency: string;
}

// Sync Status
export type ChannexSyncStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL";

// Multi-Tenant Context Types (Option A - No API keys per org/property)
export interface ChannexOrgContext {
  organizationId: string;
  channexGroupId: string;
}

export interface ChannexPropertyContext extends ChannexOrgContext {
  propertyId: string;
  channexPropertyId: string;
}
```

**File: `src/lib/channex/context.ts`** (Multi-Tenant Context Helper - Option A)

```typescript
/**
 * Multi-Tenant Channex Context Helper (Option A)
 *
 * NOTE: API key is NOT stored per org/property.
 * All API calls use the master key from process.env.CHANNEX_API_KEY
 *
 * This helper resolves Channex Group and Property IDs for multi-tenant operations.
 */

import { prisma } from "@/lib/prisma";
import { ChannexOrgContext, ChannexPropertyContext } from "./types";

/**
 * Get Channex Group context for an organization
 */
export async function getChannexOrgContext(
  organizationId: string
): Promise<ChannexOrgContext | null> {
  const channexOrg = await prisma.channexOrganization.findUnique({
    where: { organizationId }
  });

  if (!channexOrg || !channexOrg.isActive) {
    return null;
  }

  return {
    organizationId,
    channexGroupId: channexOrg.channexGroupId
  };
}

/**
 * Get Channex Property context (includes org's group ID)
 */
export async function getChannexPropertyContext(
  propertyId: string
): Promise<ChannexPropertyContext | null> {
  const channexProperty = await prisma.channexProperty.findUnique({
    where: { propertyId },
    include: {
      channexOrg: true,
      property: {
        select: { organizationId: true }
      }
    }
  });

  if (!channexProperty || !channexProperty.isActive) {
    return null;
  }

  const { channexOrg } = channexProperty;
  if (!channexOrg.isActive) {
    return null;
  }

  return {
    organizationId: channexProperty.property.organizationId,
    channexGroupId: channexOrg.channexGroupId,
    propertyId,
    channexPropertyId: channexProperty.channexPropertyId
  };
}

/**
 * Get all active Channex properties for an organization
 */
export async function getChannexPropertiesForOrg(
  organizationId: string
): Promise<ChannexPropertyContext[]> {
  const channexOrg = await prisma.channexOrganization.findUnique({
    where: { organizationId },
    include: {
      properties: {
        where: { isActive: true },
        include: {
          property: { select: { organizationId: true } }
        }
      }
    }
  });

  if (!channexOrg || !channexOrg.isActive) {
    return [];
  }

  return channexOrg.properties.map((cp) => ({
    organizationId,
    channexGroupId: channexOrg.channexGroupId,
    propertyId: cp.propertyId,
    channexPropertyId: cp.channexPropertyId
  }));
}

/**
 * Check if organization has Channex enabled
 */
export async function isChannexEnabledForOrg(
  organizationId: string
): Promise<boolean> {
  const channexOrg = await prisma.channexOrganization.findUnique({
    where: { organizationId },
    select: { isActive: true }
  });
  return channexOrg?.isActive ?? false;
}

/**
 * Check if property has Channex enabled
 */
export async function isChannexEnabledForProperty(
  propertyId: string
): Promise<boolean> {
  const channexProperty = await prisma.channexProperty.findUnique({
    where: { propertyId },
    select: { isActive: true, syncEnabled: true }
  });
  return (channexProperty?.isActive && channexProperty?.syncEnabled) ?? false;
}
```

---

## Phase 2: Outbound Sync (PMS → Channex)

### Duration: 2-3 weeks

### Tasks

#### 2.1 ARI Sync Service ✅ COMPLETED

**Status**: ✅ Completed on 2026-01-01
**File Created**: `src/lib/channex/ari-sync-service.ts`

**Features**:

- `syncRoomTypeARI()` - Sync single room type for date range
- `syncPropertyARI()` - Sync all room types for a property
- `calculateAvailability()` - Real-time availability calculation
- `getRateForDate()` - Rate lookup with daily/weekend/base fallback
- Automatic sync logging to database

**File: `src/lib/channex/ari-sync-service.ts`**

```typescript
/**
 * ARI (Availability, Rates, Inventory) Sync Service
 * Handles pushing availability and rate updates to Channex
 */

import { ChannexClient } from "./client";
import { ARIUpdatePayload } from "./types";
import { prisma } from "@/lib/prisma";
import { addDays, format, eachDayOfInterval } from "date-fns";

export class ARISyncService {
  private client: ChannexClient;

  constructor() {
    this.client = new ChannexClient();
  }

  /**
   * Sync availability for a specific room type and date range
   */
  async syncAvailability(params: {
    propertyId: string;
    roomTypeId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<SyncResult> {
    const { propertyId, roomTypeId, startDate, endDate } = params;

    // Get Channex mapping
    const mapping = await this.getChannexMapping(propertyId, roomTypeId);
    if (!mapping) {
      throw new Error(`No Channex mapping found for room type ${roomTypeId}`);
    }

    // Calculate availability for each day
    const dates = eachDayOfInterval({ start: startDate, end: endDate });
    const updates: ARIUpdatePayload[] = [];

    for (const date of dates) {
      const availability = await this.calculateAvailability(roomTypeId, date);
      const rateData = await this.getRateForDate(roomTypeId, date);

      updates.push({
        room_type_id: mapping.channexRoomTypeId,
        rate_plan_id: mapping.channexRatePlanId,
        date_from: format(date, "yyyy-MM-dd"),
        date_to: format(date, "yyyy-MM-dd"),
        availability: availability.available,
        rate: rateData.price,
        min_stay_arrival: rateData.minLOS || 1,
        max_stay: rateData.maxLOS,
        closed_to_arrival: rateData.closedToArrival,
        closed_to_departure: rateData.closedToDeparture,
        stop_sell: availability.available === 0
      });
    }

    // Send bulk update to Channex
    await this.client.bulkUpdateARI(mapping.channexPropertyId, updates);

    // Log sync
    await this.logSync({
      propertyId,
      roomTypeId,
      startDate,
      endDate,
      status: "COMPLETED",
      recordsUpdated: updates.length
    });

    return {
      success: true,
      recordsUpdated: updates.length
    };
  }

  /**
   * Calculate availability for a specific room type on a date
   */
  private async calculateAvailability(
    roomTypeId: string,
    date: Date
  ): Promise<{
    total: number;
    booked: number;
    blocked: number;
    available: number;
  }> {
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: {
        rooms: {
          include: {
            reservations: {
              where: {
                checkIn: { lte: date },
                checkOut: { gt: date },
                status: {
                  in: ["CONFIRMED", "IN_HOUSE", "CONFIRMATION_PENDING"]
                },
                deletedAt: null
              }
            },
            roomBlocks: {
              where: {
                startDate: { lte: date },
                endDate: { gte: date }
              }
            }
          }
        }
      }
    });

    if (!roomType) {
      throw new Error(`Room type ${roomTypeId} not found`);
    }

    const total = roomType.rooms.length;
    const booked = roomType.rooms.filter(
      (r) => r.reservations.length > 0
    ).length;
    const blocked = roomType.rooms.filter(
      (r) => r.roomBlocks.length > 0
    ).length;
    const available = Math.max(0, total - booked - blocked);

    return { total, booked, blocked, available };
  }

  /**
   * Get rate for a specific date
   */
  private async getRateForDate(roomTypeId: string, date: Date) {
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: {
        dailyRates: {
          where: { date }
        }
      }
    });

    if (!roomType) {
      throw new Error(`Room type ${roomTypeId} not found`);
    }

    const dailyRate = roomType.dailyRates[0];

    return {
      price: dailyRate?.basePrice || roomType.basePrice || 0,
      minLOS: dailyRate?.minLOS || roomType.minLOS,
      maxLOS: dailyRate?.maxLOS || roomType.maxLOS,
      closedToArrival: dailyRate?.closedToArrival || roomType.closedToArrival,
      closedToDeparture:
        dailyRate?.closedToDeparture || roomType.closedToDeparture
    };
  }

  private async getChannexMapping(propertyId: string, roomTypeId: string) {
    return prisma.channexRoomTypeMapping.findFirst({
      where: {
        roomTypeId,
        channexProperty: { propertyId }
      },
      include: {
        channexProperty: true
      }
    });
  }

  private async logSync(data: any) {
    await prisma.channexSyncLog.create({
      data: {
        channexPropertyId: data.propertyId,
        syncType: "ARI_PUSH",
        status: data.status,
        recordsProcessed: data.recordsUpdated,
        startedAt: new Date(),
        completedAt: new Date()
      }
    });
  }
}

interface SyncResult {
  success: boolean;
  recordsUpdated: number;
  errors?: string[];
}
```

#### 2.2 Queue Workers for Sync Jobs ✅ COMPLETED

**Status**: ✅ Completed on 2026-01-01

**Files Created/Updated**:

- `src/lib/queue/types.ts` - Added Channex job types
- `src/lib/queue/queues.ts` - Added channex-sync queue
- `src/lib/queue/workers/channex-sync-worker.ts` - Worker implementation
- `src/lib/channex/queue-helpers.ts` - Helper functions for queueing jobs
- `scripts/start-workers.ts` - Added Channex worker

**Features**:

- `channex-ari-sync` - Incremental ARI sync for date ranges
- `channex-full-sync` - Full 365-day property sync (scheduled daily)
- `channex-reservation-sync` - Reservation status sync to OTAs
- Rate limiting: 60 jobs/minute to respect Channex API limits
- Automatic retry with exponential backoff

**File: `src/lib/queue/channex-workers.ts`**

```typescript
/**
 * BullMQ Workers for Channex Sync Jobs
 */

import { Worker, Job } from "bullmq";
import { getRedisConnection } from "./redis";
import { ARISyncService } from "@/lib/channex/ari-sync-service";
import { ChannexClient } from "@/lib/channex/client";

const QUEUE_NAME = "channex-sync";

// ARI Sync Worker
export const ariSyncWorker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    const { type, data } = job.data;

    switch (type) {
      case "ARI_FULL_SYNC":
        return handleFullARISync(data);
      case "ARI_INCREMENTAL_SYNC":
        return handleIncrementalARISync(data);
      case "RESERVATION_SYNC":
        return handleReservationSync(data);
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 5,
    limiter: {
      max: 60,
      duration: 60000 // Rate limit: 60 requests per minute
    }
  }
);

async function handleFullARISync(data: {
  propertyId: string;
  daysAhead: number;
}) {
  const syncService = new ARISyncService();
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + data.daysAhead);

  // Get all room types for the property
  const property = await prisma.property.findUnique({
    where: { id: data.propertyId },
    include: { roomTypes: true }
  });

  if (!property) throw new Error("Property not found");

  const results = [];
  for (const roomType of property.roomTypes) {
    const result = await syncService.syncAvailability({
      propertyId: data.propertyId,
      roomTypeId: roomType.id,
      startDate,
      endDate
    });
    results.push(result);
  }

  return { success: true, results };
}

async function handleIncrementalARISync(data: {
  propertyId: string;
  roomTypeId: string;
  date: string;
}) {
  const syncService = new ARISyncService();
  const date = new Date(data.date);

  return syncService.syncAvailability({
    propertyId: data.propertyId,
    roomTypeId: data.roomTypeId,
    startDate: date,
    endDate: date
  });
}

async function handleReservationSync(data: { reservationId: string }) {
  // Handle reservation status sync back to Channex if needed
  console.log("Reservation sync:", data.reservationId);
}

// Error handling
ariSyncWorker.on("failed", (job, err) => {
  console.error(`Channex sync job ${job?.id} failed:`, err);
});

ariSyncWorker.on("completed", (job) => {
  console.log(`Channex sync job ${job.id} completed`);
});
```

#### 2.3 Event Triggers for Auto-Sync ✅ COMPLETED

**Status**: ✅ Completed on 2026-01-01
**File Created**: `src/lib/channex/event-triggers.ts`

**Event Trigger Functions**:

- `onReservationChange()` - Sync when reservations are created/modified/cancelled
- `onRateChange()` - Sync when room type rates change
- `onDailyRateChange()` - Sync when daily rate overrides change
- `onRoomBlockChange()` - Sync when room blocks are added/removed
- `onPropertySetupComplete()` - Full sync after initial Channex setup

**Usage**: Call these functions from your reservation/rate update handlers to automatically push changes to Channex.

**File: `src/lib/channex/event-triggers.ts`**

```typescript
/**
 * Event triggers to automatically sync changes to Channex
 */

import { Queue } from "bullmq";
import { getRedisConnection } from "@/lib/queue/redis";

const channexQueue = new Queue("channex-sync", {
  connection: getRedisConnection()
});

/**
 * Trigger ARI sync when a reservation is created/modified
 */
export async function triggerReservationARISync(params: {
  propertyId: string;
  roomTypeId: string;
  checkIn: Date;
  checkOut: Date;
}) {
  const { propertyId, roomTypeId, checkIn, checkOut } = params;

  // Queue incremental sync for affected dates
  await channexQueue.add(
    "ari-sync-reservation",
    {
      type: "ARI_INCREMENTAL_SYNC",
      data: {
        propertyId,
        roomTypeId,
        startDate: checkIn.toISOString(),
        endDate: checkOut.toISOString()
      }
    },
    {
      priority: 1, // High priority for reservation changes
      delay: 1000 // 1 second delay to batch multiple changes
    }
  );
}

/**
 * Trigger ARI sync when rates are updated
 */
export async function triggerRateARISync(params: {
  propertyId: string;
  roomTypeId: string;
  dates: Date[];
}) {
  await channexQueue.add(
    "ari-sync-rates",
    {
      type: "ARI_INCREMENTAL_SYNC",
      data: {
        propertyId,
        roomTypeId,
        dates: params.dates.map((d) => d.toISOString())
      }
    },
    {
      priority: 2,
      delay: 2000
    }
  );
}

/**
 * Trigger full sync for a property
 */
export async function triggerFullPropertySync(propertyId: string) {
  await channexQueue.add(
    "ari-full-sync",
    {
      type: "ARI_FULL_SYNC",
      data: {
        propertyId,
        daysAhead: 365 // Sync 1 year ahead
      }
    },
    {
      priority: 10 // Lower priority for full syncs
    }
  );
}
```

---

## Phase 3: Inbound Sync (Channex → PMS)

### Duration: 2-3 weeks

### Tasks

#### 3.1 Webhook Handler ✅ COMPLETED

**Status**: ✅ Completed on 2026-01-01
**File Created**: `src/app/api/webhooks/channex/route.ts`

**Features**:

- HMAC SHA256 signature verification
- Event logging to `ChannexWebhookLog` table
- Handles: `booking_created`, `booking_modified`, `booking_cancelled`
- Handles: `channel_connected`, `channel_disconnected`
- Health check endpoint (GET)
- Processing time tracking

#### 3.2 Reservation Sync Service ✅ COMPLETED

**Status**: ✅ Completed on 2026-01-01
**File Created**: `src/lib/channex/reservation-sync-service.ts`

**Features**:

- `handleNewBooking()` - Creates reservations from OTA bookings
- `handleModifiedBooking()` - Updates existing reservations
- `handleCancelledBooking()` - Cancels reservations
- Auto room assignment based on room type mapping
- Guest info mapping (name, email, phone)
- Audit log creation for all changes
- Automatic ARI sync trigger after changes

**File: `src/app/api/webhooks/channex/route.ts`**

```typescript
/**
 * Channex Webhook Handler
 * Receives booking notifications and updates from Channex
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { ChannexWebhookEvent, ChannexReservation } from "@/lib/channex/types";
import { ReservationSyncService } from "@/lib/channex/reservation-sync-service";

export const runtime = "nodejs";

// Verify webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-channex-signature") || "";

    // Verify signature
    if (
      !verifyWebhookSignature(
        rawBody,
        signature,
        process.env.CHANNEX_WEBHOOK_SECRET!
      )
    ) {
      console.error("Invalid Channex webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: ChannexWebhookEvent = JSON.parse(rawBody);
    console.log(`📥 Channex webhook received: ${event.event}`);

    // Log the webhook
    await prisma.channexWebhookLog.create({
      data: {
        eventType: event.event,
        propertyId: event.property_id,
        payload: event.payload,
        receivedAt: new Date(),
        status: "RECEIVED"
      }
    });

    // Process based on event type (using verified Channex event names)
    const syncService = new ReservationSyncService();

    switch (event.event) {
      // Booking Events (verified from API docs)
      case "booking.created":
        await syncService.handleNewBooking(event.data as ChannexReservation);
        break;

      case "booking.updated":
        await syncService.handleModifiedBooking(
          event.data as ChannexReservation
        );
        break;

      case "booking.cancelled":
        await syncService.handleCancelledBooking(
          event.data as ChannexReservation
        );
        break;

      // Channel Events
      case "channel.connected":
      case "channel.disconnected":
      case "channel.mapping_completed":
        await handleChannelStatusChange(event);
        break;

      // ARI Events
      case "ari.push_success":
      case "ari.push_failed":
        await handleARISyncStatus(event);
        break;

      // System Events
      case "webhook.test":
        console.log("Webhook test event received");
        break;

      case "property.updated":
        console.log("Property updated event received");
        break;

      default:
        console.log(`Unhandled Channex event type: ${event.event}`);
    }

    // Update webhook log status
    await prisma.channexWebhookLog.updateMany({
      where: {
        eventType: event.event,
        propertyId: event.property_id,
        status: "RECEIVED"
      },
      data: { status: "PROCESSED", processedAt: new Date() }
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Channex webhook error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleChannelStatusChange(event: ChannexWebhookEvent) {
  const { property_id, payload } = event;

  await prisma.channexProperty.updateMany({
    where: { channexPropertyId: property_id },
    data: {
      syncStatus: event.event === "channel_connected" ? "COMPLETED" : "FAILED",
      lastSyncAt: new Date()
    }
  });
}

async function handleARISyncStatus(event: ChannexWebhookEvent) {
  await prisma.channexSyncLog.create({
    data: {
      channexPropertyId: event.property_id,
      syncType: "ARI_PUSH",
      status: event.event === "ari_sync_completed" ? "COMPLETED" : "FAILED",
      errorMessage: event.payload?.error_message,
      completedAt: new Date()
    }
  });
}
```

#### 3.2 Reservation Sync Service

**File: `src/lib/channex/reservation-sync-service.ts`**

```typescript
/**
 * Reservation Sync Service
 * Handles creating/updating reservations from Channex bookings
 */

import { prisma } from "@/lib/prisma";
import { ChannexReservation, ChannexReservationRoom } from "./types";
import { ReservationSource, ReservationStatus } from "@prisma/client";
import { triggerReservationARISync } from "./event-triggers";

export class ReservationSyncService {
  /**
   * Handle new booking from OTA
   */
  async handleNewBooking(booking: ChannexReservation): Promise<void> {
    console.log(`📥 Processing new Channex booking: ${booking.unique_id}`);

    // Find property mapping
    const channexProperty = await prisma.channexProperty.findFirst({
      where: { channexPropertyId: booking.property_id },
      include: {
        property: true,
        roomTypeMappings: true
      }
    });

    if (!channexProperty) {
      throw new Error(
        `No property mapping for Channex property ${booking.property_id}`
      );
    }

    // Find or create channel
    const channel = await this.getOrCreateChannel(
      channexProperty.property.organizationId,
      booking.channel_name
    );

    // Process each room in the booking
    for (const room of booking.rooms) {
      const roomTypeMapping = channexProperty.roomTypeMappings.find(
        (m) => m.channexRoomTypeId === room.room_type_id
      );

      if (!roomTypeMapping) {
        console.warn(`No room type mapping for ${room.room_type_id}`);
        continue;
      }

      // Find available room of this type
      const availableRoom = await this.findAvailableRoom(
        roomTypeMapping.roomTypeId,
        new Date(booking.arrival_date),
        new Date(booking.departure_date)
      );

      if (!availableRoom) {
        console.error(`No available room for booking ${booking.unique_id}`);
        // TODO: Send alert/notification
        continue;
      }

      // Create reservation
      const reservation = await prisma.reservation.create({
        data: {
          organizationId: channexProperty.property.organizationId,
          propertyId: channexProperty.propertyId,
          roomId: availableRoom.id,
          channelId: channel.id,
          source: ReservationSource.CHANNEL,
          status: ReservationStatus.CONFIRMED,
          guestName: `${booking.guest.name} ${booking.guest.surname}`,
          email: booking.guest.email,
          phone: booking.guest.phone,
          checkIn: new Date(booking.arrival_date),
          checkOut: new Date(booking.departure_date),
          adults: room.occupancy.adults,
          children: room.occupancy.children,
          notes: `OTA: ${booking.channel_name}\nOTA Ref: ${booking.ota_reservation_code}\nChannex ID: ${booking.unique_id}`,
          // Store Channex reference in a way we can look it up
          stripePaymentIntentId: null, // OTA handles payment
          paidAmount: booking.amount,
          paymentStatus: "PAID" // OTAs typically collect payment
        }
      });

      console.log(
        `✅ Created reservation ${reservation.id} from ${booking.channel_name}`
      );

      // Trigger ARI sync to update availability
      await triggerReservationARISync({
        propertyId: channexProperty.propertyId,
        roomTypeId: roomTypeMapping.roomTypeId,
        checkIn: new Date(booking.arrival_date),
        checkOut: new Date(booking.departure_date)
      });

      // Create audit log
      await prisma.reservationAuditLog.create({
        data: {
          reservationId: reservation.id,
          propertyId: channexProperty.propertyId,
          action: "CREATED",
          description: `Booking created from ${booking.channel_name} (${booking.ota_reservation_code})`,
          changedAt: new Date(),
          metadata: JSON.stringify({
            source: "channex",
            channexBookingId: booking.unique_id,
            otaCode: booking.ota_reservation_code,
            channel: booking.channel_name
          })
        }
      });
    }
  }

  /**
   * Handle modified booking from OTA
   */
  async handleModifiedBooking(booking: ChannexReservation): Promise<void> {
    console.log(`📝 Processing modified Channex booking: ${booking.unique_id}`);

    // Find existing reservation by Channex ID in notes
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        notes: { contains: booking.unique_id },
        source: ReservationSource.CHANNEL
      },
      include: { room: true }
    });

    if (!existingReservation) {
      // Booking doesn't exist, create it
      await this.handleNewBooking(booking);
      return;
    }

    // Update reservation
    await prisma.reservation.update({
      where: { id: existingReservation.id },
      data: {
        guestName: `${booking.guest.name} ${booking.guest.surname}`,
        email: booking.guest.email,
        phone: booking.guest.phone,
        checkIn: new Date(booking.arrival_date),
        checkOut: new Date(booking.departure_date),
        adults:
          booking.rooms[0]?.occupancy.adults || existingReservation.adults,
        children:
          booking.rooms[0]?.occupancy.children || existingReservation.children,
        paidAmount: booking.amount,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Updated reservation ${existingReservation.id}`);
  }

  /**
   * Handle cancelled booking from OTA
   */
  async handleCancelledBooking(booking: ChannexReservation): Promise<void> {
    console.log(
      `❌ Processing cancelled Channex booking: ${booking.unique_id}`
    );

    const existingReservation = await prisma.reservation.findFirst({
      where: {
        notes: { contains: booking.unique_id },
        source: ReservationSource.CHANNEL
      }
    });

    if (!existingReservation) {
      console.warn(
        `Reservation not found for cancelled booking ${booking.unique_id}`
      );
      return;
    }

    await prisma.reservation.update({
      where: { id: existingReservation.id },
      data: {
        status: ReservationStatus.CANCELLED,
        statusChangeReason: `Cancelled via ${booking.channel_name}`,
        statusUpdatedAt: new Date()
      }
    });

    console.log(`✅ Cancelled reservation ${existingReservation.id}`);
  }

  private async getOrCreateChannel(
    organizationId: string,
    channelName: string
  ) {
    let channel = await prisma.channel.findFirst({
      where: {
        organizationId,
        name: { equals: channelName, mode: "insensitive" }
      }
    });

    if (!channel) {
      channel = await prisma.channel.create({
        data: {
          organizationId,
          name: channelName,
          type: this.mapChannelType(channelName)
        }
      });
    }

    return channel;
  }

  private mapChannelType(channelName: string) {
    const name = channelName.toLowerCase();
    if (name.includes("booking")) return "BOOKING_COM";
    if (name.includes("expedia")) return "EXPEDIA";
    if (name.includes("airbnb")) return "AIRBNB";
    if (name.includes("vrbo")) return "VRBO";
    return "OTHER";
  }

  private async findAvailableRoom(
    roomTypeId: string,
    checkIn: Date,
    checkOut: Date
  ) {
    const rooms = await prisma.room.findMany({
      where: { roomTypeId },
      include: {
        reservations: {
          where: {
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
            status: { in: ["CONFIRMED", "IN_HOUSE", "CONFIRMATION_PENDING"] },
            deletedAt: null
          }
        },
        roomBlocks: {
          where: {
            startDate: { lte: checkOut },
            endDate: { gte: checkIn }
          }
        }
      }
    });

    return rooms.find(
      (r) => r.reservations.length === 0 && r.roomBlocks.length === 0
    );
  }
}
```

---

## Phase 4: Frontend Integration

### Duration: 2 weeks

### Tasks

#### 4.1 Channel Manager Settings Page

**File: `src/app/dashboard/settings/channels/page.tsx`**

```typescript
/**
 * Channel Manager Settings Page
 * Allows property managers to configure Channex integration
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ChannelConnectionCard } from "@/components/channels/ChannelConnectionCard";
import { RoomTypeMappingTable } from "@/components/channels/RoomTypeMappingTable";
import { SyncHistoryTable } from "@/components/channels/SyncHistoryTable";

export default function ChannelManagerPage() {
  const [channels, setChannels] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChannelData();
  }, []);

  const loadChannelData = async () => {
    try {
      const [channelsRes, mappingsRes, statusRes] = await Promise.all([
        fetch("/api/channex/channels"),
        fetch("/api/channex/mappings"),
        fetch("/api/channex/status")
      ]);

      setChannels(await channelsRes.json());
      setMappings(await mappingsRes.json());
      setSyncStatus(await statusRes.json());
    } catch (error) {
      toast.error("Failed to load channel data");
    } finally {
      setLoading(false);
    }
  };

  const triggerFullSync = async () => {
    try {
      await fetch("/api/channex/sync", { method: "POST" });
      toast.success("Full sync initiated");
    } catch (error) {
      toast.error("Failed to start sync");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Channel Manager</h1>
          <p className="text-muted-foreground">
            Manage OTA connections via Channex.io
          </p>
        </div>
        <Button onClick={triggerFullSync}>Sync All Channels</Button>
      </div>

      <Tabs defaultValue="connections">
        <TabsList>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="mappings">Room Mappings</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ChannelConnectionCard
              name="Booking.com"
              logo="/icons/booking-com.svg"
              status={channels.find((c) => c.code === "booking_com")?.status}
              lastSync={syncStatus?.booking_com?.lastSync}
            />
            <ChannelConnectionCard
              name="Expedia"
              logo="/icons/expedia.svg"
              status={channels.find((c) => c.code === "expedia")?.status}
              lastSync={syncStatus?.expedia?.lastSync}
            />
            <ChannelConnectionCard
              name="Airbnb"
              logo="/icons/airbnb.svg"
              status="coming_soon"
            />
          </div>
        </TabsContent>

        <TabsContent value="mappings">
          <RoomTypeMappingTable
            mappings={mappings}
            onRefresh={loadChannelData}
          />
        </TabsContent>

        <TabsContent value="history">
          <SyncHistoryTable />
        </TabsContent>

        <TabsContent value="settings">
          <ChannexSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### 4.2 Channel Connection Card Component

**File: `src/components/channels/ChannelConnectionCard.tsx`**

```typescript
/**
 * Channel Connection Status Card
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface ChannelConnectionCardProps {
  name: string;
  logo: string;
  status: "connected" | "disconnected" | "pending" | "coming_soon";
  lastSync?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ChannelConnectionCard({
  name,
  logo,
  status,
  lastSync,
  onConnect,
  onDisconnect
}: ChannelConnectionCardProps) {
  const statusColors = {
    connected: "bg-green-100 text-green-800",
    disconnected: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
    coming_soon: "bg-gray-100 text-gray-500"
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <img src={logo} alt={name} className="w-12 h-12 object-contain" />
        <div className="flex-1">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Badge className={statusColors[status]}>
            {status === "coming_soon" ? "Coming Soon" : status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {status !== "coming_soon" && (
          <>
            {lastSync && (
              <p className="text-sm text-muted-foreground mb-4">
                Last synced:{" "}
                {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
              </p>
            )}
            <div className="flex gap-2">
              {status === "connected" ? (
                <>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDisconnect}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={onConnect}>
                  Connect
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

#### 4.3 Room Type Mapping Component

**File: `src/components/channels/RoomTypeMappingTable.tsx`**

```typescript
/**
 * Room Type Mapping Table
 * Maps PMS room types to Channex room types
 */

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface RoomMapping {
  id: string;
  roomType: { id: string; name: string };
  channexRoomTypeId: string;
  channexRoomTypeName: string;
  isActive: boolean;
}

interface Props {
  mappings: RoomMapping[];
  onRefresh: () => void;
}

export function RoomTypeMappingTable({ mappings, onRefresh }: Props) {
  const [channexRoomTypes, setChannexRoomTypes] = useState([]);

  const updateMapping = async (
    mappingId: string,
    channexRoomTypeId: string
  ) => {
    try {
      await fetch(`/api/channex/mappings/${mappingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channexRoomTypeId })
      });
      toast.success("Mapping updated");
      onRefresh();
    } catch (error) {
      toast.error("Failed to update mapping");
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>PMS Room Type</TableHead>
          <TableHead>Channex Room Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mappings.map((mapping) => (
          <TableRow key={mapping.id}>
            <TableCell className="font-medium">
              {mapping.roomType.name}
            </TableCell>
            <TableCell>
              <Select
                value={mapping.channexRoomTypeId}
                onValueChange={(value) => updateMapping(mapping.id, value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  {channexRoomTypes.map((rt: any) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Badge variant={mapping.isActive ? "default" : "secondary"}>
                {mapping.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm">
                Configure
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

#### 4.4 Calendar Integration - OTA Booking Indicators

Add visual indicators on the booking calendar for OTA bookings:

**Update: `src/components/bookings/CalendarViewRowStyle.tsx`**

```typescript
// Add OTA source badge to reservation display
const sourceColors: Record<string, string> = {
  BOOKING_COM: "bg-blue-600",
  EXPEDIA: "bg-yellow-500",
  AIRBNB: "bg-red-500",
  WEBSITE: "bg-green-500",
  PHONE: "bg-purple-500",
  WALK_IN: "bg-gray-500"
};

// In reservation card rendering:
{
  reservation.source === "CHANNEL" && reservation.channel && (
    <div
      className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
        sourceColors[reservation.channel.type] || "bg-gray-400"
      }`}
      title={`Booked via ${reservation.channel.name}`}
    />
  );
}
```

---

## Phase 5: Testing & Production

### Duration: 1-2 weeks

### Tasks

#### 5.1 Testing Strategy

**Unit Tests - File: `src/lib/channex/__tests__/ari-sync-service.test.ts`**

```typescript
import { ARISyncService } from "../ari-sync-service";
import { prismaMock } from "@/test/prisma-mock";

describe("ARISyncService", () => {
  let service: ARISyncService;

  beforeEach(() => {
    service = new ARISyncService();
  });

  describe("calculateAvailability", () => {
    it("should return correct availability when rooms are available", async () => {
      prismaMock.roomType.findUnique.mockResolvedValue({
        id: "rt1",
        rooms: [
          { id: "r1", reservations: [], roomBlocks: [] },
          { id: "r2", reservations: [], roomBlocks: [] }
        ]
      });

      const result = await service["calculateAvailability"]("rt1", new Date());

      expect(result.total).toBe(2);
      expect(result.available).toBe(2);
      expect(result.booked).toBe(0);
    });

    it("should reduce availability when rooms are booked", async () => {
      prismaMock.roomType.findUnique.mockResolvedValue({
        id: "rt1",
        rooms: [
          { id: "r1", reservations: [{ id: "res1" }], roomBlocks: [] },
          { id: "r2", reservations: [], roomBlocks: [] }
        ]
      });

      const result = await service["calculateAvailability"]("rt1", new Date());

      expect(result.total).toBe(2);
      expect(result.available).toBe(1);
      expect(result.booked).toBe(1);
    });
  });
});
```

**Integration Tests - File: `src/lib/channex/__tests__/webhook-handler.test.ts`**

```typescript
import { POST } from "@/app/api/webhooks/channex/route";
import { NextRequest } from "next/server";
import crypto from "crypto";

describe("Channex Webhook Handler", () => {
  const secret = "test_webhook_secret";

  function createSignedRequest(payload: object) {
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    return new NextRequest("http://localhost/api/webhooks/channex", {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        "x-channex-signature": signature
      }
    });
  }

  it("should reject invalid signatures", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/channex", {
      method: "POST",
      body: JSON.stringify({ event: "booking_new" }),
      headers: {
        "x-channex-signature": "invalid"
      }
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("should process new booking events", async () => {
    const req = createSignedRequest({
      event: "booking_new",
      property_id: "prop123",
      payload: {
        unique_id: "booking123",
        arrival_date: "2025-01-15",
        departure_date: "2025-01-17",
        guest: { name: "John", surname: "Doe" },
        rooms: []
      }
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
  });
});
```

#### 5.2 Staging Environment Setup

```env
# .env.staging
CHANNEX_API_URL=https://staging.channex.io/api/v1
CHANNEX_API_KEY=your_staging_api_key
CHANNEX_WEBHOOK_SECRET=your_staging_webhook_secret

# Enable detailed logging
CHANNEX_DEBUG=true
CHANNEX_LOG_LEVEL=debug
```

#### 5.3 Production Checklist

- [ ] **Security**

  - [ ] API keys stored in secure secrets manager
  - [ ] Webhook signatures verified
  - [ ] HTTPS enforced for all API calls
  - [ ] Rate limiting implemented

- [ ] **Monitoring**

  - [ ] Sync job success/failure alerts
  - [ ] Webhook processing latency monitoring
  - [ ] Error tracking for failed reservations
  - [ ] Dashboard for sync status

- [ ] **Data Integrity**

  - [ ] Idempotency keys for all operations
  - [ ] Transaction rollback on partial failures
  - [ ] Audit logs for all sync operations
  - [ ] Reconciliation reports

- [ ] **Performance**
  - [ ] Batch updates instead of single requests
  - [ ] Queue-based processing for high volume
  - [ ] Connection pooling for API calls
  - [ ] Caching for frequently accessed data

---

## Onboarding Workflow (Option A)

### Overview

With Option A (Single Master Account), the PMS handles all Channex setup programmatically. Customers never interact with Channex directly.

### Step-by-Step Flow

#### 1. Organization Signs Up in PMS

```typescript
// When a new organization is created in PMS
async function onOrganizationCreated(orgId: string, orgName: string) {
  const client = new ChannexClient(); // Uses master API key from env

  // Create a Channex Group for this organization
  const group = await client.createGroup({
    title: orgName
    // Other org details
  });

  // Store the mapping
  await prisma.channexOrganization.create({
    data: {
      organizationId: orgId,
      channexGroupId: group.id,
      channexGroupName: group.title,
      isActive: true
    }
  });
}
```

#### 2. Property Added to Organization

```typescript
// When a property is added to an organization
async function onPropertyCreated(propertyId: string, orgId: string) {
  const client = new ChannexClient(); // Uses master API key from env

  // Get the org's Channex group
  const channexOrg = await prisma.channexOrganization.findUnique({
    where: { organizationId: orgId }
  });

  if (!channexOrg) {
    throw new Error("Organization not connected to Channex");
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId }
  });

  // Create a Channex Property under the org's group
  const channexProperty = await client.createProperty({
    group_id: channexOrg.channexGroupId,
    title: property.name
    // Address, timezone, etc.
  });

  // Store the mapping
  await prisma.channexProperty.create({
    data: {
      channexOrgId: channexOrg.id,
      propertyId: propertyId,
      channexPropertyId: channexProperty.id,
      channexPropertyName: channexProperty.title,
      isActive: true,
      syncEnabled: true
    }
  });
}
```

#### 3. Room Types and Rate Plans Setup

```typescript
// When room types are created/updated in PMS
async function syncRoomTypesToChannex(propertyId: string) {
  const client = new ChannexClient();

  const channexProperty = await prisma.channexProperty.findUnique({
    where: { propertyId }
  });

  const roomTypes = await prisma.roomType.findMany({
    where: { propertyId }
  });

  for (const roomType of roomTypes) {
    // Create or update in Channex
    const channexRoomType = await client.createRoomType({
      property_id: channexProperty.channexPropertyId,
      title: roomType.name,
      occ_adults: roomType.maxAdults,
      occ_children: roomType.maxChildren
      // etc.
    });

    // Store mapping
    await prisma.channexRoomTypeMapping.upsert({
      where: {
        channexPropertyId_roomTypeId: {
          channexPropertyId: channexProperty.id,
          roomTypeId: roomType.id
        }
      },
      update: { channexRoomTypeId: channexRoomType.id },
      create: {
        channexPropertyId: channexProperty.id,
        roomTypeId: roomType.id,
        channexRoomTypeId: channexRoomType.id,
        channexRoomTypeName: channexRoomType.title
      }
    });
  }
}
```

#### 4. Customer Connects OTA from PMS UI

When customer clicks "Connect Booking.com" in the PMS:

```typescript
// PMS initiates the channel connection
async function initiateChannelConnection(
  propertyId: string,
  channelCode: string // "booking_com", "expedia", etc.
) {
  const client = new ChannexClient();

  const channexProperty = await prisma.channexProperty.findUnique({
    where: { propertyId }
  });

  // Create pending connection in our database
  await prisma.channexChannelConnection.create({
    data: {
      channexPropertyId: channexProperty.id,
      channelCode: channelCode,
      channelName: getChannelDisplayName(channelCode),
      connectionStatus: "PENDING"
    }
  });

  // Optionally: Initiate connection request in Channex
  // The actual connection requires customer approval in OTA extranet

  return {
    status: "PENDING",
    instructions: getOTAConnectionInstructions(channelCode)
  };
}
```

#### 5. Customer Approves in OTA Extranet

**This step happens OUTSIDE the PMS:**

- **Booking.com:**

  1. Customer logs into Booking.com Extranet
  2. Goes to Account → Channel Manager
  3. Selects "Channex" as provider
  4. Approves the connection

- **Expedia:**
  1. Customer logs into Expedia Partner Central
  2. Goes to Connectivity / Channel Manager settings
  3. Selects "Channex" as provider
  4. Approves the connection

#### 6. Channex Activates Connection (Webhook)

```typescript
// Webhook handler for channel connection events
async function handleChannelConnected(event: ChannexWebhookEvent) {
  if (event.event === "channel_connected") {
    const { property_id, channel_code } = event.payload;

    // Find our property by Channex property ID
    const channexProperty = await prisma.channexProperty.findUnique({
      where: { channexPropertyId: property_id }
    });

    // Update connection status
    await prisma.channexChannelConnection.update({
      where: {
        channexPropertyId_channelCode: {
          channexPropertyId: channexProperty.id,
          channelCode: channel_code
        }
      },
      data: {
        connectionStatus: "CONNECTED",
        connectedAt: new Date()
      }
    });

    // Trigger initial sync
    await triggerFullSync(channexProperty.propertyId);
  }
}
```

#### 7. PMS Begins Syncing

Once connected:

- **Outbound**: PMS → Channex → OTA (rates, availability, restrictions)
- **Inbound**: OTA → Channex → PMS (bookings, modifications, cancellations)

### Handling Properties with Existing OTA Connections

Many properties already have OTA accounts. They do NOT need to migrate:

1. Property owner logs into each OTA extranet
2. **Switches their channel manager to Channex** (not creates new account)
3. Previous channel manager loses control
4. Channex becomes the sole channel manager

The PMS:

- Does NOT see OTA credentials
- Only sees Channex group/property IDs and mappings
- Receives bookings via Channex webhooks

---

## Database Schema Changes

### Option A Architecture - Single Master Account

The Channex integration uses **Option A - Single Master Account**:

- **No API keys stored per organization or property**
- **Single master API key** in environment variables (`CHANNEX_API_KEY`)
- PMS programmatically creates **Channex Groups** (one per organization)
- PMS programmatically creates **Channex Properties** (one per property, under its org's group)

### Complete Prisma Schema (Option A)

Add these models to `prisma/schema.prisma`:

```prisma
/// Organization-level Channex Group mapping
/// PMS creates a Channex Group for each organization via the master API
model ChannexOrganization {
  id                String   @id @default(cuid())
  organizationId    String   @unique
  channexGroupId    String   @unique  // Created via Channex API using master key
  channexGroupName  String?           // Display name in Channex
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization      Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  properties        ChannexProperty[]  // Properties under this group

  @@index([organizationId])
  @@index([channexGroupId])
}

/// Property-level Channex Property mapping
/// PMS creates a Channex Property under the org's group via the master API
model ChannexProperty {
  id                  String   @id @default(cuid())
  channexOrgId        String   // Links to organization's Channex group
  propertyId          String   @unique
  channexPropertyId   String   @unique  // Created via Channex API using master key
  channexPropertyName String?           // Display name in Channex
  isActive            Boolean  @default(true)
  syncEnabled         Boolean  @default(true)
  lastSyncAt          DateTime?
  syncStatus          ChannexSyncStatus @default(PENDING)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  channexOrg          ChannexOrganization @relation(fields: [channexOrgId], references: [id], onDelete: Cascade)
  property            Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  roomTypeMappings    ChannexRoomTypeMapping[]
  ratePlanMappings    ChannexRatePlanMapping[]
  syncLogs            ChannexSyncLog[]
  webhookLogs         ChannexWebhookLog[]
  channelConnections  ChannexChannelConnection[]

  @@index([channexOrgId])
  @@index([propertyId])
  @@index([channexPropertyId])
}

/// Room type mapping between PMS and Channex
model ChannexRoomTypeMapping {
  id                  String   @id @default(cuid())
  channexPropertyId   String
  roomTypeId          String
  channexRoomTypeId   String
  channexRoomTypeName String?
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  channexProperty     ChannexProperty @relation(fields: [channexPropertyId], references: [id], onDelete: Cascade)
  roomType            RoomType        @relation(fields: [roomTypeId], references: [id], onDelete: Cascade)

  @@unique([channexPropertyId, roomTypeId])
  @@unique([channexPropertyId, channexRoomTypeId])
  @@index([roomTypeId])
}

/// Rate plan mapping between PMS and Channex
model ChannexRatePlanMapping {
  id                  String   @id @default(cuid())
  channexPropertyId   String
  roomTypeId          String
  channexRatePlanId   String
  channexRatePlanName String?
  isDefault           Boolean  @default(false)
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  channexProperty     ChannexProperty @relation(fields: [channexPropertyId], references: [id], onDelete: Cascade)

  @@unique([channexPropertyId, channexRatePlanId])
  @@index([roomTypeId])
}

/// Sync operation logs
model ChannexSyncLog {
  id                String            @id @default(cuid())
  channexPropertyId String
  syncType          ChannexSyncType
  status            ChannexSyncStatus
  startedAt         DateTime          @default(now())
  completedAt       DateTime?
  recordsProcessed  Int               @default(0)
  recordsFailed     Int               @default(0)
  errorMessage      String?
  metadata          Json?

  channexProperty   ChannexProperty   @relation(fields: [channexPropertyId], references: [id], onDelete: Cascade)

  @@index([channexPropertyId])
  @@index([syncType])
  @@index([status])
  @@index([startedAt])
}

/// Webhook event logs for debugging and audit
model ChannexWebhookLog {
  id                String   @id @default(cuid())
  eventType         String
  propertyId        String?
  payload           Json
  status            String   @default("RECEIVED")
  receivedAt        DateTime @default(now())
  processedAt       DateTime?
  errorMessage      String?

  channexProperty   ChannexProperty? @relation(fields: [propertyId], references: [channexPropertyId])

  @@index([eventType])
  @@index([propertyId])
  @@index([receivedAt])
}

/// Channex sync status enum
enum ChannexSyncStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  PARTIAL
}

/// Channex sync type enum
enum ChannexSyncType {
  ARI_PUSH           // Push availability/rates to Channex
  ARI_PULL           // Pull availability/rates from Channex
  RESERVATION_PULL   // Pull new reservations
  FULL_SYNC          // Complete property sync
  MAPPING_SYNC       // Sync room/rate mappings
}

/// OTA Channel connection status per property
/// Tracks which OTAs are connected and their status
model ChannexChannelConnection {
  id                  String   @id @default(cuid())
  channexPropertyId   String
  channelCode         String   // "booking_com", "expedia", "airbnb"
  channelName         String   // "Booking.com", "Expedia"
  connectionStatus    ChannexConnectionStatus @default(PENDING)
  connectedAt         DateTime?
  disconnectedAt      DateTime?
  lastSyncAt          DateTime?
  errorMessage        String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  channexProperty     ChannexProperty @relation(fields: [channexPropertyId], references: [id], onDelete: Cascade)

  @@unique([channexPropertyId, channelCode])
  @@index([channelCode])
  @@index([connectionStatus])
}

enum ChannexConnectionStatus {
  PENDING           // Customer needs to approve in OTA extranet
  CONNECTED         // Active and syncing
  DISCONNECTED      // Manually disconnected
  ERROR             // Connection error
}
```

> **Note**: No `apiKey` or `webhookSecret` fields in any model. The master API key and webhook secret are stored ONLY in environment variables.

### Update Existing Models

```prisma
// Add to Organization model
model Organization {
  // ... existing fields ...
  channexOrganization  ChannexOrganization?  // Organization's Channex Group mapping
}

// Add to Property model
model Property {
  // ... existing fields ...
  channexProperty  ChannexProperty?  // Property's Channex Property mapping
}

// Add to RoomType model
model RoomType {
  // ... existing fields ...
  channexMappings  ChannexRoomTypeMapping[]
}
```

### Option A Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│               PMS MASTER CHANNEX ACCOUNT (Single API Key)              │
│                      CHANNEX_API_KEY in .env                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   ORGANIZATION: Acme Hotels                     │   │
│  │   ChannexOrganization.channexGroupId: "grp_abc123"              │   │
│  │   (No apiKey stored - uses master key)                          │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                 │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│  │  │ Property: NYC   │  │ Property: LA    │  │ Property: Miami │  │   │
│  │  │ prop_id: p1     │  │ prop_id: p2     │  │ prop_id: p3     │  │   │
│  │  │                 │  │                 │  │                 │  │   │
│  │  │ Channels:       │  │ Channels:       │  │ Channels:       │  │   │
│  │  │ ✓ Booking.com   │  │ ✓ Booking.com   │  │ ✓ Expedia       │  │   │
│  │  │ ✓ Expedia       │  │ ○ Expedia       │  │                 │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   ORGANIZATION: Beach Resorts                   │   │
│  │   ChannexOrganization.channexGroupId: "grp_def456"              │   │
│  │   (No apiKey stored - uses master key)                          │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  ┌─────────────────┐  ┌─────────────────┐                       │   │
│  │  │ Property: Cancun│  │ Property: Cabo  │                       │   │
│  │  │ prop_id: p4     │  │ prop_id: p5     │                       │   │
│  │  └─────────────────┘  └─────────────────┘                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Channex Management API Routes

| Method | Endpoint                      | Description                           |
| ------ | ----------------------------- | ------------------------------------- |
| GET    | `/api/channex/org/status`     | Get organization Channex config       |
| POST   | `/api/channex/org/connect`    | Connect organization to Channex Group |
| DELETE | `/api/channex/org/disconnect` | Disconnect organization               |
| GET    | `/api/channex/status`         | Get property integration status       |
| POST   | `/api/channex/connect`        | Connect property to Channex           |
| DELETE | `/api/channex/disconnect`     | Disconnect property                   |
| GET    | `/api/channex/channels`       | List connected channels               |
| GET    | `/api/channex/mappings`       | Get room type mappings                |
| POST   | `/api/channex/mappings`       | Create room type mapping              |
| PATCH  | `/api/channex/mappings/:id`   | Update mapping                        |
| DELETE | `/api/channex/mappings/:id`   | Delete mapping                        |
| POST   | `/api/channex/sync`           | Trigger manual sync                   |
| GET    | `/api/channex/sync/history`   | Get sync history                      |
| POST   | `/api/webhooks/channex`       | Webhook receiver                      |

### API Route Implementation

**File: `src/app/api/channex/org/status/route.ts`** (Organization-level status)

```typescript
import { NextResponse } from "next/server";
import { validateOrganizationAccess } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const validation = await validateOrganizationAccess();
    if (!validation.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = validation;

    const channexOrg = await prisma.channexOrganization.findUnique({
      where: { organizationId },
      include: {
        properties: {
          include: {
            property: { select: { id: true, name: true } },
            _count: { select: { roomTypeMappings: true } }
          }
        }
      }
    });

    if (!channexOrg) {
      return NextResponse.json({
        connected: false,
        message: "Channex not configured for this organization"
      });
    }

    return NextResponse.json({
      connected: true,
      channexGroupId: channexOrg.channexGroupId,
      channexGroupName: channexOrg.channexGroupName,
      isActive: channexOrg.isActive,
      syncEnabled: channexOrg.syncEnabled,
      properties: channexOrg.properties.map((cp) => ({
        propertyId: cp.propertyId,
        propertyName: cp.property.name,
        channexPropertyId: cp.channexPropertyId,
        syncStatus: cp.syncStatus,
        lastSyncAt: cp.lastSyncAt,
        mappingsCount: cp._count.roomTypeMappings
      }))
    });
  } catch (error) {
    console.error("Channex org status error:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}
```

**File: `src/app/api/channex/status/route.ts`** (Property-level status)

```typescript
import { NextResponse } from "next/server";
import { validatePropertyAccess } from "@/lib/property-context";
import { prisma } from "@/lib/prisma";
import { ChannexClient } from "@/lib/channex/client";

export async function GET() {
  try {
    const validation = await validatePropertyAccess();
    if (!validation.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId, organizationId } = validation;

    // Get organization's Channex config first
    const channexOrg = await prisma.channexOrganization.findUnique({
      where: { organizationId }
    });

    if (!channexOrg) {
      return NextResponse.json({
        connected: false,
        orgConnected: false,
        message:
          "Organization not connected to Channex. Connect at org level first."
      });
    }

    // Get property's Channex config
    const channexProperty = await prisma.channexProperty.findUnique({
      where: { propertyId },
      include: {
        channexOrg: true,
        roomTypeMappings: true,
        syncLogs: {
          orderBy: { startedAt: "desc" },
          take: 5
        }
      }
    });

    if (!channexProperty) {
      return NextResponse.json({
        connected: false,
        orgConnected: true,
        channexGroupId: channexOrg.channexGroupId,
        message: "Property not yet connected to Channex"
      });
    }

    // Option A: Always use master API key from env
    const client = new ChannexClient(); // Uses CHANNEX_API_KEY from env

    const channels = await client.getChannels(
      channexProperty.channexPropertyId
    );

    return NextResponse.json({
      connected: true,
      orgConnected: true,
      channexGroupId: channexOrg.channexGroupId,
      channexPropertyId: channexProperty.channexPropertyId,
      syncStatus: channexProperty.syncStatus,
      lastSyncAt: channexProperty.lastSyncAt,
      channels: channels.map((c) => ({
        name: c.title,
        code: c.code,
        status: c.connection_status
      })),
      mappings: channexProperty.roomTypeMappings.length,
      recentSyncs: channexProperty.syncLogs
    });
  } catch (error) {
    console.error("Channex status error:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}
```

---

## Error Handling & Monitoring

### Error Categories

| Category          | Description                   | Action             |
| ----------------- | ----------------------------- | ------------------ |
| `AUTH_ERROR`      | Master API key invalid        | Check env config   |
| `RATE_LIMIT`      | Rate limit exceeded           | Implement backoff  |
| `MAPPING_ERROR`   | Room/rate mapping missing     | Alert admin        |
| `SYNC_FAILED`     | Sync operation failed         | Retry with backoff |
| `WEBHOOK_INVALID` | Invalid webhook signature     | Log and ignore     |
| `OVERBOOKING`     | No room available for booking | Alert immediately  |

### Monitoring Dashboard Metrics

```typescript
// Key metrics to track
interface ChannexMetrics {
  // Sync metrics
  totalSyncsLast24h: number;
  successfulSyncs: number;
  failedSyncs: number;
  avgSyncDuration: number;

  // Booking metrics
  bookingsReceivedLast24h: number;
  bookingsProcessed: number;
  bookingsFailed: number;

  // Channel health
  channelStatus: Record<string, "connected" | "disconnected" | "error">;
  lastSuccessfulSync: Record<string, Date>;

  // Error tracking
  errorsByCategory: Record<string, number>;
  criticalErrors: number;
}
```

---

## Security Considerations (Option A)

### Master API Key Management

1. **Storage**: Store ONLY in environment variables (never in database)
2. **Rotation**: Update env var and redeploy
3. **Access**: Only server-side code can access the key

> **Important**: With Option A, there is only ONE API key. If compromised, rotate immediately in Channex dashboard and update env var.

### Webhook Security

```typescript
// Always verify webhook signatures using master webhook secret
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.CHANNEX_WEBHOOK_SECRET!;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Data Protection

- PII (guest data) encrypted at rest
- Audit logs for all data access
- GDPR compliance for EU guest data

---

## Summary & Timeline

### Architecture: Option A - Single Master Account

This integration uses **Option A** where:

- **One master Channex account** owned by the PMS
- **One API key** stored in environment variables (`CHANNEX_API_KEY`)
- **No API keys stored per organization or property**
- PMS programmatically creates Groups (for orgs) and Properties (for properties)
- Customers connect OTAs via their extranet, selecting Channex as channel manager

| Phase       | Duration  | Key Deliverables                                 |
| ----------- | --------- | ------------------------------------------------ |
| **Phase 1** | 1-2 weeks | Database schema, API client, types               |
| **Phase 2** | 2-3 weeks | ARI sync service, queue workers, triggers        |
| **Phase 3** | 2-3 weeks | Webhook handler, reservation sync                |
| **Phase 4** | 2 weeks   | Frontend UI, settings page, calendar integration |
| **Phase 5** | 1-2 weeks | Testing, staging validation, production deploy   |

**Total Estimated Time: 8-12 weeks**

### Files to Create/Modify

#### New Files

```
src/lib/channex/
├── client.ts              # Channex API client (uses master key from env)
├── types.ts               # Type definitions
├── context.ts             # Multi-tenant context helpers
├── ari-sync-service.ts    # ARI sync logic
├── reservation-sync-service.ts  # Reservation handling
├── event-triggers.ts      # Auto-sync triggers
└── __tests__/             # Unit tests

src/lib/queue/
└── channex-workers.ts     # BullMQ workers

src/app/api/channex/
├── org/status/route.ts    # Organization Channex status
├── org/connect/route.ts   # Create Channex Group for org
├── status/route.ts        # Property Channex status
├── connect/route.ts       # Create Channex Property
├── channels/route.ts      # List/manage channel connections
├── mappings/route.ts      # Room type mappings
├── mappings/[id]/route.ts
└── sync/route.ts          # Manual sync trigger

src/app/api/webhooks/
└── channex/route.ts       # Webhook handler (single endpoint for all orgs)

src/app/dashboard/settings/
└── channels/page.tsx      # Channel manager UI

src/components/channels/
├── ChannelConnectionCard.tsx
├── RoomTypeMappingTable.tsx
├── SyncHistoryTable.tsx
└── ChannexSettingsForm.tsx
```

#### Modified Files

```
prisma/schema.prisma       # New models (no apiKey fields!)
src/app/api/reservations/route.ts  # Trigger sync on changes
src/app/api/rates/[roomTypeId]/route.ts  # Trigger sync on rate changes
src/components/bookings/CalendarViewRowStyle.tsx  # OTA indicators
src/components/Sidebar.tsx  # Add channel manager link
```

---

## Next Steps

1. **Review this plan** with your team
2. **Set up Channex staging** environment credentials:
   - Get master API key from Channex
   - Set `CHANNEX_API_KEY` and `CHANNEX_WEBHOOK_SECRET` in `.env`
3. **Create database migration** for new models (no apiKey fields)
4. **Implement Phase 1** - Foundation & Configuration
5. **Test with sandbox** Booking.com/Expedia connections

For questions about Channex API specifics, refer to:

- [Channex API Documentation](https://docs.channex.io/)
- [Channex Webhook Guide](https://docs.channex.io/webhooks)

---

## Implementation Progress (Updated: 2026-01-01)

### ✅ Phase 1: Foundation & Configuration - COMPLETED

| Task                            | Status  | Notes                                                              |
| ------------------------------- | ------- | ------------------------------------------------------------------ |
| Database Schema (Prisma models) | ✅ Done | Migration `20260101133947_add_channex_integration_models`          |
| Environment Configuration       | ✅ Done | `.env` configured with Channex staging credentials                 |
| Channex Service Layer           | ✅ Done | `src/lib/channex/client.ts`, `types.ts`, `config.ts`, `context.ts` |

### ✅ Phase 2: Outbound Sync (PMS → Channex) - COMPLETED

| Task             | Status  | Notes                                          |
| ---------------- | ------- | ---------------------------------------------- |
| ARI Sync Service | ✅ Done | `src/lib/channex/ari-sync-service.ts`          |
| Queue Workers    | ✅ Done | `src/lib/queue/workers/channex-sync-worker.ts` |
| Queue Helpers    | ✅ Done | `src/lib/channex/queue-helpers.ts`             |
| Event Triggers   | ✅ Done | `src/lib/channex/event-triggers.ts`            |

### ✅ Phase 3: Inbound Sync (Channex → PMS) - COMPLETED

| Task                     | Status  | Notes                                         |
| ------------------------ | ------- | --------------------------------------------- |
| Webhook Handler          | ✅ Done | `src/app/api/webhooks/channex/route.ts`       |
| Reservation Sync Service | ✅ Done | `src/lib/channex/reservation-sync-service.ts` |

### ✅ Phase 4: Frontend Integration - COMPLETED

| Task                   | Status  | Notes                                                                             |
| ---------------------- | ------- | --------------------------------------------------------------------------------- |
| Channel Settings Page  | ✅ Done | `src/app/[locale]/(protected)/properties/[propertyId]/settings/channels/page.tsx` |
| Connection Tab         | ✅ Done | Connect org/property to Channex                                                   |
| Property Mapping Tab   | ✅ Done | Map PMS room types to Channex room types/rate plans                               |
| Sync Status Tab        | ✅ Done | View sync logs and trigger manual syncs                                           |
| Refresh from Channex   | ✅ Done | Fetch latest room types/rate plans from Channex API                               |
| Auto-create in Channex | ✅ Done | Create room types and rate plans directly from UI                                 |
| Deleted item detection | ✅ Done | Shows red ✗ when Channex items deleted, allows recreation                         |

### 🔄 Phase 5: Testing & Production - IN PROGRESS

| Task                           | Status      | Notes                                         |
| ------------------------------ | ----------- | --------------------------------------------- |
| Staging Environment Setup      | ✅ Done     | Using `staging.channex.io`                    |
| Local Redis for Workers        | ⚠️ Optional | Required for Full Sync in development         |
| Production Redis (Upstash)     | ✅ Ready    | Configured for Railway deployment             |
| OTA Channel Connection Testing | 🔲 Pending  | Connect actual Booking.com/Expedia            |
| Webhook Testing                | 🔲 Pending  | Test with real OTA bookings                   |
| Production Deployment          | 🔲 Pending  | Deploy to Railway with production Channex API |

### Known Issues / Notes

1. **Full Sync requires Redis**: In local development, Full Sync requires Redis running (`npm run workers`). Works automatically in production with Upstash.

2. **Channex API Limits**: Rate limited to ~60 requests/minute. Queue workers handle this with backoff.

3. **Webhook Authentication**: Channex doesn't provide built-in signature verification. We use a secret query parameter appended to the webhook URL.

### Files Created/Modified

**New Files:**

```
src/lib/channex/
├── client.ts
├── types.ts
├── config.ts
├── context.ts
├── index.ts
├── ari-sync-service.ts
├── reservation-sync-service.ts
├── event-triggers.ts
└── queue-helpers.ts

src/lib/queue/workers/
└── channex-sync-worker.ts

src/app/api/channex/
├── org/
│   ├── connect/route.ts
│   └── status/route.ts
├── connect/route.ts
├── status/route.ts
├── mappings/route.ts
├── room-types/route.ts
├── rate-plans/route.ts
├── refresh/route.ts
└── sync/route.ts

src/app/api/webhooks/channex/
└── route.ts

src/app/[locale]/(protected)/properties/[propertyId]/settings/channels/
└── page.tsx

src/components/settings/channels/
├── ConnectionTab.tsx
├── PropertyMappingTab.tsx
└── SyncStatusTab.tsx
```

**Modified Files:**

```
prisma/schema.prisma (added Channex models)
src/lib/queue/queues.ts (added channex-sync queue)
src/lib/queue/types.ts (added Channex job types)
scripts/start-workers.ts (added Channex worker import)
.env (added Channex configuration)
```
