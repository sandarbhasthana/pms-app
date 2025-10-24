// File: src/lib/reservation-status/business-rules-service.ts

import { ReservationStatus, PropertyRole } from "@prisma/client";
import {
  StatusTransitionContext,
  ValidationResult
} from "./advanced-validation";

// Business rule types for status management
export interface StatusBusinessRule {
  id: string;
  name: string;
  description: string;
  category:
    | "TIME_CONSTRAINT"
    | "PAYMENT_REQUIREMENT"
    | "ROLE_PERMISSION"
    | "ROOM_AVAILABILITY"
    | "GUEST_POLICY";
  priority: number;
  isActive: boolean;
  propertyId?: string;
  organizationId: string;
  conditions: StatusRuleCondition[];
  actions: StatusRuleAction[];
  metadata?: Record<string, unknown>;
}

export interface StatusRuleCondition {
  type:
    | "status_from"
    | "status_to"
    | "user_role"
    | "time_before_checkin"
    | "time_after_checkout"
    | "payment_status"
    | "payment_amount"
    | "room_status"
    | "guest_type"
    | "booking_source";
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "greater_than_or_equal"
    | "less_than_or_equal"
    | "in"
    | "not_in"
    | "contains";
  value: string | number | boolean | string[];
}

export interface StatusRuleAction {
  type:
    | "allow"
    | "deny"
    | "require_approval"
    | "add_warning"
    | "add_error"
    | "set_fee"
    | "send_notification";
  value?: string | number | boolean;
  message?: string;
}

// Pre-defined business rules for common scenarios
const DEFAULT_STATUS_BUSINESS_RULES: Omit<
  StatusBusinessRule,
  "id" | "organizationId"
>[] = [
  {
    name: "Early Check-in Approval Required",
    description:
      "Require manager approval for check-ins more than 4 hours before scheduled time",
    category: "TIME_CONSTRAINT",
    priority: 10,
    isActive: true,
    conditions: [
      {
        type: "status_to",
        operator: "equals",
        value: ReservationStatus.IN_HOUSE
      },
      { type: "time_before_checkin", operator: "greater_than", value: 4 }
    ],
    actions: [
      {
        type: "require_approval",
        message: "Early check-in requires manager approval"
      }
    ]
  },

  {
    name: "Payment Required for Confirmation",
    description: "Require minimum 20% payment before confirming reservation",
    category: "PAYMENT_REQUIREMENT",
    priority: 5,
    isActive: true,
    conditions: [
      {
        type: "status_to",
        operator: "equals",
        value: ReservationStatus.CONFIRMED
      },
      { type: "payment_amount", operator: "less_than", value: 0.2 }
    ],
    actions: [
      {
        type: "add_error",
        message: "Minimum 20% payment required for confirmation"
      }
    ]
  },

  {
    name: "Housekeeping Cannot Cancel Confirmed Reservations",
    description:
      "Prevent housekeeping staff from cancelling confirmed reservations",
    category: "ROLE_PERMISSION",
    priority: 8,
    isActive: true,
    conditions: [
      {
        type: "status_from",
        operator: "equals",
        value: ReservationStatus.CONFIRMED
      },
      {
        type: "status_to",
        operator: "equals",
        value: ReservationStatus.CANCELLED
      },
      {
        type: "user_role",
        operator: "equals",
        value: PropertyRole.HOUSEKEEPING
      }
    ],
    actions: [
      {
        type: "require_approval",
        message: "Housekeeping staff cannot cancel confirmed reservations"
      }
    ]
  },

  {
    name: "No-Show Grace Period",
    description: "Cannot mark as no-show until 6 hours after check-in time",
    category: "TIME_CONSTRAINT",
    priority: 7,
    isActive: true,
    conditions: [
      {
        type: "status_to",
        operator: "equals",
        value: ReservationStatus.NO_SHOW
      },
      { type: "time_before_checkin", operator: "less_than", value: -6 }
    ],
    actions: [
      {
        type: "add_error",
        message: "Cannot mark as no-show until 6 hours after check-in time"
      }
    ]
  },

  {
    name: "Full Payment Required for Checkout",
    description: "Require full payment before allowing checkout",
    category: "PAYMENT_REQUIREMENT",
    priority: 9,
    isActive: true,
    conditions: [
      {
        type: "status_to",
        operator: "equals",
        value: ReservationStatus.CHECKED_OUT
      },
      { type: "payment_status", operator: "not_equals", value: "PAID" }
    ],
    actions: [
      {
        type: "add_warning",
        message: "Full payment should be completed before checkout"
      }
    ]
  },

  {
    name: "Same-Day Cancellation Fee",
    description: "Apply cancellation fee for same-day cancellations",
    category: "GUEST_POLICY",
    priority: 6,
    isActive: true,
    conditions: [
      {
        type: "status_to",
        operator: "equals",
        value: ReservationStatus.CANCELLED
      },
      { type: "time_before_checkin", operator: "less_than", value: 24 }
    ],
    actions: [
      {
        type: "set_fee",
        value: 0.5,
        message: "50% cancellation fee applies for same-day cancellations"
      },
      {
        type: "add_warning",
        message: "Same-day cancellation fee will be applied"
      }
    ]
  },

  {
    name: "VIP Guest Priority Check-in",
    description: "Allow early check-in for VIP guests without approval",
    category: "GUEST_POLICY",
    priority: 15,
    isActive: true,
    conditions: [
      {
        type: "status_to",
        operator: "equals",
        value: ReservationStatus.IN_HOUSE
      },
      { type: "guest_type", operator: "equals", value: "VIP" }
    ],
    actions: [{ type: "allow", message: "VIP guest early check-in approved" }]
  },

  {
    name: "Corporate Booking Flexible Cancellation",
    description: "Allow flexible cancellation for corporate bookings",
    category: "GUEST_POLICY",
    priority: 12,
    isActive: true,
    conditions: [
      {
        type: "status_to",
        operator: "equals",
        value: ReservationStatus.CANCELLED
      },
      { type: "booking_source", operator: "equals", value: "CORPORATE" }
    ],
    actions: [
      { type: "allow", message: "Corporate booking cancellation approved" }
    ]
  }
];

