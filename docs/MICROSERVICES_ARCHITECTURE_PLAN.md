# Microservices Architecture Migration Plan

## Executive Summary

This document outlines a comprehensive strategy to transform your current **Next.js monolithic application** into a **microservices-compatible architecture**. The plan focuses on incremental migration, maintaining backward compatibility, and ensuring zero downtime during the transition.

---

## Current Architecture Analysis

### Technology Stack

- **Framework**: Next.js 15.3.5 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (JWT-based sessions)
- **Caching/Queue**: Redis (Upstash) with BullMQ
- **External Services**: Stripe, SendGrid, Twilio, AWS S3, Firebase
- **Deployment**: Vercel (serverless functions)

### Current Monolithic Structure

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Monolith                      │
├─────────────────────────────────────────────────────────┤
│  Frontend (React)                                        │
│  ├─ Components (UI)                                      │
│  ├─ Pages (App Router)                                   │
│  └─ Client-side State Management                         │
├─────────────────────────────────────────────────────────┤
│  Backend (API Routes)                                    │
│  ├─ /api/auth          - Authentication                  │
│  ├─ /api/reservations  - Booking management              │
│  ├─ /api/payments      - Payment processing              │
│  ├─ /api/properties    - Property management             │
│  ├─ /api/rooms         - Room management                 │
│  ├─ /api/notifications - Notification system             │
│  ├─ /api/webhooks      - External webhooks               │
│  └─ /api/admin         - Admin operations                │
├─────────────────────────────────────────────────────────┤
│  Shared Services                                         │
│  ├─ Prisma Client (Database)                             │
│  ├─ Redis Connection (Shared instance)                   │
│  ├─ Queue Workers (BullMQ)                               │
│  ├─ Business Rules Engine                                │
│  └─ Notification Services                                │
├─────────────────────────────────────────────────────────┤
│  External Integrations                                   │
│  ├─ Stripe (Payments)                                    │
│  ├─ SendGrid (Email)                                     │
│  ├─ Twilio (SMS)                                         │
│  ├─ AWS S3 (Storage)                                     │
│  └─ Firebase (Auth - optional)                           │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Characteristics

#### ✅ **Strengths**

1. **Multi-tenancy with RLS**: Organization-level data isolation via Row Level Security
2. **Property-based context**: Property-scoped operations with `withPropertyContext()`
3. **Queue-based automation**: BullMQ for background jobs (no-show detection, cleanup)
4. **Webhook-driven integrations**: Stripe, SendGrid, Twilio webhooks
5. **Modular service layer**: Separated business logic in `/lib` directory

#### ⚠️ **Challenges for Microservices**

1. **Shared Prisma client**: Single database connection pool
2. **Monolithic session management**: NextAuth JWT stored in cookies
3. **Tightly coupled API routes**: Direct function calls between routes
4. **Shared Redis instance**: Single connection for all queues
5. **No API gateway**: Direct client-to-API communication
6. **Stateful middleware**: Session/cookie-based property context
7. **Synchronous inter-service calls**: No message bus for async communication

---

## Target Microservices Architecture

### Proposed Service Decomposition

