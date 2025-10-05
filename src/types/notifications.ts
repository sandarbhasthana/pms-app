// Notification System Types for PMS

export enum NotificationChannel {
  IN_APP = "in_app",
  EMAIL = "email",
  SMS = "sms"
}

export enum NotificationPriority {
  IMMEDIATE = "immediate",
  DAILY_SUMMARY = "daily_summary"
}

export enum EmployeeRole {
  FRONT_DESK = "front_desk",
  HOUSEKEEPING = "housekeeping",
  MAINTENANCE = "maintenance",
  MANAGER = "manager",
  ADMIN = "admin"
}

export enum NotificationEventType {
  // Room Requests
  ROOM_SERVICE_REQUEST = "room_service_request",
  ROOM_CHANGE_REQUEST = "room_change_request",
  SPECIAL_ACCOMMODATION_REQUEST = "special_accommodation_request",
  ROOM_MAINTENANCE_REQUEST = "room_maintenance_request",

  // Reservation Changes
  RESERVATION_STATUS_CHANGE = "reservation_status_change",
  BOOKING_MODIFICATION = "booking_modification",
  RESERVATION_CANCELLATION = "reservation_cancellation",
  NO_SHOW_DETECTED = "no_show_detected",
  CHECKIN_TIME_CHANGE = "checkin_time_change",
  CHECKOUT_TIME_CHANGE = "checkout_time_change",

  // Payment Issues
  PAYMENT_FAILURE = "payment_failure",
  CREDIT_CARD_DECLINED = "credit_card_declined",
  REFUND_PROCESSING_ISSUE = "refund_processing_issue",
  CHARGEBACK_NOTIFICATION = "chargeback_notification",

  // Service Requests/Housekeeping
  CLEANING_REQUEST = "cleaning_request",
  HOUSEKEEPING_STATUS_UPDATE = "housekeeping_status_update",
  SUPPLY_REQUEST = "supply_request",
  LOST_FOUND_ITEM = "lost_found_item",

  // Maintenance
  EQUIPMENT_FAILURE = "equipment_failure",
  REPAIR_REQUEST = "repair_request",
  SAFETY_ISSUE = "safety_issue",
  PREVENTIVE_MAINTENANCE_DUE = "preventive_maintenance_due",

  // Daily Summary Events
  DAILY_REVENUE_SUMMARY = "daily_revenue_summary",
  BOOKING_PERFORMANCE_SUMMARY = "booking_performance_summary",
  GUEST_SATISFACTION_SUMMARY = "guest_satisfaction_summary",
  STAFF_PERFORMANCE_SUMMARY = "staff_performance_summary",
  ROOM_OCCUPANCY_SUMMARY = "room_occupancy_summary"
}

export interface NotificationRule {
  id: string;
  eventType: NotificationEventType;
  priority: NotificationPriority;
  targetRoles: EmployeeRole[];
  channels: NotificationChannel[];
  isActive: boolean;
  conditions?: NotificationCondition[];
  template: NotificationTemplate;
  throttling?: ThrottlingConfig;
}

export interface NotificationCondition {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
  value: string | number | boolean;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  variables: string[];
  formatting: "text" | "html" | "markdown";
}

export interface ThrottlingConfig {
  maxPerHour: number;
  cooldownMinutes: number;
  deduplicationWindow: number;
}

export interface NotificationPayload {
  id: string;
  eventType: NotificationEventType;
  priority: NotificationPriority;
  recipientId: string;
  recipientRole: EmployeeRole;
  channel: NotificationChannel;
  subject: string;
  message: string;
  data: Record<string, string | number | boolean | null>;
  propertyId: string;
  organizationId: string;
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  status: NotificationStatus;
}

export enum NotificationStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed"
}

export interface UserNotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  eventSubscriptions: {
    roomRequests: boolean;
    reservationChanges: boolean;
    paymentIssues: boolean;
    serviceRequests: boolean;
    maintenance: boolean;
    dailySummaries: boolean;
  };
  quietHours?: {
    start: string; // "22:00"
    end: string; // "08:00"
    timezone: string;
  };
  phoneNumber?: string;
  isActive: boolean;
}

export interface DailySummaryData {
  date: string;
  propertyId: string;

  // Revenue
  totalRevenue: number;
  bookingCount: number;
  averageRate: number;

  // Occupancy
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;

  // Check-ins/Check-outs
  checkIns: {
    completed: number;
    pending: number;
    early: number;
  };
  checkOuts: {
    onTime: number;
    late: number;
    early: number;
  };

  // Issues
  noShows: number;
  paymentFailures: number;
  maintenanceRequests: number;
  serviceRequests: number;
}

export interface RealtimeNotification {
  id: string;
  type: NotificationEventType;
  priority: NotificationPriority;
  message: string;
  data: Record<string, string | number | boolean | null>;
  timestamp: Date;
  userId?: string;
  propertyId: string;
  isRead: boolean;
  actionRequired: boolean;
  actionUrl?: string;
}
