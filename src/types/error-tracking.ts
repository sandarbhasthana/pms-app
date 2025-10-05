// Error Tracking System Types

export enum ErrorSeverity {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  INFO = "info"
}

export enum ErrorCategory {
  SYSTEM = "system",
  DATABASE = "database",
  PAYMENT = "payment",
  QUEUE = "queue",
  API = "api",
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  BUSINESS_LOGIC = "business_logic",
  INTEGRATION = "integration",
  NOTIFICATION = "notification",
  RESERVATION = "reservation",
  USER_ACTION = "user_action"
}

export enum ErrorStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  IGNORED = "ignored",
  DUPLICATE = "duplicate"
}

export interface ErrorContext {
  // Request context
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
  query?: Record<string, string>;

  // User context
  userId?: string;
  userRole?: string;
  organizationId?: string;
  propertyId?: string;

  // System context
  service?: string;
  version?: string;
  environment?: string;

  // Business context
  reservationId?: string;
  paymentId?: string;
  ruleId?: string;

  // Additional metadata
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | Record<string, string>;
}

export interface ErrorLogData {
  errorCode?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  title: string;
  message: string;
  stackTrace?: string;
  context?: ErrorContext;

  // Location information
  service?: string;
  endpoint?: string;
  userId?: string;
  propertyId?: string;
  organizationId?: string;

  // Request metadata
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
  sessionId?: string;
}

export interface ErrorOccurrenceData {
  errorLogId: string;
  context?: ErrorContext;
  userId?: string;
  requestId?: string;
}

export interface ErrorAlertRule {
  id?: string;
  name: string;
  description?: string;
  isActive: boolean;

  // Alert conditions
  severity: ErrorSeverity[];
  category: ErrorCategory[];
  services: string[];

  // Alert thresholds
  threshold: number; // Number of occurrences
  timeWindow: number; // Time window in seconds
  cooldown: number; // Cooldown period in seconds

  // Notification settings
  channels: string[]; // Notification channels
  recipients: string[]; // User IDs to notify

  // Metadata
  propertyId?: string;
  organizationId: string;
  createdBy: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsByService: Record<string, number>;
  errorRate: number;
  averageResolutionTime: number;
  openErrors: number;
  resolvedErrors: number;
  topErrors: Array<{
    title: string;
    count: number;
    lastOccurrence: Date;
  }>;
}

export interface ErrorDashboardData {
  metrics: ErrorMetrics;
  recentErrors: ErrorLogData[];
  criticalErrors: ErrorLogData[];
  errorTrends: Array<{
    date: string;
    count: number;
    severity: ErrorSeverity;
  }>;
}

export interface ErrorRecoveryAction {
  type: "retry" | "fallback" | "circuit_breaker" | "notification" | "custom";
  config: {
    maxRetries?: number;
    retryDelay?: number;
    fallbackValue?: unknown;
    circuitBreakerThreshold?: number;
    customHandler?: string;
  };
}

export interface ErrorRecoveryRule {
  id: string;
  name: string;
  conditions: {
    category?: ErrorCategory[];
    severity?: ErrorSeverity[];
    service?: string[];
    errorCode?: string[];
  };
  actions: ErrorRecoveryAction[];
  isActive: boolean;
  organizationId: string;
}

export interface CircuitBreakerState {
  service: string;
  state: "closed" | "open" | "half_open";
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  threshold: number;
  timeout: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface ErrorNotificationPayload {
  errorId: string;
  title: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  service?: string;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  context?: ErrorContext;
}

// Error tracking events for the notification system
export enum ErrorTrackingEvent {
  ERROR_OCCURRED = "error_occurred",
  ERROR_THRESHOLD_EXCEEDED = "error_threshold_exceeded",
  CRITICAL_ERROR = "critical_error",
  SERVICE_DOWN = "service_down",
  ERROR_RESOLVED = "error_resolved",
  CIRCUIT_BREAKER_OPENED = "circuit_breaker_opened",
  RECOVERY_FAILED = "recovery_failed"
}

// Integration with existing notification system
export interface ErrorNotificationRule {
  eventType: ErrorTrackingEvent;
  severity: ErrorSeverity[];
  category: ErrorCategory[];
  services: string[];
  threshold: number;
  timeWindow: number;
  channels: string[];
  recipients: string[];
}