```
┌──────────────────────────────────────────────────────────────────┐
│                        API Gateway (Kong/Nginx)                   │
│  - Authentication & Authorization                                 │
│  - Rate Limiting & Throttling                                     │
│  - Request Routing                                                │
│  - Load Balancing                                                 │
└──────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌───────▼────────┐
│  Auth Service  │   │ Reservation Svc │   │ Payment Service│
│  (Port 3001)   │   │  (Port 3002)    │   │  (Port 3003)   │
│                │   │                 │   │                │
│ - NextAuth     │   │ - Bookings      │   │ - Stripe       │
│ - User Mgmt    │   │ - Calendar      │   │ - Transactions │
│ - Sessions     │   │ - Availability  │   │ - Refunds      │
│ - Invitations  │   │ - Status Mgmt   │   │ - Webhooks     │
└────────────────┘   └─────────────────┘   └────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Message Bus      │
                    │  (RabbitMQ/Kafka)  │
                    └────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌───────▼────────┐
│ Property Svc   │   │Notification Svc │   │  Admin Service │
│  (Port 3004)   │   │  (Port 3005)    │   │  (Port 3006)   │
│                │   │                 │   │                │
│ - Properties   │   │ - Email         │   │ - Org Mgmt     │
│ - Rooms        │   │ - SMS           │   │ - Analytics    │
│ - Room Types   │   │ - Push Notif    │   │ - Monitoring   │
│ - Settings     │   │ - Templates     │   │ - Super Admin  │
└────────────────┘   └─────────────────┘   └────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    Shared Infrastructure                          │
├──────────────────────────────────────────────────────────────────┤
│  Database Layer                                                   │
│  ├─ Auth DB (PostgreSQL)                                          │
│  ├─ Reservation DB (PostgreSQL)                                   │
│  ├─ Payment DB (PostgreSQL)                                       │
│  ├─ Property DB (PostgreSQL)                                      │
│  └─ Notification DB (PostgreSQL)                                  │
├──────────────────────────────────────────────────────────────────┤
│  Caching & Queue Layer                                            │
│  ├─ Redis Cluster (Upstash)                                       │
│  ├─ BullMQ Queues (per service)                                   │
│  └─ Cache (Redis)                                                 │
├──────────────────────────────────────────────────────────────────┤
│  External Services                                                │
│  ├─ Stripe (via Payment Service)                                  │
│  ├─ SendGrid (via Notification Service)                           │
│  ├─ Twilio (via Notification Service)                             │
│  └─ AWS S3 (via Property Service)                                 │
└──────────────────────────────────────────────────────────────────┘
```

### Service Boundaries & Responsibilities

#### 1. **Auth Service** (Port 3001)

**Domain**: User authentication, authorization, session management

- User registration, login, logout
- JWT token generation and validation
- Magic link invitations
- Organization membership management
- Role-based access control (RBAC)
- Property access validation

**Database**: `users`, `userOrg`, `userProperty`, `invitationToken`

**APIs**:

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/register`
- `GET /auth/session`
- `POST /auth/invite`
- `GET /auth/validate-token`

---

#### 2. **Reservation Service** (Port 3002)

**Domain**: Booking lifecycle, calendar, availability

- Reservation CRUD operations
- Calendar management
- Room availability checks
- Status transitions (CONFIRMED → IN_HOUSE → CHECKED_OUT)
- Automated workflows (no-show detection, late checkout)
- Room blocks and date blocking

**Database**: `reservation`, `reservationStatusHistory`, `reservationAuditLog`, `roomBlock`

**APIs**:

- `POST /reservations`
- `GET /reservations/:id`
- `PATCH /reservations/:id/status`
- `GET /calendar/availability`
- `POST /room-blocks`

**Events Published**:

- `reservation.created`
- `reservation.confirmed`
- `reservation.checked_in`
- `reservation.checked_out`
- `reservation.cancelled`
- `reservation.no_show`

---

#### 3. **Payment Service** (Port 3003)

**Domain**: Payment processing, transactions, refunds

- Stripe integration
- Payment intent creation
- Charge authorization and capture
- Refund processing
- Payment status tracking
- Webhook handling (Stripe events)
- Card storage and management

**Database**: `payment`, `webhookEvent`, `reservationDocument` (payment receipts)

**APIs**:

- `POST /payments/authorize`
- `POST /payments/capture`
- `POST /payments/refund`
- `GET /payments/:id`
- `POST /webhooks/stripe`

**Events Published**:

- `payment.authorized`
- `payment.captured`
- `payment.failed`
- `payment.refunded`

**Events Consumed**:

- `reservation.created` → Create payment intent
- `reservation.cancelled` → Process refund

---

#### 4. **Property Service** (Port 3004)

**Domain**: Property, room, and room type management

- Property CRUD operations
- Room management
- Room type configuration
- Property settings
- Business rules engine
- Rate management
- Image uploads (S3)

**Database**: `property`, `room`, `roomType`, `propertySettings`, `businessRule`, `dailyRate`

**APIs**:

- `GET /properties`
- `POST /properties`
- `GET /properties/:id/rooms`
- `POST /rooms`
- `GET /room-types`
- `POST /settings/general`

---

#### 5. **Notification Service** (Port 3005)

**Domain**: Multi-channel notifications

- Email notifications (SendGrid)
- SMS notifications (Twilio)
- Push notifications
- Notification templates
- Delivery tracking
- Notification rules and preferences

**Database**: `notificationLog`, `notificationRule`

**APIs**:

- `POST /notifications/email`
- `POST /notifications/sms`
- `GET /notifications/history`
- `POST /webhooks/sendgrid`
- `POST /webhooks/twilio`

**Events Consumed**:

- `reservation.created` → Send confirmation email
- `reservation.checked_in` → Send welcome SMS
- `payment.captured` → Send receipt email

---

#### 6. **Admin Service** (Port 3006)

**Domain**: Platform administration, analytics, monitoring

- Organization onboarding
- Super admin dashboard
- System analytics
- Performance monitoring
- Error tracking
- Activity logs

**Database**: `organization`, `systemActivity`, `errorLog`, `performanceMetric`, `organizationMetrics`

**APIs**:

- `POST /admin/organizations/onboard`
- `GET /admin/analytics`
- `GET /admin/errors`
- `GET /admin/activities`

---

## Migration Strategy

### Phase 1: Preparation & Foundation (Weeks 1-4)

#### 1.1 Database Decomposition

**Goal**: Separate shared database into service-specific schemas

**Actions**:

- [ ] Create separate database schemas per service
- [ ] Implement database-per-service pattern (logical separation first)
- [ ] Set up cross-schema foreign keys with proper constraints
- [ ] Create database migration scripts for each service
- [ ] Implement database connection pooling per service

**Example Schema Separation**:

```sql
-- Auth Schema
CREATE SCHEMA auth;
ALTER TABLE "User" SET SCHEMA auth;
ALTER TABLE "UserOrg" SET SCHEMA auth;
ALTER TABLE "UserProperty" SET SCHEMA auth;

