/**
 * Business Rules Engine
 *
 * Core engine for evaluating and executing business rules
 */

import {
  BusinessRuleDefinition,
  RuleCondition,
  RuleAction,
  RuleExecutionContext,
  RuleExecutionResult,
  RuleActionResult,
  PricingResult,
  RuleEngineConfig,
  RuleConditionType,
  RuleOperator,
  RuleActionType
} from "@/types/business-rules";

export class BusinessRulesEngine {
  private config: RuleEngineConfig;
  private rules: BusinessRuleDefinition[] = [];

  constructor(config?: Partial<RuleEngineConfig>) {
    this.config = {
      maxExecutionTimeMs: 5000,
      maxRulesPerExecution: 50,
      enablePerformanceTracking: true,
      enableDebugLogging: false,
      cacheResults: true,
      cacheTTLSeconds: 300,
      ...config
    };
  }

  /**
   * Load rules into the engine
   */
  loadRules(rules: BusinessRuleDefinition[]): void {
    this.rules = rules
      .filter((rule) => rule.isActive)
      .sort((a, b) => a.priority - b.priority);

    if (this.config.enableDebugLogging) {
      console.log(
        `🔧 BusinessRulesEngine: Loaded ${this.rules.length} active rules`
      );
    }
  }

  /**
   * Execute pricing rules and calculate final price
   */
  async calculatePrice(context: RuleExecutionContext): Promise<PricingResult> {
    const startTime = Date.now();
    const appliedRules: RuleExecutionResult[] = [];
    let currentPrice = context.currentPrice;

    try {
      // Get applicable rules for pricing
      const pricingRules = this.rules.filter(
        (rule) =>
          rule.category === "PRICING" && this.isRuleApplicable(rule, context)
      );

      if (this.config.enableDebugLogging) {
        console.log(`💰 Evaluating ${pricingRules.length} pricing rules`);
      }

      // Execute rules in priority order
      for (const rule of pricingRules.slice(
        0,
        this.config.maxRulesPerExecution
      )) {
        const ruleResult = await this.executeRule(rule, {
          ...context,
          currentPrice
        });

        appliedRules.push(ruleResult);

        if (ruleResult.success && ruleResult.executed) {
          // Apply price changes from successful rule execution
          const priceActions = ruleResult.actionsApplied.filter((action) =>
            this.isPriceAction(action.actionType)
          );

          for (const action of priceActions) {
            if (action.success && typeof action.newValue === "number") {
              currentPrice = action.newValue;
            }
          }
        }
      }

      const totalExecutionTime = Date.now() - startTime;
      const priceChange = currentPrice - context.currentPrice;
      const priceChangePercentage =
        context.currentPrice > 0
          ? (priceChange / context.currentPrice) * 100
          : 0;

      return {
        originalPrice: context.currentPrice,
        finalPrice: Math.max(0, Math.round(currentPrice * 100) / 100), // Ensure positive, round to 2 decimals
        priceChange,
        priceChangePercentage,
        appliedRules,
        totalExecutionTime,
        context
      };
    } catch (error) {
      console.error("❌ BusinessRulesEngine: Error calculating price:", error);

      return {
        originalPrice: context.currentPrice,
        finalPrice: context.currentPrice,
        priceChange: 0,
        priceChangePercentage: 0,
        appliedRules,
        totalExecutionTime: Date.now() - startTime,
        context
      };
    }
  }

  /**
   * Execute a single business rule
   */
  private async executeRule(
    rule: BusinessRuleDefinition,
    context: RuleExecutionContext
  ): Promise<RuleExecutionResult> {
    const startTime = Date.now();

    try {
      // Evaluate conditions
      const conditionsMatched = this.evaluateConditions(
        rule.conditions,
        context
      );

      if (!conditionsMatched) {
        return {
          ruleId: rule.id!,
          ruleName: rule.name,
          executed: false,
          success: true,
          executionTimeMs: Date.now() - startTime,
          conditionsMatched: false,
          actionsApplied: [],
          context
        };
      }

      // Execute actions
      const actionsApplied: RuleActionResult[] = [];

      for (const action of rule.actions) {
        const actionResult = await this.executeAction(action, context);
        actionsApplied.push(actionResult);
      }

      return {
        ruleId: rule.id!,
        ruleName: rule.name,
        executed: true,
        success: true,
        executionTimeMs: Date.now() - startTime,
        conditionsMatched: true,
        actionsApplied,
        context
      };
    } catch (error) {
      return {
        ruleId: rule.id!,
        ruleName: rule.name,
        executed: false,
        success: false,
        executionTimeMs: Date.now() - startTime,
        conditionsMatched: false,
        actionsApplied: [],
        error: (error as Error).message,
        context
      };
    }
  }

  /**
   * Evaluate all conditions for a rule
   */
  private evaluateConditions(
    conditions: RuleCondition[],
    context: RuleExecutionContext
  ): boolean {
    return conditions.every((condition) =>
      this.evaluateCondition(condition, context)
    );
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: RuleCondition,
    context: RuleExecutionContext
  ): boolean {
    const contextValue = this.getContextValue(condition.type, context);

    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    return this.compareValues(
      contextValue,
      condition.operator,
      condition.value
    );
  }