/**
 * Business Rules Service for Reservation Status Management
 */
export class StatusBusinessRulesService {
  /**
   * Initialize default business rules for an organization
   */
  async initializeDefaultRules(
    organizationId: string
  ): Promise<StatusBusinessRule[]> {
    const rules: StatusBusinessRule[] = [];

    for (const defaultRule of DEFAULT_STATUS_BUSINESS_RULES) {
      const rule: StatusBusinessRule = {
        ...defaultRule,
        id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        organizationId
      };
      rules.push(rule);
    }

    // Store rules in database (if you have a business rules table)
    // For now, we'll return the in-memory rules
    return rules;
  }

  /**
   * Get active business rules for an organization/property
   */
  async getActiveRules(
    organizationId: string,
    propertyId?: string
  ): Promise<StatusBusinessRule[]> {
    // In a real implementation, this would fetch from database
    // For now, return default rules
    const rules = await this.initializeDefaultRules(organizationId);

    return rules
      .filter((rule) => rule.isActive)
      .filter((rule) => !rule.propertyId || rule.propertyId === propertyId)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Evaluate business rules against a status transition context
   */
  async evaluateRules(
    context: StatusTransitionContext,
    rules?: StatusBusinessRule[]
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresApproval: false,
      businessRuleViolations: [],
      dataIntegrityIssues: []
    };

    // Get rules if not provided
    if (!rules) {
      rules = await this.getActiveRules(
        context.organizationId,
        context.propertyId
      );
    }

    // Evaluate each rule
    for (const rule of rules) {
      const ruleResult = await this.evaluateRule(rule, context);

      if (ruleResult.applies) {
        // Apply rule actions
        for (const action of rule.actions) {
          this.applyRuleAction(action, result, rule);
        }
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Evaluate a single business rule
   */
  private async evaluateRule(
    rule: StatusBusinessRule,
    context: StatusTransitionContext
  ): Promise<{ applies: boolean; reason?: string }> {
    // Skip approval requirement for PROPERTY_MGR and above
    // Note: ORG_ADMIN and SUPER_ADMIN are mapped to PROPERTY_MGR in the API
    if (
      rule.name === "Early Check-in Approval Required" &&
      context.userRole === PropertyRole.PROPERTY_MGR
    ) {
      return {
        applies: false,
        reason: "User has sufficient permissions to bypass approval"
      };
    }

    // Check if all conditions are met
    for (const condition of rule.conditions) {
      const conditionMet = await this.evaluateCondition(condition, context);
      if (!conditionMet) {
        return {
          applies: false,
          reason: `Condition not met: ${condition.type}`
        };
      }
    }

    return { applies: true };
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: StatusRuleCondition,
    context: StatusTransitionContext
  ): Promise<boolean> {
    let actualValue: string | number | boolean | null | undefined;

    // Get actual value based on condition type
    switch (condition.type) {
      case "status_from":
        actualValue = context.currentStatus;
        break;
      case "status_to":
        actualValue = context.newStatus;
        break;
      case "user_role":
        actualValue = context.userRole;
        break;
      case "time_before_checkin":
        if (context.reservation) {
          const now = new Date();
          const checkIn = new Date(context.reservation.checkIn);
          actualValue = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60); // Hours
        }
        break;
      case "time_after_checkout":
        if (context.reservation) {
          const now = new Date();
          const checkOut = new Date(context.reservation.checkOut);
          actualValue = (now.getTime() - checkOut.getTime()) / (1000 * 60 * 60); // Hours
        }
        break;
      case "payment_status":
        actualValue = context.reservation?.paymentStatus;
        break;
      case "payment_amount":
        if (context.reservation) {
          actualValue = this.calculatePaymentPercentage(context.reservation);
        }
        break;
      case "guest_type":
        // This would come from reservation metadata or guest profile
        actualValue = context.reservation ? "REGULAR" : "REGULAR"; // Placeholder
        break;
      case "booking_source":
        // This would come from reservation metadata
        actualValue = "DIRECT"; // Placeholder
        break;
      default:
        return false;
    }

    // Evaluate condition based on operator
    return this.evaluateOperator(
      actualValue,
      condition.operator,
      condition.value
    );
  }

  /**
   * Evaluate operator condition
   */
  private evaluateOperator(
    actualValue: string | number | boolean | null | undefined,
    operator: string,
    expectedValue: string | number | boolean | string[]
  ): boolean {
    // Handle null/undefined cases
    if (actualValue === null || actualValue === undefined) {
      return operator === "equals"
        ? expectedValue === null || expectedValue === undefined
        : false;
    }

    switch (operator) {
      case "equals":
        return actualValue === expectedValue;
      case "not_equals":
        return actualValue !== expectedValue;
      case "greater_than":
        return typeof actualValue === "number" &&
          typeof expectedValue === "number"
          ? actualValue > expectedValue
          : false;
      case "less_than":
        return typeof actualValue === "number" &&
          typeof expectedValue === "number"
          ? actualValue < expectedValue
          : false;
      case "greater_than_or_equal":
        return typeof actualValue === "number" &&
          typeof expectedValue === "number"
          ? actualValue >= expectedValue
          : false;
      case "less_than_or_equal":
        return typeof actualValue === "number" &&
          typeof expectedValue === "number"
          ? actualValue <= expectedValue
          : false;
      case "in":
        return (
          Array.isArray(expectedValue) &&
          expectedValue.includes(actualValue as string)
        );
      case "not_in":
        return (
          Array.isArray(expectedValue) &&
          !expectedValue.includes(actualValue as string)
        );
      case "contains":
        return typeof actualValue === "string" &&
          typeof expectedValue === "string"
          ? actualValue.includes(expectedValue)
          : false;
      default:
        return false;
    }
  }

  /**
   * Apply rule action to validation result
   */
  private applyRuleAction(
    action: StatusRuleAction,
    result: ValidationResult,
    rule: StatusBusinessRule
  ): void {
    switch (action.type) {
      case "allow":
        // Rule explicitly allows the transition
        break;
      case "deny":
        result.errors.push(action.message || `Rule violation: ${rule.name}`);
        break;
      case "require_approval":
        result.requiresApproval = true;
        result.approvalReason =
          action.message || `Approval required: ${rule.name}`;
        break;
      case "add_warning":
        result.warnings.push(action.message || `Warning: ${rule.name}`);
        break;
      case "add_error":
        result.errors.push(action.message || `Error: ${rule.name}`);
        break;
      case "set_fee":
        result.warnings.push(action.message || `Fee applies: ${rule.name}`);
        // In a real implementation, this would set fees in the reservation
        break;
      case "send_notification":
        result.warnings.push(
          action.message || `Notification will be sent: ${rule.name}`
        );
        // In a real implementation, this would trigger notifications
        break;
    }
  }

  /**
   * Calculate payment percentage
   */
  private calculatePaymentPercentage(
    reservation: StatusTransitionContext["reservation"]
  ): number {
    if (!reservation) return 0;

    // Calculate based on actual amounts if available
    if (reservation.depositAmount && reservation.paidAmount) {
      const percentage = reservation.paidAmount / reservation.depositAmount;
      console.log(`💰 Payment Percentage Calculation:`, {
        paidAmount: reservation.paidAmount,
        depositAmount: reservation.depositAmount,
        percentage: percentage.toFixed(2),
        paymentStatus: reservation.paymentStatus
      });
      return Math.min(percentage, 1.0); // Cap at 100%
    }

    // Fallback to paymentStatus if amounts are not available
    console.log(`💰 Payment Percentage (fallback):`, {
      paymentStatus: reservation.paymentStatus,
      paidAmount: reservation.paidAmount,
      depositAmount: reservation.depositAmount
    });
    switch (reservation.paymentStatus) {
      case "PAID":
        return 1.0;
      case "PARTIALLY_PAID":
        return 0.5; // Default assumption for partial payment
      case "UNPAID":
      default:
        return 0;
    }
  }

  /**
   * Create custom business rule
   */
  async createCustomRule(
    rule: Omit<StatusBusinessRule, "id">
  ): Promise<StatusBusinessRule> {
    const newRule: StatusBusinessRule = {
      ...rule,
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    };

    // In a real implementation, this would save to database
    return newRule;
  }

  /**
   * Update business rule
   */
  async updateRule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ruleId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _updates: Partial<StatusBusinessRule>
  ): Promise<StatusBusinessRule | null> {
    // In a real implementation, this would update in database
    return null;
  }

  /**
   * Delete business rule
   */
  async deleteRule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ruleId: string
  ): Promise<boolean> {
    // In a real implementation, this would delete from database
    return true;
  }
}

// Export singleton instance
export const statusBusinessRulesService = new StatusBusinessRulesService();