-- Reservation Schema
CREATE SCHEMA reservation;
ALTER TABLE "Reservation" SET SCHEMA reservation;
ALTER TABLE "ReservationStatusHistory" SET SCHEMA reservation;

-- Payment Schema
CREATE SCHEMA payment;
ALTER TABLE "Payment" SET SCHEMA payment;
ALTER TABLE "WebhookEvent" SET SCHEMA payment;
```

**Prisma Schema Updates**:

```typescript
// services/auth-service/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("AUTH_DATABASE_URL")
  schemas  = ["auth"]
}

model User {
  @@schema("auth")
  // ... existing fields
}
```

---

#### 1.2 API Gateway Setup

**Goal**: Implement centralized routing and authentication

**Technology Options**:

- **Kong Gateway** (Recommended for production)
- **Nginx** (Lightweight, good for MVP)
- **AWS API Gateway** (If migrating to AWS)
- **Traefik** (Cloud-native, Docker-friendly)

**Actions**:

- [ ] Set up API Gateway infrastructure
- [ ] Configure routing rules per service
- [ ] Implement JWT validation at gateway level
- [ ] Set up rate limiting and throttling
- [ ] Configure CORS policies
- [ ] Implement request/response logging

**Example Kong Configuration**:

```yaml
services:
  - name: auth-service
    url: http://auth-service:3001
    routes:
      - name: auth-routes
        paths:
          - /api/auth
        strip_path: true
    plugins:
      - name: rate-limiting
        config:
          minute: 100

  - name: reservation-service
    url: http://reservation-service:3002
    routes:
      - name: reservation-routes
        paths:
          - /api/reservations
          - /api/calendar
        strip_path: true
    plugins:
      - name: jwt
        config:
          secret_is_base64: false
