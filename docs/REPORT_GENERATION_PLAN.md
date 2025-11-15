# Robust Report Generation System - Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to integrate a robust report generation system into our PMS application, based on industry research of leading platforms (Cloudbeds, Guesty, Lodgify) and hotel industry best practices.

**Current State**: Basic PDF report generation exists for individual reservations and simple reservation lists.

**Target State**: Enterprise-grade reporting system with 30+ report types, scheduled exports, customizable dashboards, and advanced analytics.

---

## Table of Contents

1. [Industry Research Findings](#industry-research-findings)
2. [Report Categories & Types](#report-categories--types)
3. [Technical Architecture](#technical-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Database Schema Changes](#database-schema-changes)
6. [API Endpoints](#api-endpoints)
7. [UI/UX Components](#uiux-components)
8. [Export Formats](#export-formats)
9. [Performance Considerations](#performance-considerations)
10. [Security & Access Control](#security--access-control)

---

## 1. Industry Research Findings

### 1.1 Cloudbeds PMS

**Key Features:**

- **Insights Hub**: Fully customizable reporting dashboard
- **Multi-property analytics**: Portfolio-wide reporting
- **Revenue Intelligence**: Advanced analytics with competitor rate tracking
- **Automated report scheduling**: Daily, weekly, monthly exports
- **Custom report builder**: Drag-and-drop interface
- **Real-time dashboards**: Live KPI monitoring

### 1.2 Guesty

**Key Features:**

- **Advanced Analytics**: Performance reports with filtering, grouping, graphical capabilities
- **Export formats**: PDF, Excel, CSV
- **Occupancy tracking**: Real-time occupancy rates and trends
- **Revenue reports**: Detailed financial breakdowns
- **Channel performance**: OTA comparison reports
- **Custom date ranges**: Flexible reporting periods

### 1.3 Lodgify

**Key Features:**

- **Financial reporting**: Income statements, tax reports
- **Occupancy reports**: Historical and forecasted occupancy
- **Booking source analysis**: Channel attribution
- **Guest demographics**: Market segmentation reports
- **Automated email delivery**: Scheduled report distribution

### 1.4 Industry Standard Reports (Hotel PMS)

**Essential Reports:**

1. **Daily Flash Report**: End-of-day summary (occupancy, revenue, arrivals, departures)
2. **Night Audit Report**: Comprehensive daily reconciliation
3. **Housekeeping Report**: Room status and cleaning assignments
4. **Revenue Reports**: ADR, RevPAR, TRevPAR analysis
5. **Forecast Reports**: Future occupancy and revenue projections
6. **Guest Ledger**: Individual guest account statements
7. **Manager's Report**: Executive summary with KPIs

---

## 2. Report Categories & Types

### 2.1 Financial Reports (Priority: HIGH)

| Report Name             | Description                       | Key Metrics                                        | Frequency            |
| ----------------------- | --------------------------------- | -------------------------------------------------- | -------------------- |
| **Revenue Summary**     | Total revenue breakdown by source | Total revenue, room revenue, addon revenue, taxes  | Daily/Weekly/Monthly |
| **Payment Report**      | Payment transactions and methods  | Cash, card, bank transfer totals, pending payments | Daily/On-demand      |
| **Refund Report**       | All refunds processed             | Refund amounts, reasons, dates                     | Monthly/On-demand    |
| **Tax Report**          | Tax collection summary            | Tax by type, total collected, remittance due       | Monthly/Quarterly    |
| **Accounts Receivable** | Outstanding balances              | Aging report, overdue accounts                     | Weekly/Monthly       |
| **Profit & Loss**       | Income vs expenses                | Net profit, margins, cost breakdown                | Monthly/Quarterly    |
| **Invoice Register**    | All invoices generated            | Invoice numbers, amounts, status                   | Daily/Monthly        |

### 2.2 Operational Reports (Priority: HIGH)

| Report Name               | Description                        | Key Metrics                                              | Frequency            |
| ------------------------- | ---------------------------------- | -------------------------------------------------------- | -------------------- |
| **Daily Flash Report**    | End-of-day snapshot                | Occupancy %, revenue, arrivals, departures, rooms sold   | Daily                |
| **Night Audit Report**    | Comprehensive daily reconciliation | All transactions, room status changes, discrepancies     | Daily                |
| **Occupancy Report**      | Room utilization analysis          | Occupancy rate, available rooms, blocked rooms           | Daily/Weekly/Monthly |
| **Arrivals Report**       | Expected check-ins                 | Guest names, room assignments, special requests          | Daily                |
| **Departures Report**     | Expected check-outs                | Guest names, checkout times, outstanding balances        | Daily                |
| **In-House Guest Report** | Current guests                     | Room numbers, guest names, checkout dates                | Daily/On-demand      |
| **No-Show Report**        | Missed reservations                | Guest details, lost revenue, cancellation policy applied | Daily/Weekly         |
| **Cancellation Report**   | Cancelled bookings                 | Cancellation reasons, lost revenue, trends               | Weekly/Monthly       |

### 2.3 Housekeeping Reports (Priority: MEDIUM)

| Report Name                 | Description              | Key Metrics                                        | Frequency       |
| --------------------------- | ------------------------ | -------------------------------------------------- | --------------- |
| **Room Status Report**      | Current room conditions  | Clean, dirty, inspected, out-of-order              | Real-time/Daily |
| **Housekeeping Assignment** | Staff task allocation    | Rooms assigned per staff, completion status        | Daily           |
| **Maintenance Report**      | Rooms needing repair     | Issue descriptions, priority, estimated completion | Daily/Weekly    |
| **Turnover Report**         | Room cleaning efficiency | Average cleaning time, rooms cleaned per shift     | Daily/Weekly    |

### 2.4 Performance & Analytics Reports (Priority: HIGH)

| Report Name               | Description                 | Key Metrics                                              | Frequency            |
| ------------------------- | --------------------------- | -------------------------------------------------------- | -------------------- |
| **ADR Report**            | Average Daily Rate analysis | ADR by room type, date range, comparison                 | Daily/Weekly/Monthly |
| **RevPAR Report**         | Revenue Per Available Room  | RevPAR trends, benchmarks, forecasts                     | Weekly/Monthly       |
| **Booking Source Report** | Channel performance         | Bookings by source, revenue by channel, conversion rates | Weekly/Monthly       |
| **Length of Stay Report** | Guest stay patterns         | Average LOS, distribution, trends                        | Monthly              |
| **Rate Analysis**         | Pricing effectiveness       | Rate acceptance, denials, optimal pricing                | Weekly/Monthly       |
| **Forecast Report**       | Future projections          | Predicted occupancy, revenue, pace reports               | Weekly/Monthly       |
| **Pace Report**           | Booking velocity            | Bookings on-the-books vs same time last year             | Weekly               |

### 2.5 Guest & Marketing Reports (Priority: MEDIUM)

| Report Name               | Description              | Key Metrics                            | Frequency         |
| ------------------------- | ------------------------ | -------------------------------------- | ----------------- |
| **Guest Demographics**    | Guest profile analysis   | Age groups, countries, guest types     | Monthly/Quarterly |
| **Repeat Guest Report**   | Loyalty tracking         | Return rate, frequency, lifetime value | Monthly/Quarterly |
| **Guest Satisfaction**    | Feedback analysis        | Ratings, reviews, complaint trends     | Weekly/Monthly    |
| **Market Segment Report** | Business mix             | Corporate, leisure, group percentages  | Monthly           |
| **Booking Lead Time**     | Advance booking patterns | Average days before arrival, trends    | Monthly           |

### 2.6 Audit & Compliance Reports (Priority: MEDIUM)

| Report Name              | Description             | Key Metrics                                        | Frequency         |
| ------------------------ | ----------------------- | -------------------------------------------------- | ----------------- |
| **Audit Trail Report**   | System activity log     | User actions, changes, timestamps                  | On-demand         |
| **User Activity Report** | Staff performance       | Logins, actions performed, efficiency              | Weekly/Monthly    |
| **Compliance Report**    | Regulatory requirements | Tax compliance, data retention, guest registration | Monthly/Quarterly |
| **Credit Card Report**   | Card transaction log    | Authorizations, captures, declines                 | Daily/Monthly     |
| **Discrepancy Report**   | System inconsistencies  | Missing data, errors, reconciliation issues        | Daily             |

---

## 3. Technical Architecture

### 3.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Report Generation System                 │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌────────────────┐    ┌──────────────┐
│ Report Engine │    │ Query Builder  │    │ Export Engine│
│               │    │                │    │              │
│ - Templates   │    │ - Data         │    │ - PDF        │
│ - Scheduling  │    │   Aggregation  │    │ - Excel      │
│ - Caching     │    │ - Filtering    │    │ - CSV        │
│ - Queue       │    │ - Sorting      │    │ - JSON       │
└───────────────┘    └────────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Data Sources   │
                    │                  │
                    │ - Reservations   │
                    │ - Payments       │
                    │ - Rooms          │
                    │ - Guests         │
                    │ - Audit Logs     │
                    └──────────────────┘
```

### 3.2 Technology Stack

**Backend:**

- **Report Engine**: Custom service built on Node.js
- **PDF Generation**: PDFKit (already in use) + enhanced templates
- **Excel Generation**: ExcelJS library
- **CSV Generation**: Native Node.js streams
- **Job Queue**: BullMQ with Redis (leverage existing Upstash Redis)
- **Caching**: Redis for report caching (5-60 min TTL based on report type)
- **Email Delivery**: Existing email service for scheduled reports

**Frontend:**

- **Report Builder UI**: React components with drag-and-drop
- **Data Visualization**: Recharts or Chart.js for graphs
- **Date Range Picker**: Enhanced date selection
- **Export Buttons**: Download in multiple formats
- **Preview Modal**: Real-time report preview

**Database:**

- **New Tables**: ReportTemplate, ReportSchedule, ReportHistory, ReportCache
- **Indexes**: Optimized for common report queries
- **Materialized Views**: For complex aggregations (if using PostgreSQL)

---

## 4. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Establish core reporting infrastructure

**Tasks:**

1. ✅ Database schema design and migration
2. ✅ Create ReportService base class
3. ✅ Implement report template system
4. ✅ Set up job queue for async report generation
5. ✅ Create basic API endpoints structure
6. ✅ Implement caching layer

**Deliverables:**

- Database tables created
- ReportService with template rendering
- Queue system operational
- Basic API routes functional

### Phase 2: Financial Reports (Weeks 3-4)

**Goal**: Implement high-priority financial reports

**Reports to Build:**

1. Revenue Summary Report
2. Payment Report
3. Refund Report
4. Tax Report
5. Accounts Receivable Report

**Tasks:**

- Create report templates for each
- Build data aggregation queries
- Implement PDF/Excel/CSV export
- Create UI components for report generation
- Add filters (date range, property, payment method)

### Phase 3: Operational Reports (Weeks 5-6)

**Goal**: Build essential daily operational reports

**Reports to Build:**

1. Daily Flash Report
2. Night Audit Report
3. Occupancy Report
4. Arrivals/Departures Report
5. In-House Guest Report
6. No-Show & Cancellation Reports

**Tasks:**

- Implement real-time data queries
- Create automated daily report generation
- Build email delivery for scheduled reports
- Add report history tracking

### Phase 4: Performance Analytics (Weeks 7-8)

**Goal**: Advanced analytics and KPI reports

**Reports to Build:**

1. ADR Report
2. RevPAR Report
3. Booking Source Report
4. Rate Analysis Report
5. Forecast Report
6. Pace Report

**Tasks:**

- Implement complex calculations (ADR, RevPAR)
- Build trend analysis algorithms
- Create comparative reports (YoY, MoM)
- Add data visualization charts
- Implement forecast models

### Phase 5: Custom Report Builder (Weeks 9-10)

**Goal**: Allow users to create custom reports

**Features:**

- Drag-and-drop field selection
- Custom filters and grouping
- Save report templates
- Share reports with team
- Schedule custom reports

**Tasks:**

- Build report builder UI
- Implement dynamic query generation
- Create template save/load system
- Add sharing and permissions

### Phase 6: Scheduling & Automation (Weeks 11-12)

**Goal**: Automated report generation and delivery

**Features:**

- Schedule reports (daily, weekly, monthly)
- Email delivery to multiple recipients
- Report history and archiving
- Automated night audit report
- Automated daily flash report

**Tasks:**

- Implement cron job scheduler
- Build email template system
- Create report archive system
- Add notification system for report completion

---

## 5. Database Schema Changes

### 5.1 New Tables

```prisma
// Report Template - Stores predefined and custom report configurations
model ReportTemplate {
  id              String   @id @default(cuid())
  organizationId  String
  propertyId      String?  // Null for org-wide templates
  name            String
  description     String?
  category        ReportCategory
  type            ReportType
  isSystem        Boolean  @default(false) // System templates cannot be deleted
  isActive        Boolean  @default(true)

  // Report Configuration
  config          Json     // Stores fields, filters, grouping, sorting

  // Metadata
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id])
  property        Property?    @relation(fields: [propertyId], references: [id])
  creator         User         @relation(fields: [createdBy], references: [id])
  schedules       ReportSchedule[]
  history         ReportHistory[]

  @@index([organizationId])
  @@index([propertyId])
  @@index([category])
  @@index([type])
}

// Report Schedule - Automated report generation
model ReportSchedule {
  id              String   @id @default(cuid())
  organizationId  String
  propertyId      String?
  templateId      String

  // Schedule Configuration
  frequency       ScheduleFrequency // DAILY, WEEKLY, MONTHLY, QUARTERLY
  dayOfWeek       Int?     // 0-6 for weekly reports
  dayOfMonth      Int?     // 1-31 for monthly reports
  time            String   // HH:MM format
  timezone        String   @default("UTC")

  // Delivery Configuration
  format          ExportFormat[] // PDF, EXCEL, CSV
  recipients      String[] // Email addresses
  subject         String?
  message         String?

  // Status
  isActive        Boolean  @default(true)
  lastRunAt       DateTime?
  nextRunAt       DateTime?

  // Metadata
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  organization    Organization   @relation(fields: [organizationId], references: [id])
  property        Property?      @relation(fields: [propertyId], references: [id])
  template        ReportTemplate @relation(fields: [templateId], references: [id])
  creator         User           @relation(fields: [createdBy], references: [id])
  history         ReportHistory[]

  @@index([organizationId])
  @@index([propertyId])
  @@index([nextRunAt])
  @@index([isActive])
}

// Report History - Track all generated reports
model ReportHistory {
  id              String   @id @default(cuid())
  organizationId  String
  propertyId      String?
  templateId      String?
  scheduleId      String?

  // Report Details
  name            String
  category        ReportCategory
  type            ReportType
  format          ExportFormat

  // Date Range
  startDate       DateTime?
  endDate         DateTime?

  // File Storage
  fileUrl         String?  // S3 URL or local path
  fileSize        Int?     // Bytes

  // Status
  status          ReportStatus // PENDING, PROCESSING, COMPLETED, FAILED
  error           String?

  // Performance
  generationTime  Int?     // Milliseconds
  recordCount     Int?

  // Metadata
  generatedBy     String?  // Null for scheduled reports
  generatedAt     DateTime @default(now())
  expiresAt       DateTime? // Auto-delete after X days

  // Relations
  organization    Organization    @relation(fields: [organizationId], references: [id])
  property        Property?       @relation(fields: [propertyId], references: [id])
  template        ReportTemplate? @relation(fields: [templateId], references: [id])
  schedule        ReportSchedule? @relation(fields: [scheduleId], references: [id])
  generator       User?           @relation(fields: [generatedBy], references: [id])

  @@index([organizationId])
  @@index([propertyId])
  @@index([generatedAt])
  @@index([status])
  @@index([expiresAt])
}

// Enums
enum ReportCategory {
  FINANCIAL
  OPERATIONAL
  HOUSEKEEPING
  PERFORMANCE
  GUEST_MARKETING
  AUDIT_COMPLIANCE
  CUSTOM
}

enum ReportType {
  REVENUE_SUMMARY
  PAYMENT_REPORT
  REFUND_REPORT
  TAX_REPORT
  ACCOUNTS_RECEIVABLE
  DAILY_FLASH
  NIGHT_AUDIT
  OCCUPANCY
  ARRIVALS
  DEPARTURES
  IN_HOUSE
  NO_SHOW
  CANCELLATION
  ROOM_STATUS
  HOUSEKEEPING_ASSIGNMENT
  ADR_REPORT
  REVPAR_REPORT
  BOOKING_SOURCE
  FORECAST
  PACE_REPORT
  GUEST_DEMOGRAPHICS
  AUDIT_TRAIL
  CUSTOM
}

enum ScheduleFrequency {
  DAILY
  WEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
}

enum ExportFormat {
  PDF
  EXCEL
  CSV
  JSON
}

enum ReportStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

### 5.2 Indexes for Performance

```sql
-- Optimize reservation queries for reports
CREATE INDEX idx_reservation_checkin_date ON "Reservation"("checkIn", "propertyId");
CREATE INDEX idx_reservation_checkout_date ON "Reservation"("checkOut", "propertyId");
CREATE INDEX idx_reservation_created_date ON "Reservation"("createdAt", "propertyId");
CREATE INDEX idx_reservation_status_property ON "Reservation"("status", "propertyId");

-- Optimize payment queries
CREATE INDEX idx_payment_created_date ON "Payment"("createdAt", "reservationId");
CREATE INDEX idx_payment_status_type ON "Payment"("status", "type");

-- Optimize transaction queries
CREATE INDEX idx_transaction_created_date ON "PaymentTransaction"("createdAt", "reservationId");
CREATE INDEX idx_transaction_type_status ON "PaymentTransaction"("type", "status");
```

---

## 6. API Endpoints

### 6.1 Report Generation Endpoints

```typescript
// Generate report on-demand
POST /api/reports/generate
Body: {
  templateId?: string,
  type: ReportType,
  format: ExportFormat,
  startDate: string,
  endDate: string,
  filters?: {
    propertyId?: string,
    roomTypeId?: string,
    status?: string[],
    paymentMethod?: string[],
    // ... other filters
  },
  groupBy?: string[],
  sortBy?: { field: string, order: 'asc' | 'desc' }[]
}
Response: {
  reportId: string,
  status: 'PENDING' | 'PROCESSING',
  estimatedTime: number
}

// Get report status
GET /api/reports/:reportId/status
Response: {
  reportId: string,
  status: ReportStatus,
  progress?: number,
  fileUrl?: string,
  error?: string
}

// Download report
GET /api/reports/:reportId/download
Response: File stream (PDF/Excel/CSV)

// List available report templates
GET /api/reports/templates
Query: {
  category?: ReportCategory,
  propertyId?: string
}
Response: {
  templates: ReportTemplate[]
}

// Create custom report template
POST /api/reports/templates
Body: {
  name: string,
  description?: string,
  category: ReportCategory,
  type: ReportType,
  config: object
}

// Get report history
GET /api/reports/history
Query: {
  propertyId?: string,
  startDate?: string,
  endDate?: string,
  category?: ReportCategory,
  limit?: number,
  offset?: number
}
Response: {
  reports: ReportHistory[],
  total: number
}
```

### 6.2 Report Scheduling Endpoints

```typescript
// Create report schedule
POST /api/reports/schedules
Body: {
  templateId: string,
  frequency: ScheduleFrequency,
  dayOfWeek?: number,
  dayOfMonth?: number,
  time: string,
  format: ExportFormat[],
  recipients: string[],
  subject?: string,
  message?: string
}

// List schedules
GET /api/reports/schedules
Query: {
  propertyId?: string,
  isActive?: boolean
}

// Update schedule
PATCH /api/reports/schedules/:scheduleId
Body: {
  isActive?: boolean,
  frequency?: ScheduleFrequency,
  recipients?: string[],
  // ... other fields
}

// Delete schedule
DELETE /api/reports/schedules/:scheduleId
```

---

## 7. UI/UX Components

### 7.1 Reports Dashboard Page

**Location**: `/dashboard/reports`

**Components:**

- **Report Categories Tabs**: Financial, Operational, Performance, etc.
- **Quick Actions**: Generate common reports with one click
- **Recent Reports**: List of last 10 generated reports
- **Scheduled Reports**: Manage automated reports
- **Custom Reports**: User-created report templates

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Reports Dashboard                    [+ New Report]    │
├─────────────────────────────────────────────────────────┤
│  [Financial] [Operational] [Performance] [Custom]       │
├─────────────────────────────────────────────────────────┤
│  Quick Reports                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Daily    │ │ Revenue  │ │ Occupancy│ │ Payments │  │
│  │ Flash    │ │ Summary  │ │ Report   │ │ Report   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│  Recent Reports                         [View All]      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Revenue Summary - Jan 2025      [Download] [📧] │   │
│  │ Daily Flash - Today             [Download] [📧] │   │
│  │ Occupancy Report - This Week    [Download] [📧] │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Report Generation Modal

**Features:**

- Report type selection dropdown
- Date range picker (preset ranges: Today, Yesterday, This Week, Last Week, This Month, Last Month, Custom)
- Property selector (for multi-property orgs)
- Advanced filters (collapsible section)
- Export format selection (PDF, Excel, CSV)
- Preview button
- Generate & Download button
- Schedule button

### 7.3 Report Builder Interface

**Features:**

- **Left Panel**: Available fields (drag-and-drop)
- **Center Panel**: Report canvas (drop fields here)
- **Right Panel**: Field properties and formatting
- **Top Bar**: Save template, Preview, Generate
- **Bottom Bar**: Filters, Grouping, Sorting

### 7.4 Report History Table

**Columns:**

- Report Name
- Category
- Date Range
- Generated By
- Generated At
- Status (with progress indicator)
- File Size
- Actions (Download, Email, Delete)

**Features:**

- Search and filter
- Sort by any column
- Bulk actions (delete multiple)
- Auto-refresh for pending reports

---

## 8. Export Formats

### 8.1 PDF Export

**Features:**

- Professional header with logo and property info
- Table of contents for multi-section reports
- Page numbers and timestamps
- Charts and graphs embedded
- Customizable branding (colors, fonts)
- Digital signature support

**Libraries:**

- **PDFKit**: Current library (enhance templates)
- **Puppeteer**: For complex HTML-to-PDF conversion (optional)

### 8.2 Excel Export

**Features:**

- Multiple worksheets for complex reports
- Formatted cells (colors, borders, fonts)
- Formulas and calculations
- Charts and pivot tables
- Auto-filter on headers
- Freeze panes for large datasets

**Library:**

- **ExcelJS**: Full-featured Excel generation

**Example:**

```typescript
import ExcelJS from "exceljs";

async function generateExcelReport(data: any[], reportName: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Report");

  // Add headers
  worksheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Revenue", key: "revenue", width: 15 },
    { header: "Occupancy", key: "occupancy", width: 15 }
  ];

  // Add data
  worksheet.addRows(data);

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF7210A2" }
  };

  // Add totals
  const lastRow = worksheet.lastRow.number + 1;
  worksheet.getCell(`B${lastRow}`).value = {
    formula: `SUM(B2:B${lastRow - 1})`
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
```

### 8.3 CSV Export

**Features:**

- UTF-8 encoding with BOM
- Proper escaping of special characters
- Configurable delimiter (comma, semicolon, tab)
- Header row included
- Streaming for large datasets

**Implementation:**

```typescript
import { stringify } from "csv-stringify";
import { Readable } from "stream";

function generateCSVStream(data: any[]) {
  const stringifier = stringify({
    header: true,
    columns: ["date", "revenue", "occupancy"],
    cast: {
      date: (value) => value.toISOString().split("T")[0]
    }
  });

  const readable = Readable.from(data);
  return readable.pipe(stringifier);
}
```

---

## 9. Performance Considerations

### 9.1 Query Optimization

**Strategies:**

1. **Use Indexes**: All date and foreign key columns indexed
2. **Limit Data**: Default to last 30 days, warn for large ranges
3. **Pagination**: For reports with >1000 records
4. **Aggregation**: Use database aggregation functions
5. **Parallel Queries**: Run independent queries concurrently

**Example Optimized Query:**

```typescript
// BAD: Fetches all data then filters in memory
const reservations = await prisma.reservation.findMany({
  where: { propertyId }
});
const revenue = reservations.reduce((sum, r) => sum + r.paidAmount, 0);

// GOOD: Aggregates in database
const revenue = await prisma.reservation.aggregate({
  where: {
    propertyId,
    checkIn: { gte: startDate, lte: endDate }
  },
  _sum: { paidAmount: true }
});
```

### 9.2 Caching Strategy

**Cache Levels:**

1. **Report Data Cache**: 5-15 minutes for frequently accessed reports
2. **Template Cache**: 1 hour for report templates
3. **Aggregation Cache**: 30 minutes for complex calculations

**Implementation:**

```typescript
import { redis } from "@/lib/redis";

async function getCachedReport(
  cacheKey: string,
  generator: () => Promise<any>
) {
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Generate report
  const data = await generator();

  // Cache for 10 minutes
  await redis.setex(cacheKey, 600, JSON.stringify(data));

  return data;
}
```

### 9.3 Async Processing

**Use Queue for:**

- Reports with >10,000 records
- Excel exports with multiple worksheets
- Scheduled reports
- Reports with complex calculations

**Implementation:**

```typescript
import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

const reportQueue = new Queue("reports", {
  connection: redis
});

// Add job to queue
await reportQueue.add(
  "generate-report",
  {
    reportId,
    type,
    filters,
    format
  },
  {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000
    }
  }
);
```

### 9.4 Memory Management

**Strategies:**

1. **Stream Large Datasets**: Don't load all data into memory
2. **Chunk Processing**: Process data in batches
3. **Garbage Collection**: Clear references after processing
4. **Memory Limits**: Set max memory per report job

---

## 10. Security & Access Control

### 10.1 Role-Based Access

**Permissions Matrix:**

| Report Category      | FRONT_DESK | PROPERTY_MGR | ORG_ADMIN | SUPER_ADMIN |
| -------------------- | ---------- | ------------ | --------- | ----------- |
| Financial Reports    | ❌         | ✅           | ✅        | ✅          |
| Operational Reports  | ✅         | ✅           | ✅        | ✅          |
| Housekeeping Reports | ✅         | ✅           | ✅        | ✅          |
| Performance Reports  | ❌         | ✅           | ✅        | ✅          |
| Audit Reports        | ❌         | ❌           | ✅        | ✅          |
| Custom Reports       | ❌         | ✅           | ✅        | ✅          |

### 10.2 Data Isolation

**Multi-Tenancy:**

- All reports scoped to organizationId
- Property-level reports filtered by propertyId
- Row-Level Security (RLS) enforced at database level
- No cross-organization data leakage

**Implementation:**

```typescript
// Always include organization/property filter
const reports = await prisma.reportHistory.findMany({
  where: {
    organizationId: session.user.orgId,
    propertyId: session.user.propertyId // If property-scoped
  }
});
```

### 10.3 Sensitive Data Handling

**PII Protection:**

- Mask credit card numbers (show last 4 digits only)
- Redact sensitive guest information in shared reports
- Audit log all report access
- Encrypt report files at rest (S3 encryption)

### 10.4 Rate Limiting

**Limits:**

- 10 report generations per user per hour
- 50 report downloads per user per day
- 5 concurrent report generations per organization

**Implementation:**

```typescript
import rateLimit from "express-rate-limit";

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Too many reports generated, please try again later"
});

app.post("/api/reports/generate", reportLimiter, generateReportHandler);
```

---

## 11. Implementation Checklist

### Phase 1: Foundation ✅

- [ ] Create database schema and migrations
- [ ] Implement ReportService base class
- [ ] Set up BullMQ job queue
- [ ] Create basic API endpoints
- [ ] Implement Redis caching layer
- [ ] Add role-based access control

### Phase 2: Financial Reports 📋

- [ ] Revenue Summary Report
- [ ] Payment Report
- [ ] Refund Report
- [ ] Tax Report
- [ ] Accounts Receivable Report
- [ ] PDF/Excel/CSV export for each

### Phase 3: Operational Reports 📋

- [ ] Daily Flash Report
- [ ] Night Audit Report
- [ ] Occupancy Report
- [ ] Arrivals/Departures Report
- [ ] In-House Guest Report
- [ ] No-Show & Cancellation Reports

### Phase 4: Performance Analytics 📋

- [ ] ADR Report
- [ ] RevPAR Report
- [ ] Booking Source Report
- [ ] Rate Analysis Report
- [ ] Forecast Report
- [ ] Pace Report

### Phase 5: Custom Report Builder 📋

- [ ] Drag-and-drop UI
- [ ] Dynamic query builder
- [ ] Template save/load
- [ ] Sharing and permissions

### Phase 6: Scheduling & Automation 📋

- [ ] Cron job scheduler
- [ ] Email delivery system
- [ ] Report archiving
- [ ] Automated daily reports

---

## 12. Success Metrics

**KPIs to Track:**

1. **Adoption Rate**: % of users generating reports weekly
2. **Report Generation Time**: Average time to generate reports
3. **Error Rate**: % of failed report generations
4. **User Satisfaction**: Feedback scores on report usefulness
5. **Most Used Reports**: Top 10 report types by generation count
6. **Scheduled Reports**: Number of active schedules
7. **Export Format Preference**: PDF vs Excel vs CSV usage

---

## 13. Future Enhancements

**Phase 7+ (Future):**

1. **AI-Powered Insights**: Automatic anomaly detection and recommendations
2. **Interactive Dashboards**: Real-time data visualization with drill-down
3. **Mobile App Reports**: Optimized reports for mobile devices
4. **API for Third-Party Integration**: Allow external systems to generate reports
5. **Multi-Language Support**: Reports in multiple languages
6. **Advanced Forecasting**: Machine learning-based predictions
7. **Benchmark Reports**: Compare performance against industry standards
8. **White-Label Reports**: Custom branding for each property
9. **Report Collaboration**: Comments and annotations on reports
10. **Data Warehouse Integration**: Connect to external BI tools (Tableau, Power BI)

---

## 14. Conclusion

This comprehensive report generation system will transform our PMS into an enterprise-grade solution, matching and exceeding the capabilities of industry leaders like Cloudbeds, Guesty, and Lodgify. The phased approach ensures we deliver value incrementally while building a robust, scalable foundation.

**Estimated Timeline**: 12 weeks for core functionality (Phases 1-6)

**Estimated Effort**: 2-3 developers working full-time

**Priority**: HIGH - Essential for property managers to make data-driven decisions

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Author**: AI Assistant
**Status**: Ready for Review
