# Reservation Status System Implementation Plan

## 📋 Overview

This document outlines the comprehensive plan for implementing a reservation status system in the PMS application. The system will handle automatic status transitions based on payments and dates, while also providing manual override capabilities for front desk operations.

## 🏨 Reservation Status Types

### Primary Status Categories

1. **Confirmation Pending** - Initial state after booking creation
2. **Confirmed** - Payment received, reservation guaranteed
3. **In-House** - Guest has checked in
4. **Checked Out** - Guest has completed stay
5. **No Show** - Guest failed to arrive
6. **Cancelled** - Reservation cancelled by guest or hotel

## 🔄 Status Flow Diagram

```
Booking Created → Confirmation Pending → Confirmed → In-House → Checked Out
                                    ↓
                              No Show / Cancelled
```

## 🗄️ Database Schema Changes

### Reservation Table Updates

```sql
ALTER TABLE Reservation ADD COLUMN status ENUM(
  'CONFIRMATION_PENDING',
  'CONFIRMED',
  'IN_HOUSE',
  'CHECKED_OUT',
  'NO_SHOW',
  'CANCELLED'
) DEFAULT 'CONFIRMATION_PENDING';

ALTER TABLE Reservation ADD COLUMN checkedInAt TIMESTAMP NULL;
ALTER TABLE Reservation ADD COLUMN checkedOutAt TIMESTAMP NULL;
ALTER TABLE Reservation ADD COLUMN statusUpdatedBy VARCHAR(255) NULL;
ALTER TABLE Reservation ADD COLUMN statusUpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE Reservation ADD COLUMN statusChangeReason TEXT NULL;
```

### Status History Table (Audit Trail)

```sql
CREATE TABLE ReservationStatusHistory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reservationId INT NOT NULL,
  previousStatus ENUM(...),
  newStatus ENUM(...),
  changedBy VARCHAR(255),
  changeReason TEXT,
  changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  isAutomatic BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (reservationId) REFERENCES Reservation(id)
);
```

## 💻 TypeScript Implementation

### Enums and Types

```typescript
enum ReservationStatus {
  CONFIRMATION_PENDING = "CONFIRMATION_PENDING",
  CONFIRMED = "CONFIRMED",
  IN_HOUSE = "IN_HOUSE",
  CHECKED_OUT = "CHECKED_OUT",
  NO_SHOW = "NO_SHOW",
  CANCELLED = "CANCELLED"
}

interface StatusUpdatePayload {
  reservationId: string;
  newStatus: ReservationStatus;
  reason?: string;
  updatedBy?: string;
  isAutomatic?: boolean;
}
```

## 🤖 Automatic Status Management

### Payment-Triggered Updates

- **Same Day Bookings**: Auto check-in when payment completed
- **Future Bookings**: Auto confirm when payment received
- **Scheduled Check-ins**: Daily cron job for confirmed reservations

### Business Logic Rules

```typescript
const autoStatusRules = {
  // Auto-confirm on payment
  onPaymentReceived: (reservation) => {
    if (reservation.paidAmount >= reservation.totalAmount) {
      if (isToday(reservation.checkIn)) {
        updateStatus(reservation.id, "IN_HOUSE");
      } else {
        updateStatus(reservation.id, "CONFIRMED");
      }
    }
  },

  // Daily auto check-in job
  dailyCheckinJob: () => {
    const todayReservations = getConfirmedReservationsForToday();
    todayReservations.forEach((reservation) => {
      if (reservation.paidAmount >= reservation.totalAmount) {
        updateStatus(reservation.id, "IN_HOUSE");
      }
    });
  }
};
```

## 🎛️ Manual Status Management

### Status Transition Rules

```typescript
const allowedTransitions = {
  CONFIRMATION_PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_HOUSE", "NO_SHOW", "CANCELLED"],
  IN_HOUSE: ["CHECKED_OUT"],
  CHECKED_OUT: [], // Final state
  NO_SHOW: ["CONFIRMED"], // Recovery option
  CANCELLED: ["CONFIRMED"] // Reactivation option
};
```

### Front Desk Override Capabilities

- Manual status updates with reason logging
- Bulk status updates for multiple reservations
- Emergency status changes with manager approval
- Status rollback functionality (with restrictions)

## 🎨 UI/UX Design

### Status Badge System