```

---

#### 1.3 Message Bus Implementation

**Goal**: Enable asynchronous inter-service communication

**Technology Options**:

- **RabbitMQ** (Recommended - reliable, mature)
- **Apache Kafka** (High throughput, event streaming)
- **AWS SQS/SNS** (Managed, serverless)
- **Redis Pub/Sub** (Already using Redis)

**Actions**:

- [ ] Set up message broker infrastructure
- [ ] Define event schemas and contracts
- [ ] Implement event publishing library
- [ ] Implement event consumption library
- [ ] Set up dead letter queues (DLQ)
- [ ] Implement event replay mechanism

**Event Schema Example**:

```typescript
// shared/events/reservation.events.ts
export interface ReservationCreatedEvent {
  eventType: "reservation.created";
  eventId: string;
  timestamp: Date;
  version: "1.0";
  data: {
    reservationId: string;
    propertyId: string;
    organizationId: string;
    guestName: string;
    checkIn: Date;
    checkOut: Date;
    totalAmount: number;
    roomId: string;
  };
}
```

---

#### 1.4 Shared Libraries & Contracts

**Goal**: Create reusable code and maintain consistency

**Actions**:

- [ ] Create `@pms/shared-types` package (TypeScript types)
- [ ] Create `@pms/shared-utils` package (common utilities)
- [ ] Create `@pms/event-contracts` package (event schemas)
- [ ] Create `@pms/api-client` package (service-to-service HTTP client)
- [ ] Set up monorepo structure (Turborepo/Nx)

**Monorepo Structure**:

```
pms-microservices/
├── packages/
│   ├── shared-types/
│   ├── shared-utils/
│   ├── event-contracts/
│   └── api-client/
├── services/
│   ├── auth-service/
│   ├── reservation-service/
│   ├── payment-service/
│   ├── property-service/
│   ├── notification-service/
│   └── admin-service/
├── apps/
│   └── frontend/ (Next.js)
└── infrastructure/
    ├── docker-compose.yml
    ├── kubernetes/
    └── terraform/
```

---

### Phase 2: Extract First Service (Weeks 5-8)

#### 2.1 Extract Notification Service (Lowest Risk)

**Why start here?**

- Minimal dependencies on other services
- Already well-isolated (`/lib/notifications`)
- Consumes events, doesn't produce critical data
- Easy to test independently

**Steps**:

1. **Create new service structure**:

```bash
mkdir -p services/notification-service
cd services/notification-service
npm init -y
npm install express prisma @prisma/client bullmq ioredis
```

2. **Copy notification code**:

```bash
# Copy from monolith
cp -r ../../src/lib/notifications ./src/
cp -r ../../src/app/api/webhooks/sendgrid ./src/api/
cp -r ../../src/app/api/webhooks/twilio ./src/api/
```

3. **Create service entry point**:

```typescript
// services/notification-service/src/index.ts
import express from "express";
import { notificationRouter } from "./routes/notifications";
import { webhookRouter } from "./routes/webhooks";

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());
app.use("/api/notifications", notificationRouter);
app.use("/api/webhooks", webhookRouter);

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
```

4. **Set up event consumers**:

```typescript
// services/notification-service/src/consumers/reservation.consumer.ts
import { Consumer } from "@pms/event-contracts";

