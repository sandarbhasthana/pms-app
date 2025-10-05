/**
 * Business Rules Test API
 *
 * API endpoint for testing business rules engine functionality
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BusinessRulesService } from "@/lib/business-rules/service";
import { PricingIntegrationService } from "@/lib/business-rules/pricing-integration";
import { createSampleRulesForOrganization } from "@/lib/business-rules/sample-rules";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "test";
    const organizationId = searchParams.get("organizationId");
    const propertyId = searchParams.get("propertyId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const rulesService = new BusinessRulesService();
    const pricingService = new PricingIntegrationService();

    switch (action) {
      case "setup":
        return await setupSampleRules(
          organizationId,
          propertyId,
          session.user.id,
          rulesService
        );

      case "test":
        return await testPricingRules(
          organizationId,
          propertyId,
          pricingService
        );

      case "rules":
        return await getRules(organizationId, propertyId, rulesService);

      case "performance":
        return await getRulePerformance(organizationId, rulesService);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("❌ Business Rules Test API Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function setupSampleRules(
  organizationId: string,
  propertyId: string | null,
  userId: string,
  rulesService: BusinessRulesService
) {
  try {
    // Check if rules already exist
    const existingRules = await rulesService.getRules(
      organizationId,
      propertyId || undefined
    );
    if (existingRules.length > 0) {
      return NextResponse.json({
        message: "Sample rules already exist",
        existingRulesCount: existingRules.length,
        rules: existingRules.map((r) => ({
          id: r.id,
          name: r.name,
          isActive: r.isActive
        }))
      });
    }

    // Create sample rules
    const sampleRules = createSampleRulesForOrganization(
      organizationId,
      userId,
      propertyId || undefined
    );

    const createdRules = [];
    for (const rule of sampleRules) {
      const created = await rulesService.createRule(rule);
      createdRules.push({
        id: created.id,
        name: created.name,
        category: created.category,
        priority: created.priority,
        isActive: created.isActive
      });
    }

    return NextResponse.json({
      message: "Sample rules created successfully",
      createdRulesCount: createdRules.length,
      rules: createdRules
    });
  } catch (error) {
    console.error("❌ Error setting up sample rules:", error);
    return NextResponse.json(
      {
        error: "Failed to setup sample rules",
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

async function testPricingRules(
  organizationId: string,
  propertyId: string | null,
  pricingService: PricingIntegrationService
) {
  try {
    // Get a sample room type for testing
    const roomType = await prisma.roomType.findFirst({
      where: {
        organizationId,
        ...(propertyId && { propertyId })
      }
    });

    if (!roomType) {
      return NextResponse.json(
        {
          error: "No room types found for testing",
          suggestion: "Create a room type first"
        },
        { status: 404 }
      );
    }

    // Test various pricing scenarios
    const testResults = await pricingService.testRulesWithScenarios(
      organizationId,
      propertyId || roomType.propertyId,
      roomType.id
    );

    // Get current pricing for today
    const todayPricing = await pricingService.getPricingComparison({
      roomTypeId: roomType.id,
      propertyId: propertyId || roomType.propertyId,
      organizationId,
      date: new Date()
    });

    return NextResponse.json({
      message: "Business rules testing completed",
      roomType: {
        id: roomType.id,
        name: roomType.name,
        basePrice: roomType.basePrice
      },
      todayPricing,
      scenarioTests: testResults,
      summary: {
        totalScenarios: testResults.length,
        rulesApplied: testResults.reduce(
          (sum, result) => sum + result.appliedRules.length,
          0
        ),
        avgPriceChange:
          testResults.reduce(
            (sum, result) => sum + result.changePercentage,
            0
          ) / testResults.length
      }
    });
  } catch (error) {
    console.error("❌ Error testing pricing rules:", error);
    return NextResponse.json(
      {
        error: "Failed to test pricing rules",
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

async function getRules(
  organizationId: string,
  propertyId: string | null,
  rulesService: BusinessRulesService
) {
  try {
    const rules = await rulesService.getRules(
      organizationId,
      propertyId || undefined,
      "PRICING"
    );

    const rulesSummary = rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: rule.category,
      priority: rule.priority,
      isActive: rule.isActive,
      isAIGenerated: rule.isAIGenerated,
      conditionsCount: rule.conditions.length,
      actionsCount: rule.actions.length,
      metadata: rule.metadata
    }));

    return NextResponse.json({
      message: "Business rules retrieved successfully",
      totalRules: rules.length,
      activeRules: rules.filter((r) => r.isActive).length,
      inactiveRules: rules.filter((r) => !r.isActive).length,
      aiGeneratedRules: rules.filter((r) => r.isAIGenerated).length,
      rules: rulesSummary
    });
  } catch (error) {
    console.error("❌ Error getting rules:", error);
    return NextResponse.json(
      { error: "Failed to get rules", details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function getRulePerformance(
  organizationId: string,
  rulesService: BusinessRulesService
) {
  try {
    const rules = await rulesService.getRules(organizationId);
    const performanceData = [];

    for (const rule of rules) {
      if (rule.id) {
        const performance = await rulesService.getRulePerformance(rule.id);
        if (performance) {
          performanceData.push({
            ruleName: rule.name,
            ...performance
          });
        }
      }
    }

    const totalExecutions = performanceData.reduce(
      (sum, p) => sum + p.totalExecutions,
      0
    );
    const totalSuccessful = performanceData.reduce(
      (sum, p) => sum + p.successfulExecutions,
      0
    );
    const overallSuccessRate =
      totalExecutions > 0 ? (totalSuccessful / totalExecutions) * 100 : 0;

    return NextResponse.json({
      message: "Rule performance data retrieved successfully",
      summary: {
        totalRules: performanceData.length,
        totalExecutions,
        overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
        totalRevenueImpact: performanceData.reduce(
          (sum, p) => sum + p.totalRevenueImpact,
          0
        )
      },
      performance: performanceData.sort(
        (a, b) => b.totalExecutions - a.totalExecutions
      )
    });
  } catch (error) {
    console.error("❌ Error getting rule performance:", error);
    return NextResponse.json(
      {
        error: "Failed to get rule performance",
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, organizationId, propertyId, ruleData } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const rulesService = new BusinessRulesService();

    switch (action) {
      case "create":
        if (!ruleData) {
          return NextResponse.json(
            { error: "Rule data is required" },
            { status: 400 }
          );
        }

        const newRule = await rulesService.createRule({
          ...ruleData,
          organizationId,
          propertyId,
          createdBy: session.user.id
        });

        return NextResponse.json({
          message: "Rule created successfully",
          rule: {
            id: newRule.id,
            name: newRule.name,
            category: newRule.category,
            isActive: newRule.isActive
          }
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("❌ Business Rules POST API Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