```typescript
const statusConfig = {
  CONFIRMATION_PENDING: {
    color: "yellow",
    icon: "clock",
    label: "Pending",
    description: "Awaiting confirmation"
  },
  CONFIRMED: {
    color: "blue",
    icon: "check-circle",
    label: "Confirmed",
    description: "Payment received"
  },
  IN_HOUSE: {
    color: "green",
    icon: "home",
    label: "In-House",
    description: "Guest checked in"
  },
  CHECKED_OUT: {
    color: "gray",
    icon: "logout",
    label: "Checked Out",
    description: "Stay completed"
  },
  NO_SHOW: {
    color: "red",
    icon: "x-circle",
    label: "No Show",
    description: "Guest did not arrive"
  },
  CANCELLED: {
    color: "red",
    icon: "ban",
    label: "Cancelled",
    description: "Reservation cancelled"
  }
};
```

### Dashboard Components

- **Status Overview Cards**: Count of reservations by status
- **Today's Activity**: Check-ins, check-outs, pending actions
- **Alert System**: No-shows, late check-outs, payment issues
- **Quick Actions**: Bulk status updates, emergency overrides

## 📊 Reporting and Analytics

### Status Reports

- Daily status summary
- Revenue impact by status changes
- No-show patterns and trends
- Staff performance metrics
- Guest satisfaction correlation

### Key Performance Indicators

- Confirmation rate (Pending → Confirmed)
- No-show percentage
- Average time to check-in
- Manual override frequency
- Status accuracy metrics

## 🔧 Implementation Phases & Task Tracking

### Phase 1: Core Infrastructure (Week 1-2) - **Priority: HIGH**

- [ ] **Task 1.1**: Update Prisma schema for reservation status
  - [ ] Add status enum field to Reservation model
  - [ ] Add checkedInAt, checkedOutAt timestamp fields
  - [ ] Add statusUpdatedBy and statusUpdatedAt fields
  - [ ] Add statusChangeReason text field
- [ ] **Task 1.2**: Create ReservationStatusHistory model
  - [ ] Design audit trail table structure
  - [ ] Add foreign key relationships
  - [ ] Create migration scripts
- [ ] **Task 1.3**: TypeScript types and enums
  - [ ] Create ReservationStatus enum
  - [ ] Define StatusUpdatePayload interface
  - [ ] Create status configuration objects
  - [ ] Add type definitions for status transitions
- [ ] **Task 1.4**: Core API endpoints
  - [ ] POST /api/reservations/{id}/status - Update status
  - [ ] GET /api/reservations/{id}/status-history - Get audit trail
  - [ ] POST /api/reservations/bulk-status - Bulk status updates
  - [ ] GET /api/reservations/status-summary - Dashboard data
- [ ] **Task 1.5**: Basic UI components
  - [ ] StatusBadge component with color coding
  - [ ] StatusDropdown for manual updates
  - [ ] StatusHistory component for audit trail
  - [ ] Basic status filter components

### Phase 2: Automatic Status Management (Week 3-4) - **Priority: HIGH**

- [ ] **Task 2.1**: Payment-triggered status updates
  - [ ] Integrate with payment webhook handlers
  - [ ] Same-day booking auto check-in logic
  - [ ] Future booking auto-confirmation logic
  - [ ] Payment validation and status update triggers
- [ ] **Task 2.2**: Scheduled automation system
  - [ ] Daily cron job for auto check-ins
  - [ ] No-show detection and marking
  - [ ] Late checkout detection
  - [ ] Automated status cleanup jobs
- [ ] **Task 2.3**: Business rules engine
  - [ ] Configurable rule definitions
  - [ ] Rule execution engine
  - [ ] Rule validation and testing
  - [ ] Error handling for failed rules
- [ ] **Task 2.4**: Logging and monitoring
  - [ ] Comprehensive status change logging
  - [ ] Error tracking and alerting
  - [ ] Performance monitoring
  - [ ] Automated status change notifications

### Phase 3: Manual Management & UI (Week 5-6) - **Priority: MEDIUM**

- [ ] **Task 3.1**: Front desk status management interface
  - [ ] Status update modal with reason input
  - [ ] Confirmation dialogs for critical changes
  - [ ] Manager approval workflow for restricted changes
  - [ ] Quick action buttons for common status updates
- [ ] **Task 3.2**: Status transition validation
  - [ ] Implement allowed transition rules
  - [ ] Business logic validation
  - [ ] User permission checks
  - [ ] Data integrity validation
- [ ] **Task 3.3**: Bulk operations
  - [ ] Multi-select reservation interface
  - [ ] Bulk status update functionality
  - [ ] Batch processing with progress indicators
  - [ ] Rollback functionality for bulk operations
- [ ] **Task 3.4**: Enhanced audit trail
  - [ ] Detailed status history display
  - [ ] User action tracking
  - [ ] Change reason categorization
  - [ ] Export functionality for audit reports