export class ReservationEventConsumer {
  async handleReservationCreated(event: ReservationCreatedEvent) {
    // Send confirmation email
    await sendEmail({
      to: event.data.guestEmail,
      template: "reservation-confirmation",
      data: event.data
    });
  }
}
```

5. **Update monolith to use new service**:

```typescript
// src/lib/notifications/notification-client.ts
export async function sendNotification(payload: NotificationPayload) {
  // Route to notification service instead of local handler
  const response = await fetch(
    `${NOTIFICATION_SERVICE_URL}/api/notifications`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
  return response.json();
}
```

---

### Phase 3: Extract Core Services (Weeks 9-16)

#### 3.1 Extract Payment Service

**Complexity**: Medium
**Dependencies**: Reservation Service (for reservation data)

**Key Challenges**:

- Stripe webhook handling must be reliable
- Payment state must be consistent with reservations
- Implement saga pattern for distributed transactions

**Saga Pattern Example**:

```typescript
// Payment saga for reservation creation
class ReservationPaymentSaga {
  async execute(reservationId: string, amount: number) {
    try {
      // Step 1: Create payment intent
      const paymentIntent = await paymentService.createIntent(amount);

      // Step 2: Update reservation with payment intent
      await reservationService.updatePaymentIntent(
        reservationId,
        paymentIntent.id
      );

      // Step 3: Authorize payment
      const result = await paymentService.authorize(paymentIntent.id);

      return { success: true, paymentIntent: result };
    } catch (error) {
      // Compensating transactions
      await this.rollback(reservationId, paymentIntent?.id);
      throw error;
    }
  }

  async rollback(reservationId: string, paymentIntentId?: string) {
    if (paymentIntentId) {
      await paymentService.cancelIntent(paymentIntentId);
    }
    await reservationService.markPaymentFailed(reservationId);
  }
}
```

---

#### 3.2 Extract Auth Service

**Complexity**: High
**Dependencies**: All services (for authentication)

**Key Challenges**:

- Session management across services
- JWT token validation at gateway
- Property context propagation
- Organization/property access control

**Implementation Strategy**:

```typescript
// Auth Service - Token Generation
export class AuthService {
  async login(email: string, password: string) {
    const user = await this.validateCredentials(email, password);

    // Generate JWT with all necessary claims
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
        propertyIds: user.availableProperties.map((p) => p.id),
        currentPropertyId: user.defaultProperty?.id
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return { token, user };
  }
}

// API Gateway - JWT Validation Middleware
export async function validateJWT(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Add property context to headers for downstream services
    req.headers["x-user-id"] = decoded.userId;
    req.headers["x-org-id"] = decoded.orgId;
    req.headers["x-property-id"] = decoded.currentPropertyId;

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}
```

---

#### 3.3 Extract Reservation Service

**Complexity**: Very High
**Dependencies**: Property Service, Payment Service, Notification Service

**Key Challenges**:

- Complex business logic (status transitions, automation)
- BullMQ job scheduling per property
- Calendar availability calculations
- Distributed transactions with payment service

**Background Job Migration**:

```typescript
// Reservation Service - Job Scheduler
import { Queue, Worker } from "bullmq";

export class ReservationAutomationService {
  private noShowQueue: Queue;
  private lateCheckoutQueue: Queue;

  constructor() {
    this.noShowQueue = new Queue("no-show-detection", {
      connection: REDIS_CONFIG
    });

    // Schedule jobs per property
    this.schedulePropertyJobs();
  }

  async schedulePropertyJobs() {
    const properties = await prisma.property.findMany();

    for (const property of properties) {
      await this.noShowQueue.add(
        `no-show-${property.id}`,
        { propertyId: property.id },
        {
          repeat: { pattern: "0 */4 * * *" }, // Every 4 hours
          jobId: `no-show-${property.id}`
        }
      );
    }
  }
}
```

---

### Phase 4: Frontend Adaptation (Weeks 17-20)

#### 4.1 Update Next.js Frontend

**Goal**: Adapt frontend to communicate with microservices via API Gateway

**Changes Required**:

1. **Update API client to use gateway URL**:

```typescript
// src/lib/api-client.ts
const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8000";

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = await getSession().then((s) => s?.accessToken);

  const response = await fetch(`${API_GATEWAY_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });

  return response.json();
}
```

2. **Update authentication flow**:

```typescript
// src/lib/auth.ts
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Call Auth Service via API Gateway
        const response = await fetch(`${API_GATEWAY_URL}/api/auth/login`, {
          method: "POST",
          body: JSON.stringify(credentials)
        });

        const { token, user } = await response.json();
        return { ...user, accessToken: token };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
      }
      return token;
    }
  }
};
```

3. **Remove direct Prisma calls from frontend**:

- All data fetching must go through API Gateway
- Remove `prisma` imports from server components
- Use API routes or server actions that call microservices

---

### Phase 5: Deployment & Infrastructure (Weeks 21-24)

#### 5.1 Containerization

**Goal**: Package each service as a Docker container

**Example Dockerfile**:

```dockerfile
# services/reservation-service/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3002
CMD ["node", "dist/index.js"]
```

**Docker Compose for Local Development**:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: pms_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"

  api-gateway:
    image: kong:latest
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/kong.yml
    ports:
      - "8000:8000"
      - "8001:8001"
    volumes:
      - ./infrastructure/kong.yml:/kong/kong.yml

  auth-service:
    build: ./services/auth-service
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/pms_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis

  reservation-service:
    build: ./services/reservation-service
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/pms_db
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://rabbitmq:5672
    ports:
      - "3002:3002"
    depends_on:
      - postgres
      - redis
      - rabbitmq

  payment-service:
    build: ./services/payment-service
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/pms_db
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
    ports:
      - "3003:3003"
    depends_on:
      - postgres

  property-service:
    build: ./services/property-service
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/pms_db
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
    ports:
      - "3004:3004"
    depends_on:
      - postgres

  notification-service:
    build: ./services/notification-service
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/pms_db
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
      RABBITMQ_URL: amqp://rabbitmq:5672
    ports:
      - "3005:3005"
    depends_on:
      - postgres
      - rabbitmq

  admin-service:
    build: ./services/admin-service
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/pms_db
    ports:
      - "3006:3006"
    depends_on:
      - postgres

  frontend:
    build: ./apps/frontend
    environment:
      NEXT_PUBLIC_API_GATEWAY_URL: http://api-gateway:8000
    ports:
      - "3000:3000"
    depends_on:
      - api-gateway

volumes:
  postgres_data:
```

---

#### 5.2 Kubernetes Deployment

**Goal**: Production-ready orchestration

**Example Kubernetes Manifests**:

```yaml
# infrastructure/kubernetes/reservation-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reservation-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: reservation-service
  template:
    metadata:
      labels:
        app: reservation-service
    spec:
      containers:
        - name: reservation-service
          image: pms/reservation-service:latest
          ports:
            - containerPort: 3002
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secrets
                  key: reservation-db-url
            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: redis-config
                  key: url
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3002
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3002
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: reservation-service
spec:
  selector:
    app: reservation-service
  ports:
    - protocol: TCP
      port: 3002
      targetPort: 3002
  type: ClusterIP
```

---

## Critical Considerations

### 1. Data Consistency Challenges

#### Problem: Distributed Transactions

When a reservation is created, you need to:

1. Create reservation record (Reservation Service)
2. Create payment intent (Payment Service)
3. Send confirmation email (Notification Service)

**Solution: Saga Pattern with Compensation**

```typescript
export class CreateReservationSaga {
  async execute(data: CreateReservationDTO) {
    const sagaId = uuid();
    let reservationId: string | null = null;
    let paymentIntentId: string | null = null;

    try {
      // Step 1: Create reservation
      reservationId = await reservationService.create(data);
      await sagaLog.record(sagaId, "reservation_created", { reservationId });

      // Step 2: Create payment intent
      paymentIntentId = await paymentService.createIntent({
        amount: data.totalAmount,
        reservationId
      });
      await sagaLog.record(sagaId, "payment_intent_created", {
        paymentIntentId
      });

      // Step 3: Send notification (fire-and-forget, non-critical)
      await eventBus.publish("reservation.created", {
        reservationId,
        guestEmail: data.guestEmail
      });

      return { success: true, reservationId, paymentIntentId };
    } catch (error) {
      // Compensating transactions
      await this.compensate(sagaId, reservationId, paymentIntentId);
      throw error;
    }
  }

  async compensate(
    sagaId: string,
    reservationId?: string,
    paymentIntentId?: string
  ) {
    const steps = await sagaLog.getSteps(sagaId);

    // Rollback in reverse order
    if (paymentIntentId) {
      await paymentService.cancelIntent(paymentIntentId);
    }
    if (reservationId) {
      await reservationService.delete(reservationId);
    }
  }
}
```

---

### 2. Session Management Across Services

#### Problem: Property Context Propagation

Your current system uses cookies (`propertyId`, `orgId`) for context. In microservices, this must be handled differently.

**Solution: JWT Claims + Request Headers**

```typescript
// API Gateway Middleware
export function injectContextHeaders(req, res, next) {
  const token = jwt.decode(req.headers.authorization);

  // Extract property context from cookie or token
  const propertyId = req.cookies.propertyId || token.currentPropertyId;
  const orgId = req.cookies.orgId || token.orgId;

  // Inject into headers for downstream services
  req.headers["x-user-id"] = token.userId;
  req.headers["x-org-id"] = orgId;
  req.headers["x-property-id"] = propertyId;
  req.headers["x-user-role"] = token.role;

  next();
}

// Reservation Service - Extract Context
export function getRequestContext(req: Request): RequestContext {
  return {
    userId: req.headers["x-user-id"],
    orgId: req.headers["x-org-id"],
    propertyId: req.headers["x-property-id"],
    role: req.headers["x-user-role"]
  };
}
```

---

### 3. Database Migration Strategy

#### Option A: Shared Database (Transitional)

**Pros**: Easier migration, maintains referential integrity
**Cons**: Tight coupling, not true microservices

```
┌─────────────────────────────────────┐
│      Shared PostgreSQL Database      │
├─────────────────────────────────────┤
│  Schema: auth                        │
│  Schema: reservation                 │
│  Schema: payment                     │
│  Schema: property                    │
│  Schema: notification                │
└─────────────────────────────────────┘
         ▲         ▲         ▲
         │         │         │
    ┌────┴───┐ ┌──┴───┐ ┌───┴────┐
    │ Auth   │ │ Res  │ │Payment │
    │Service │ │Service│ │Service │
    └────────┘ └──────┘ └────────┘
```

#### Option B: Database Per Service (Target)

**Pros**: True isolation, independent scaling
**Cons**: Complex data synchronization, eventual consistency

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Auth DB  │  │  Res DB  │  │Payment DB│
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │
┌────▼─────┐  ┌───▼──────┐  ┌────▼─────┐
│  Auth    │  │   Res    │  │ Payment  │
│ Service  │  │ Service  │  │ Service  │
└──────────┘  └──────────┘  └──────────┘
```

**Recommended Approach**: Start with Option A, migrate to Option B gradually

---

### 4. Testing Strategy

#### Unit Tests (Per Service)

```typescript
// reservation-service/tests/unit/reservation.service.test.ts
describe("ReservationService", () => {
  it("should create reservation with valid data", async () => {
    const mockData = {
      guestName: "John Doe",
      checkIn: new Date("2025-12-01"),
      checkOut: new Date("2025-12-05"),
      roomId: "room-123"
    };

    const result = await reservationService.create(mockData);
    expect(result.id).toBeDefined();
    expect(result.status).toBe("CONFIRMED");
  });
});
```

#### Integration Tests (Service-to-Service)

```typescript
// tests/integration/reservation-payment.test.ts
describe("Reservation + Payment Integration", () => {
  it("should create reservation and payment intent", async () => {
    // Create reservation
    const reservation = await reservationService.create(mockReservationData);

    // Verify payment intent was created
    const paymentIntent = await paymentService.getByReservationId(
      reservation.id
    );
    expect(paymentIntent).toBeDefined();
    expect(paymentIntent.amount).toBe(reservation.totalAmount);
  });
});
```

#### End-to-End Tests

```typescript
// tests/e2e/booking-flow.test.ts
describe("Complete Booking Flow", () => {
  it("should complete full booking with payment", async () => {
    // 1. Login
    const { token } = await authService.login(testUser);

    // 2. Check availability
    const rooms = await reservationService.checkAvailability({
      checkIn: "2025-12-01",
      checkOut: "2025-12-05"
    });

    // 3. Create reservation
    const reservation = await reservationService.create({
      roomId: rooms[0].id,
      ...bookingData
    });

    // 4. Process payment
    const payment = await paymentService.authorize({
      reservationId: reservation.id,
      amount: reservation.totalAmount
    });

    // 5. Verify notification sent
    await waitFor(() => {
      expect(emailService.sentEmails).toContainEqual(
        expect.objectContaining({
          to: bookingData.guestEmail,
          template: "reservation-confirmation"
        })
      );
    });
  });
});
```

---

## Monitoring & Observability

### 1. Distributed Tracing

**Tool**: Jaeger or Zipkin

```typescript
// Trace requests across services
import { trace } from "@opentelemetry/api";

export async function createReservation(data: CreateReservationDTO) {
  const span = trace
    .getTracer("reservation-service")
    .startSpan("createReservation");

  try {
    span.setAttribute("reservation.guestName", data.guestName);
    span.setAttribute("reservation.propertyId", data.propertyId);

    const result = await reservationService.create(data);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

### 2. Centralized Logging

**Tool**: ELK Stack (Elasticsearch, Logstash, Kibana) or Grafana Loki

```typescript
// Structured logging with correlation IDs
import winston from "winston";

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "reservation-service" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/app.log" })
  ]
});

