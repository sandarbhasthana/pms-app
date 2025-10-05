/**
 * Business Rules Service
 *
 * Database operations and business logic for managing business rules
 */

import { prisma } from "@/lib/prisma";
import { BusinessRuleCategory, Prisma } from "@prisma/client";
import {
  BusinessRuleDefinition,
  RuleExecutionResult,
  RuleExecutionContext,
  RulePerformanceMetrics,
  RuleValidationResult,
  RuleCondition,
  RuleAction
} from "@/types/business-rules";

export class BusinessRulesService {
  /**
   * Create a new business rule
   */
  async createRule(
    rule: Omit<BusinessRuleDefinition, "id">
  ): Promise<BusinessRuleDefinition> {
    const validation = this.validateRule(rule);
    if (!validation.isValid) {
      throw new Error(
        `Rule validation failed: ${validation.errors.join(", ")}`
      );
    }

    const created = await prisma.businessRule.create({
      data: {
        name: rule.name,
        description: rule.description,
        category: rule.category,
        priority: rule.priority,
        isActive: rule.isActive,
        isAIGenerated: rule.isAIGenerated || false,
        propertyId: rule.propertyId,
        organizationId: rule.organizationId,
        createdBy: rule.createdBy,
        conditions: JSON.parse(
          JSON.stringify(rule.conditions)
        ) as Prisma.InputJsonValue,
        actions: JSON.parse(
          JSON.stringify(rule.actions)
        ) as Prisma.InputJsonValue,
        metadata: (rule.metadata as Prisma.InputJsonValue) ?? undefined
      },
      include: {
        organization: { select: { name: true } },
        property: { select: { name: true } },
        creator: { select: { name: true, email: true } }
      }
    });

    return this.mapPrismaToRule(created);
  }