  /**
   * Get value from context based on condition type
   */
  private getContextValue(
    type: RuleConditionType,
    context: RuleExecutionContext
  ): unknown {
    switch (type) {
      case "occupancy":
        return context.occupancyRate;
      case "advance_booking":
        return context.advanceBookingDays;
      case "day_of_week":
        return context.dayOfWeek;
      case "season":
        return context.season;
      case "demand":
        return context.demandScore;
      case "competitor_price":
        return context.averageCompetitorPrice;
      case "weather":
        return context.weatherForecast;
      case "event":
        return context.localEvents;
      case "room_type":
        return context.roomTypeId;
      case "booking_source":
        return context.bookingSource;
      case "guest_type":
        return context.guestType;
      case "length_of_stay":
        return context.lengthOfStay;
      default:
        return context[type as string];
    }
  }

  /**
   * Type guard to check if a value has min/max properties
   */
  private hasMinMaxProperties(
    value: unknown
  ): value is { min: number; max: number } {
    return (
      typeof value === "object" &&
      value !== null &&
      "min" in value &&
      "max" in value &&
      typeof (value as Record<string, unknown>).min === "number" &&
      typeof (value as Record<string, unknown>).max === "number"
    );
  }

  /**
   * Compare values using the specified operator
   */
  private compareValues(
    contextValue: unknown,
    operator: RuleOperator,
    ruleValue: unknown
  ): boolean {
    switch (operator) {
      case "equals":
        return contextValue === ruleValue;
      case "not_equals":
        return contextValue !== ruleValue;
      case "greater_than":
        return Number(contextValue) > Number(ruleValue);
      case "less_than":
        return Number(contextValue) < Number(ruleValue);
      case "greater_than_or_equal":
        return Number(contextValue) >= Number(ruleValue);
      case "less_than_or_equal":
        return Number(contextValue) <= Number(ruleValue);
      case "between":
        const [min, max] = Array.isArray(ruleValue)
          ? ruleValue
          : this.hasMinMaxProperties(ruleValue)
          ? [ruleValue.min, ruleValue.max]
          : [0, 0]; // fallback values
        return (
          Number(contextValue) >= Number(min) &&
          Number(contextValue) <= Number(max)
        );
      case "not_between":
        const [notMin, notMax] = Array.isArray(ruleValue)
          ? ruleValue
          : this.hasMinMaxProperties(ruleValue)
          ? [ruleValue.min, ruleValue.max]
          : [0, 0]; // fallback values
        return (
          Number(contextValue) < Number(notMin) ||
          Number(contextValue) > Number(notMax)
        );
      case "in":
        return Array.isArray(ruleValue) && ruleValue.includes(contextValue);
      case "not_in":
        return Array.isArray(ruleValue) && !ruleValue.includes(contextValue);
      case "contains":
        return String(contextValue)
          .toLowerCase()
          .includes(String(ruleValue).toLowerCase());
      case "not_contains":
        return !String(contextValue)
          .toLowerCase()
          .includes(String(ruleValue).toLowerCase());
      case "starts_with":
        return String(contextValue)
          .toLowerCase()
          .startsWith(String(ruleValue).toLowerCase());
      case "ends_with":
        return String(contextValue)
          .toLowerCase()
          .endsWith(String(ruleValue).toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: RuleAction,
    context: RuleExecutionContext
  ): Promise<RuleActionResult> {
    const originalValue = context.currentPrice;

    try {
      let newValue = originalValue;

      switch (action.type) {
        case "multiply_price":
          newValue = originalValue * Number(action.value);
          break;
        case "add_amount":
          newValue = originalValue + Number(action.value);
          break;
        case "subtract_amount":
          newValue = originalValue - Number(action.value);
          break;
        case "set_price":
          newValue = Number(action.value);
          break;
        case "set_minimum_price":
          newValue = Math.max(originalValue, Number(action.value));
          break;
        case "set_maximum_price":
          newValue = Math.min(originalValue, Number(action.value));
          break;
        default:
          // Non-pricing actions would be handled here
          return {
            actionType: action.type,
            success: true,
            originalValue,
            newValue: originalValue
          };
      }

      return {
        actionType: action.type,
        success: true,
        originalValue,
        newValue: Math.max(0, newValue) // Ensure non-negative price
      };
    } catch (error) {
      return {
        actionType: action.type,
        success: false,
        originalValue,
        newValue: originalValue,
        error: (error as Error).message
      };
    }
  }

  /**
   * Check if a rule is applicable to the current context
   */
  private isRuleApplicable(
    rule: BusinessRuleDefinition,
    context: RuleExecutionContext
  ): boolean {
    // Check property scope
    if (rule.propertyId && rule.propertyId !== context.propertyId) {
      return false;
    }

    // Check organization scope
    if (rule.organizationId !== context.organizationId) {
      return false;
    }

    return true;
  }

  /**
   * Check if an action type affects pricing
   */
  private isPriceAction(actionType: RuleActionType): boolean {
    return [
      "multiply_price",
      "add_amount",
      "subtract_amount",
      "set_price",
      "set_minimum_price",
      "set_maximum_price"
    ].includes(actionType);
  }
}