// Usage
logger.info("Reservation created", {
  correlationId: req.headers["x-correlation-id"],
  userId: req.user.id,
  reservationId: reservation.id
});
```

### 3. Metrics & Alerting

**Tool**: Prometheus + Grafana

```typescript
// Expose metrics endpoint
import { register, Counter, Histogram } from "prom-client";

const reservationCounter = new Counter({
  name: "reservations_created_total",
  help: "Total number of reservations created"
});

const reservationDuration = new Histogram({
  name: "reservation_creation_duration_seconds",
  help: "Duration of reservation creation"
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

---

## Timeline & Milestones

| Phase                      | Duration     | Key Deliverables                                             | Risk Level |
| -------------------------- | ------------ | ------------------------------------------------------------ | ---------- |
| **Phase 1: Foundation**    | 4 weeks      | Database schemas, API Gateway, Message Bus, Shared libraries | Medium     |
| **Phase 2: First Service** | 4 weeks      | Notification Service extracted and deployed                  | Low        |
| **Phase 3: Core Services** | 8 weeks      | Payment, Auth, Reservation services extracted                | High       |
| **Phase 4: Frontend**      | 4 weeks      | Frontend adapted to use API Gateway                          | Medium     |
| **Phase 5: Deployment**    | 4 weeks      | Kubernetes setup, monitoring, production deployment          | High       |
| **Total**                  | **24 weeks** | **Full microservices architecture**                          | -          |

---

## Success Criteria

### Technical Metrics

- [ ] All services independently deployable
- [ ] < 200ms p95 latency for API Gateway
- [ ] 99.9% uptime for critical services (Auth, Reservation, Payment)
- [ ] Zero data loss during migration
- [ ] All tests passing (unit, integration, e2e)

### Business Metrics

- [ ] No downtime during migration
- [ ] No impact on user experience
- [ ] Ability to scale services independently
- [ ] Reduced deployment time (< 10 minutes per service)

---

## Risks & Mitigation

| Risk                               | Impact | Probability | Mitigation                                          |
| ---------------------------------- | ------ | ----------- | --------------------------------------------------- |
| Data inconsistency across services | High   | Medium      | Implement saga pattern, event sourcing              |
| Performance degradation            | High   | Medium      | Load testing, caching, database optimization        |
| Increased operational complexity   | Medium | High        | Comprehensive monitoring, automated deployments     |
| Team learning curve                | Medium | High        | Training, documentation, pair programming           |
| Cost increase (infrastructure)     | Medium | High        | Start with shared database, optimize resource usage |

---

## Conclusion

This migration plan provides a **structured, incremental approach** to transforming your monolithic PMS application into a microservices architecture. The key principles are:

1. **Start small**: Extract low-risk services first (Notification Service)
2. **Maintain backward compatibility**: Keep monolith running during migration
3. **Invest in infrastructure**: API Gateway, Message Bus, Monitoring
4. **Test extensively**: Unit, integration, and e2e tests at every step
5. **Monitor everything**: Distributed tracing, centralized logging, metrics

**Recommended Next Steps**:

1. Review this plan with your team
2. Set up development environment (Docker Compose)
3. Create proof-of-concept for Notification Service extraction
4. Establish monitoring and observability baseline
5. Begin Phase 1 implementation

Good luck with your microservices journey! 🚀