  /**
   * Update an existing business rule
   */
  async updateRule(
    id: string,
    updates: Partial<BusinessRuleDefinition>
  ): Promise<BusinessRuleDefinition> {
    const existing = await prisma.businessRule.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Rule with id ${id} not found`);
    }

    const updatedRule = { ...existing, ...updates };
    const validation = this.validateRule(updatedRule as BusinessRuleDefinition);
    if (!validation.isValid) {
      throw new Error(
        `Rule validation failed: ${validation.errors.join(", ")}`
      );
    }

    const updated = await prisma.businessRule.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        category: updates.category,
        priority: updates.priority,
        isActive: updates.isActive,
        propertyId: updates.propertyId,
        updatedBy: updates.updatedBy,
        conditions: updates.conditions
          ? (JSON.parse(
              JSON.stringify(updates.conditions)
            ) as Prisma.InputJsonValue)
          : undefined,
        actions: updates.actions
          ? (JSON.parse(
              JSON.stringify(updates.actions)
            ) as Prisma.InputJsonValue)
          : undefined,
        metadata: updates.metadata
          ? (JSON.parse(
              JSON.stringify(updates.metadata)
            ) as Prisma.InputJsonValue)
          : undefined
      },
      include: {
        organization: { select: { name: true } },
        property: { select: { name: true } },
        creator: { select: { name: true, email: true } },
        updater: { select: { name: true, email: true } }
      }
    });

    return this.mapPrismaToRule(updated);
  }

  /**
   * Get rules by organization and optional property
   */
  async getRules(
    organizationId: string,
    propertyId?: string,
    category?: BusinessRuleCategory,
    isActive?: boolean
  ): Promise<BusinessRuleDefinition[]> {
    const rules = await prisma.businessRule.findMany({
      where: {
        organizationId,
        ...(propertyId && { propertyId }),
        ...(category && { category }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        organization: { select: { name: true } },
        property: { select: { name: true } },
        creator: { select: { name: true, email: true } },
        updater: { select: { name: true, email: true } }
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }]
    });

    return rules.map(this.mapPrismaToRule);
  }

  /**
   * Get a single rule by ID
   */
  async getRule(id: string): Promise<BusinessRuleDefinition | null> {
    const rule = await prisma.businessRule.findUnique({
      where: { id },
      include: {
        organization: { select: { name: true } },
        property: { select: { name: true } },
        creator: { select: { name: true, email: true } },
        updater: { select: { name: true, email: true } }
      }
    });

    return rule ? this.mapPrismaToRule(rule) : null;
  }

  /**
   * Delete a business rule
   */
  async deleteRule(id: string): Promise<void> {
    await prisma.businessRule.delete({ where: { id } });
  }

  /**
   * Record rule execution
   */
  async recordExecution(execution: RuleExecutionResult): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Create execution record
      await tx.ruleExecution.create({
        data: {
          ruleId: execution.ruleId,
          executedAt: new Date(),
          context: JSON.parse(
            JSON.stringify(execution.context)
          ) as Prisma.InputJsonValue,
          result: JSON.parse(
            JSON.stringify({
              executed: execution.executed,
              success: execution.success,
              executionTimeMs: execution.executionTimeMs,
              conditionsMatched: execution.conditionsMatched,
              actionsApplied: execution.actionsApplied,
              error: execution.error
            })
          ) as Prisma.InputJsonValue,
          success: execution.success,
          errorMessage: execution.error,
          executionTimeMs: execution.executionTimeMs
        }
      });

      // Update performance metrics
      const performance = await tx.rulePerformance.upsert({
        where: { ruleId: execution.ruleId },
        create: {
          ruleId: execution.ruleId,
          totalExecutions: 1,
          successfulExecutions: execution.success ? 1 : 0,
          failedExecutions: execution.success ? 0 : 1,
          avgExecutionTimeMs: execution.executionTimeMs,
          lastExecutedAt: new Date()
        },
        update: {
          totalExecutions: { increment: 1 },
          successfulExecutions: execution.success
            ? { increment: 1 }
            : undefined,
          failedExecutions: execution.success ? undefined : { increment: 1 },
          lastExecutedAt: new Date()
        }
      });

      // Update average execution time
      if (performance) {
        const newAvgTime =
          ((performance.avgExecutionTimeMs || 0) *
            (performance.totalExecutions - 1) +
            execution.executionTimeMs) /
          performance.totalExecutions;

        await tx.rulePerformance.update({
          where: { ruleId: execution.ruleId },
          data: { avgExecutionTimeMs: newAvgTime }
        });
      }
    });
  }

  /**
   * Get rule performance metrics
   */
  async getRulePerformance(
    ruleId: string
  ): Promise<RulePerformanceMetrics | null> {
    const performance = await prisma.rulePerformance.findUnique({
      where: { ruleId },
      include: {
        rule: { select: { name: true } }
      }
    });

    if (!performance) return null;

    const successRate =
      performance.totalExecutions > 0
        ? (performance.successfulExecutions / performance.totalExecutions) * 100
        : 0;

    const avgRevenueImpactPerExecution =
      performance.totalExecutions > 0
        ? (performance.totalRevenueImpact || 0) / performance.totalExecutions
        : 0;

    return {
      ruleId: performance.ruleId,
      totalExecutions: performance.totalExecutions,
      successfulExecutions: performance.successfulExecutions,
      failedExecutions: performance.failedExecutions,
      successRate,
      avgExecutionTimeMs: performance.avgExecutionTimeMs || 0,
      totalRevenueImpact: performance.totalRevenueImpact || 0,
      avgRevenueImpactPerExecution,
      lastExecutedAt: performance.lastExecutedAt || undefined,
      performanceTrend: "stable" // TODO: Calculate trend based on historical data
    };
  }

  /**
   * Validate a business rule
   */
  private validateRule(rule: BusinessRuleDefinition): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!rule.name || rule.name.trim().length === 0) {
      errors.push("Rule name is required");
    }

    if (!rule.organizationId) {
      errors.push("Organization ID is required");
    }

    if (!rule.createdBy) {
      errors.push("Creator ID is required");
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      errors.push("At least one condition is required");
    }

    if (!rule.actions || rule.actions.length === 0) {
      errors.push("At least one action is required");
    }

    // Priority validation
    if (rule.priority < 1 || rule.priority > 1000) {
      warnings.push("Priority should be between 1 and 1000");
    }

    // Condition validation
    rule.conditions?.forEach((condition, index) => {
      if (!condition.type) {
        errors.push(`Condition ${index + 1}: Type is required`);
      }
      if (!condition.operator) {
        errors.push(`Condition ${index + 1}: Operator is required`);
      }
      if (condition.value === undefined || condition.value === null) {
        errors.push(`Condition ${index + 1}: Value is required`);
      }
    });

    // Action validation
    rule.actions?.forEach((action, index) => {
      if (!action.type) {
        errors.push(`Action ${index + 1}: Type is required`);
      }
      if (action.value === undefined || action.value === null) {
        errors.push(`Action ${index + 1}: Value is required`);
      }
    });

    // Performance suggestions
    if (rule.conditions && rule.conditions.length > 5) {
      suggestions.push(
        "Consider simplifying rules with many conditions for better performance"
      );
    }

    if (rule.actions && rule.actions.length > 3) {
      suggestions.push("Consider splitting complex rules with many actions");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Map Prisma result to BusinessRuleDefinition
   */
  private mapPrismaToRule(
    prismaRule: Record<string, unknown>
  ): BusinessRuleDefinition {
    return {
      id: prismaRule.id as string,
      name: prismaRule.name as string,
      description: (prismaRule.description as string | null) || undefined,
      category: prismaRule.category as BusinessRuleCategory,
      priority: prismaRule.priority as number,
      isActive: prismaRule.isActive as boolean,
      isAIGenerated: prismaRule.isAIGenerated as boolean,
      propertyId: (prismaRule.propertyId as string | null) || undefined,
      organizationId: prismaRule.organizationId as string,
      createdBy: prismaRule.createdBy as string,
      updatedBy: (prismaRule.updatedBy as string | null) || undefined,
      conditions: Array.isArray(prismaRule.conditions)
        ? (prismaRule.conditions as RuleCondition[])
        : [],
      actions: Array.isArray(prismaRule.actions)
        ? (prismaRule.actions as RuleAction[])
        : [],
      metadata:
        (prismaRule.metadata as Record<string, unknown> | null) || undefined
    };
  }

  /**
   * Bulk operations
   */
  async bulkUpdateRules(
    ruleIds: string[],
    updates: Partial<BusinessRuleDefinition>
  ): Promise<number> {
    const result = await prisma.businessRule.updateMany({
      where: { id: { in: ruleIds } },
      data: {
        isActive: updates.isActive,
        priority: updates.priority,
        updatedBy: updates.updatedBy
      }
    });

    return result.count;
  }

  /**
   * Get rule execution history
   */
  async getRuleExecutions(
    ruleId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<
    Array<{
      id: string;
      ruleId: string;
      executedAt: Date;
      context: RuleExecutionContext;
      result: Record<string, unknown>;
      success: boolean;
      errorMessage: string | null;
      executionTimeMs: number | null;
    }>
  > {
    const executions = await prisma.ruleExecution.findMany({
      where: { ruleId },
      orderBy: { executedAt: "desc" },
      take: limit,
      skip: offset
    });

    return executions.map((execution) => ({
      id: execution.id,
      ruleId: execution.ruleId,
      executedAt: execution.executedAt,
      context: execution.context as RuleExecutionContext,
      result: execution.result as Record<string, unknown>,
      success: execution.success,
      errorMessage: execution.errorMessage,
      executionTimeMs: execution.executionTimeMs
    }));
  }
}
