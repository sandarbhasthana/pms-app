/**
 * Report Generation System - Type Definitions
 */

import {
  ReportCategory,
  ReportType,
  ReportStatus,
  ExportFormat,
  ScheduleFrequency
} from "@prisma/client";

// ============================================================================
// Report Generation Types
// ============================================================================

export interface ReportFilters {
  propertyId?: string;
  roomTypeId?: string;
  status?: string[];
  paymentMethod?: string[];
  startDate?: Date | string;
  endDate?: Date | string;
  [key: string]: string | string[] | Date | undefined;
}

export interface ReportConfig {
  filters?: ReportFilters;
  groupBy?: string[];
  sortBy?: Array<{ field: string; order: "asc" | "desc" }>;
  includeCharts?: boolean;
  includeDetails?: boolean;
}

export interface ReportGenerationRequest {
  templateId?: string;
  type: ReportType;
  format: ExportFormat;
  startDate?: Date | string; // Can be string when coming from Redis queue
  endDate?: Date | string; // Can be string when coming from Redis queue
  config?: ReportConfig;
  organizationId: string;
  propertyId?: string;
  userId: string;
}

export interface ReportGenerationResult {
  reportId: string;
  status: ReportStatus;
  fileUrl?: string;
  error?: string;
  generationTime?: number;
  recordCount?: number;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  generatedBy: string;
  organizationName: string;
  propertyName?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  data: Record<string, string | number | Date>[];
  summary?: Record<string, string | number>;
  charts?: ReportChart[];
}

export interface ReportChart {
  type: "bar" | "line" | "pie" | "area";
  title: string;
  data: Record<string, string | number>[];
  xAxis?: string;
  yAxis?: string;
}

// ============================================================================
// Night Audit Report Types
// ============================================================================

export interface NightAuditReportData {
  reportDate: Date; // The night being audited (6 AM to 6 AM)
  property: {
    id: string;
    name: string;
    address: string;
  };
  summary: {
    totalRevenue: number;
    roomRevenue: number;
    addonRevenue: number;
    taxRevenue: number;
    totalBookings: number;
    checkIns: number;
    checkOuts: number;
    cancellations: number;
    noShows: number;
    occupancyRate: number;
    adr: number; // Average Daily Rate
    revpar: number; // Revenue Per Available Room
  };
  checkIns: Array<{
    reservationId: string;
    guestName: string;
    roomNumber: string;
    checkInTime: Date;
    nights: number;
    totalAmount: number;
    paymentStatus: string;
  }>;
  checkOuts: Array<{
    reservationId: string;
    guestName: string;
    roomNumber: string;
    checkOutTime: Date;
    totalAmount: number;
    balanceDue: number;
  }>;
  cancellations: Array<{
    reservationId: string;
    guestName: string;
    roomType: string;
    cancelledAt: Date;
    reason?: string;
    refundAmount: number;
  }>;
  noShows: Array<{
    reservationId: string;
    guestName: string;
    roomType: string;
    expectedCheckIn: Date;
    chargeAmount: number;
  }>;
  inHouseGuests: Array<{
    reservationId: string;
    guestName: string;
    roomNumber: string;
    checkInDate: Date;
    checkOutDate: Date;
    nights: number;
  }>;
}

// Export Prisma enums for convenience
export {
  ReportCategory,
  ReportType,
  ReportStatus,
  ExportFormat,
  ScheduleFrequency
};
