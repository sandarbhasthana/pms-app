/**
 * Business Rules Engine Types
 *
 * Type definitions for the dynamic pricing and automation rules system
 */

import { BusinessRuleCategory } from "@prisma/client";

// Core rule condition types
export type RuleConditionType =
  | "occupancy"
  | "advance_booking"
  | "day_of_week"
  | "season"
  | "demand"
  | "competitor_price"
  | "weather"
  | "event"
  | "room_type"
  | "booking_source"
  | "guest_type"
  | "length_of_stay"
  | "time_of_day"
  | "market_segment";

// Condition operators
export type RuleOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "between"
  | "not_between"
  | "in"
  | "not_in"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with";

// Rule action types
export type RuleActionType =
  | "multiply_price"
  | "add_amount"
  | "subtract_amount"
  | "set_price"
  | "set_minimum_price"
  | "set_maximum_price"
  | "set_availability"
  | "add_availability"
  | "subtract_availability"
  | "set_restriction"
  | "send_notification"
  | "trigger_automation"
  | "log_event";

// Rule condition definition
export interface RuleCondition {
  id?: string;
  type: RuleConditionType;
  operator: RuleOperator;
  value:
    | string
    | number
    | boolean
    | string[]
    | number[]
    | Record<string, unknown>; // Can be string, number, array, object
  field?: string; // Optional field specification
  metadata?: Record<string, unknown>;
}

// Rule action definition
export interface RuleAction {
  id?: string;
  type: RuleActionType;
  value: string | number | boolean | Record<string, unknown>; // Can be string, number, object
  target?: string; // Target field or entity
  metadata?: Record<string, unknown>;
}

// Complete business rule definition
export interface BusinessRuleDefinition {
  id?: string;
  name: string;
  description?: string;
  category: BusinessRuleCategory;
  priority: number;
  isActive: boolean;
  isAIGenerated?: boolean;
  propertyId?: string;
  organizationId: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  metadata?: Record<string, unknown>;
  createdBy: string;
  updatedBy?: string;
}

// Rule execution context
export interface RuleExecutionContext {
  // Date and time context
  date: Date;
  dayOfWeek: string;
  isWeekend: boolean;
  season: string;

  // Property context
  propertyId: string;
  organizationId: string;

  // Room context
  roomTypeId?: string;
  roomId?: string;

  // Booking context
  advanceBookingDays?: number;
  lengthOfStay?: number;
  guestType?: string;
  bookingSource?: string;
  marketSegment?: string;

  // Market context
  occupancyRate: number;
  demandScore: number;
  competitorPrices?: number[];
  averageCompetitorPrice?: number;

  // External context
  weatherForecast?: string;
  localEvents?: string[];

  // Current pricing context
  currentPrice: number;
  basePrice: number;

  // Additional context
  [key: string]:
    | string
    | number
    | boolean
    | Date
    | string[]
    | number[]
    | null
    | undefined;
}

// Rule execution result
export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  executed: boolean;
  success: boolean;
  executionTimeMs: number;
  conditionsMatched: boolean;
  actionsApplied: RuleActionResult[];
  error?: string;
  context: RuleExecutionContext;
  metadata?: Record<string, unknown>;
}

// Individual action result
export interface RuleActionResult {
  actionType: RuleActionType;
  success: boolean;
  originalValue: unknown;
  newValue: unknown;
  error?: string;
}

// Pricing calculation result
export interface PricingResult {
  originalPrice: number;
  finalPrice: number;
  priceChange: number;
  priceChangePercentage: number;
  appliedRules: RuleExecutionResult[];
  totalExecutionTime: number;
  context: RuleExecutionContext;
}

// Rule performance metrics
export interface RulePerformanceMetrics {
  ruleId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgExecutionTimeMs: number;
  totalRevenueImpact: number;
  avgRevenueImpactPerExecution: number;
  lastExecutedAt?: Date;
  performanceTrend: "improving" | "declining" | "stable";
}

// Rule validation result
export interface RuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Rule test scenario
export interface RuleTestScenario {
  name: string;
  description?: string;
  context: RuleExecutionContext;
  expectedResult?: Partial<PricingResult>;
}

// Bulk rule operation
export interface BulkRuleOperation {
  operation: "activate" | "deactivate" | "delete" | "update_priority";
  ruleIds: string[];
  parameters?: Record<string, unknown>;
}

// Rule template for common scenarios
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: BusinessRuleCategory;
  template: Omit<BusinessRuleDefinition, "id" | "organizationId" | "createdBy">;
  variables: RuleTemplateVariable[];
}

// Template variable definition
export interface RuleTemplateVariable {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  defaultValue?: unknown;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: unknown[];
  };
}

// Rule engine configuration
export interface RuleEngineConfig {
  maxExecutionTimeMs: number;
  maxRulesPerExecution: number;
  enablePerformanceTracking: boolean;
  enableDebugLogging: boolean;
  cacheResults: boolean;
  cacheTTLSeconds: number;
}

// Export utility types
export type RuleConditionValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | { min: number; max: number };
export type RuleActionValue = string | number | boolean | object;
