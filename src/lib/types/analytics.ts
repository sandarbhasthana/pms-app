// Analytics and dashboard types for SUPER_ADMIN dashboard

import { SystemActivityType } from "@prisma/client";

// System-wide metrics interface
export interface SystemMetrics {
  id: string;
  date: Date;
  totalOrganizations: number;
  totalUsers: number;
  totalProperties: number;
  totalReservations: number;
  activeUsers: number;
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

// Organization-specific metrics interface
export interface OrganizationMetrics {
  id: string;
  organizationId: string;
  totalUsers: number;
  totalProperties: number;
  totalReservations: number;
  totalRevenue: number;
  lastActivity?: Date;
  monthlyActiveUsers: number;
  onboardingCompleted: boolean;
  firstPropertyCreated: boolean;
  firstReservationMade: boolean;
  stripeConnected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// System activity interface
export interface SystemActivity {
  id: string;
  activityType: SystemActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  performedBy?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Onboarding tracking interface
export interface OnboardingTracking {
  id: string;
  organizationId: string;
  startedAt: Date;
  completedAt?: Date;
  orgDetailsCompleted: boolean;
  orgDetailsCompletedAt?: Date;
  adminUserCompleted: boolean;
  adminUserCompletedAt?: Date;
  reviewCompleted: boolean;
  reviewCompletedAt?: Date;
  firstLoginAt?: Date;
  firstPropertyCreatedAt?: Date;
  firstReservationAt?: Date;
  stripeConnectedAt?: Date;
  timeToComplete?: number;
  timeToFirstProperty?: number;
  timeToFirstReservation?: number;
  isAbandoned: boolean;
  abandonedAt?: Date;
  abandonedStep?: string;
  createdAt: Date;
  updatedAt: Date;
}

// System health interface
export interface SystemHealth {
  id: string;
  timestamp: Date;
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
  dbConnections: number;
  dbQueryTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeUsers: number;
  ongoingReservations: number;
  createdAt: Date;
}

// Error log interface
export interface ErrorLog {
  id: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  userId?: string;
  organizationId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ipAddress?: string;
  requestBody?: Record<string, unknown>;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  createdAt: Date;
}

// Dashboard overview data interface
export interface DashboardOverview {
  systemMetrics: SystemMetrics;
  organizationCount: number;
  userCount: number;
  propertyCount: number;
  reservationCount: number;
  activeUserCount: number;
  monthlyGrowth: {
    organizations: number;
    users: number;
    properties: number;
    reservations: number;
  };
  systemHealth: SystemHealth;
}

// Organization list item interface
export interface OrganizationListItem {
  id: string;
  name: string;
  domain?: string;
  createdAt: Date;
  updatedAt: Date;
  stripeConnected: boolean;
  metrics: OrganizationMetrics;
  userCount: number;
  propertyCount: number;
  lastActivity?: Date;
  status: "active" | "inactive" | "suspended";
}

// Activity feed item interface
export interface ActivityFeedItem {
  id: string;
  type: SystemActivityType;
  description: string;
  organizationName?: string;
  userName?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Chart data interfaces
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface OrganizationGrowthData {
  daily: ChartDataPoint[];
  weekly: ChartDataPoint[];
  monthly: ChartDataPoint[];
}

export interface UserActivityData {
  activeUsers: ChartDataPoint[];
  newUsers: ChartDataPoint[];
  loginActivity: ChartDataPoint[];
}

export interface OnboardingFunnelData {
  started: number;
  orgDetailsCompleted: number;
  adminUserCompleted: number;
  reviewCompleted: number;
  completed: number;
  abandoned: number;
  conversionRate: number;
  averageTimeToComplete: number;
}

// API response interfaces
export interface AnalyticsApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter and search interfaces
export interface OrganizationFilters {
  status?: "active" | "inactive" | "suspended";
  hasStripe?: boolean;
  onboardingCompleted?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
}

export interface ActivityFilters {
  type?: SystemActivityType[];
  organizationId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// Metrics calculation utilities types
export interface MetricsCalculationResult {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: "up" | "down" | "stable";
}

export interface SystemHealthStatus {
  overall: "healthy" | "warning" | "critical";
  components: {
    api: "healthy" | "warning" | "critical";
    database: "healthy" | "warning" | "critical";
    email: "healthy" | "warning" | "critical";
    storage: "healthy" | "warning" | "critical";
  };
  uptime: number;
  lastCheck: Date;
}

// Export all SystemActivityType values for use in components
export { SystemActivityType };

// Activity type labels for UI display
export const ACTIVITY_TYPE_LABELS: Record<SystemActivityType, string> = {
  ORGANIZATION_CREATED: "Organization Created",
  ORGANIZATION_DELETED: "Organization Deleted",
  ORGANIZATION_UPDATED: "Organization Updated",
  USER_CREATED: "User Created",
  USER_DELETED: "User Deleted",
  USER_UPDATED: "User Updated",
  PROPERTY_CREATED: "Property Created",
  PROPERTY_DELETED: "Property Deleted",
  RESERVATION_CREATED: "Reservation Created",
  RESERVATION_CANCELLED: "Reservation Cancelled",
  STRIPE_CONNECTED: "Stripe Connected",
  STRIPE_DISCONNECTED: "Stripe Disconnected",
  SUBSCRIPTION_CREATED: "Subscription Created",
  SUBSCRIPTION_CANCELLED: "Subscription Cancelled",
  LOGIN_SUCCESS: "Login Success",
  LOGIN_FAILED: "Login Failed",
  PASSWORD_RESET: "Password Reset",
  ONBOARDING_STARTED: "Onboarding Started",
  ONBOARDING_COMPLETED: "Onboarding Completed",
  ONBOARDING_ABANDONED: "Onboarding Abandoned",
  SYSTEM_ERROR: "System Error",
  SYSTEM_MAINTENANCE: "System Maintenance"
};

// Color schemes for different activity types
export const ACTIVITY_TYPE_COLORS: Record<SystemActivityType, string> = {
  ORGANIZATION_CREATED: "#10b981", // green
  ORGANIZATION_DELETED: "#ef4444", // red
  ORGANIZATION_UPDATED: "#f59e0b", // amber
  USER_CREATED: "#3b82f6", // blue
  USER_DELETED: "#ef4444", // red
  USER_UPDATED: "#f59e0b", // amber
  PROPERTY_CREATED: "#8b5cf6", // violet
  PROPERTY_DELETED: "#ef4444", // red
  RESERVATION_CREATED: "#06b6d4", // cyan
  RESERVATION_CANCELLED: "#f97316", // orange
  STRIPE_CONNECTED: "#22c55e", // green
  STRIPE_DISCONNECTED: "#ef4444", // red
  SUBSCRIPTION_CREATED: "#10b981", // green
  SUBSCRIPTION_CANCELLED: "#ef4444", // red
  LOGIN_SUCCESS: "#22c55e", // green
  LOGIN_FAILED: "#ef4444", // red
  PASSWORD_RESET: "#f59e0b", // amber
  ONBOARDING_STARTED: "#3b82f6", // blue
  ONBOARDING_COMPLETED: "#10b981", // green
  ONBOARDING_ABANDONED: "#f97316", // orange
  SYSTEM_ERROR: "#ef4444", // red
  SYSTEM_MAINTENANCE: "#6b7280" // gray
};