### Phase 4: Advanced Features (Week 7-8) - **Priority: LOW**

- [ ] **Task 4.1**: Dashboard and reporting
  - [ ] Status overview cards
  - [ ] Real-time status metrics
  - [ ] Trend analysis charts
  - [ ] Custom report generation
- [ ] **Task 4.2**: Guest notification system
  - [ ] Email templates for status changes
  - [ ] SMS notification integration
  - [ ] Guest preference management
  - [ ] Notification delivery tracking
- [ ] **Task 4.3**: Advanced business rules
  - [ ] Dynamic rule configuration UI
  - [ ] A/B testing for rule effectiveness
  - [ ] Machine learning predictions
  - [ ] Revenue optimization triggers
- [ ] **Task 4.4**: Performance optimization
  - [ ] Database query optimization
  - [ ] Caching strategy implementation
  - [ ] Background job optimization
  - [ ] Real-time update performance tuning

## 📋 Task Dependencies & Prerequisites

### Critical Path Items

1. **Database Schema** (Task 1.1, 1.2) → All other tasks depend on this
2. **Core API** (Task 1.4) → Required for UI components and automation
3. **TypeScript Types** (Task 1.3) → Required for type-safe development
4. **Payment Integration** (Task 2.1) → Core business requirement

### Parallel Development Opportunities

- UI components (Task 1.5) can be developed alongside API endpoints
- Business rules engine (Task 2.3) can be built while automation is being implemented
- Dashboard components (Task 4.1) can be developed independently

## 🎯 Success Metrics & Acceptance Criteria

### Phase 1 Success Criteria

- [ ] All database migrations run successfully
- [ ] API endpoints return correct status codes and data
- [ ] UI components render correctly with proper styling
- [ ] Type safety maintained throughout codebase

### Phase 2 Success Criteria

- [ ] Payment-triggered status updates work 100% of the time
- [ ] Scheduled jobs run reliably without failures
- [ ] Business rules execute correctly for all scenarios
- [ ] No data corruption or inconsistencies

### Phase 3 Success Criteria

- [ ] Front desk can update any status with proper validation
- [ ] Bulk operations handle large datasets efficiently
- [ ] Audit trail captures all changes accurately
- [ ] User permissions enforced correctly

### Phase 4 Success Criteria

- [ ] Dashboard loads within 2 seconds
- [ ] Guest notifications delivered within 1 minute
- [ ] Advanced rules improve operational efficiency by 20%
- [ ] System handles 1000+ concurrent status updates

## 🚀 Suggested Enhancements

### Enhanced Status Granularity

- Sub-statuses for detailed tracking
- Time-based status modifiers (early, late, on-time)
- Payment status integration (partial, full, overdue)

### Smart Automation

- Predictive no-show detection
- Dynamic pricing based on status patterns
- Automated guest communication
- Integration with housekeeping systems

### Advanced Business Rules

- Configurable automation rules
- Property-specific status workflows
- Seasonal status behavior
- Revenue optimization triggers

## ❓ Configuration Questions

### Business Rules

1. **Check-in Time**: What is the standard check-in time? (Default: 3:00 PM)
2. **No-Show Timing**: Hours after check-in time to mark no-show? (Default: 6 hours)
3. **Auto Check-in**: Should same-day paid bookings auto check-in immediately?
4. **Partial Payments**: Minimum payment percentage for confirmation? (Default: 50%)

### Staff Permissions

1. **Role-based Access**: Which roles can update which statuses?
2. **Manager Approval**: Which status changes require manager approval?
3. **Audit Requirements**: Level of detail needed for status change logs?

### Guest Communication

1. **Automatic Notifications**: Should guests receive status change emails/SMS?
2. **Confirmation Requirements**: Should guests confirm receipt of status updates?
3. **Language Support**: Multi-language status notifications needed?

### Integration Points

1. **Channel Managers**: Which external systems need status updates?
2. **Payment Gateways**: Real-time payment status integration?
3. **Housekeeping**: Integration with room status systems?
4. **POS Systems**: F&B integration for in-house guests?

## 📝 Next Steps

1. **Review and Approve**: Stakeholder review of this plan
2. **Technical Specifications**: Detailed API and component specifications
3. **Database Migration**: Plan for existing reservation data migration
4. **Testing Strategy**: Comprehensive testing plan for all scenarios
5. **Training Materials**: Staff training documentation and procedures

---

_This document serves as the foundation for implementing a comprehensive reservation status system that balances automation with manual control, ensuring operational efficiency while maintaining flexibility for front desk operations._
