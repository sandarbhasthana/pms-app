/**
 * Business Rules Pricing Integration
 *
 * Integration layer between business rules engine and existing pricing system
 */

import { format, isWeekend } from "date-fns";
import { BusinessRulesEngine } from "./engine";
import { BusinessRulesService } from "./service";
import { RuleExecutionContext, PricingResult } from "@/types/business-rules";
import { prisma } from "@/lib/prisma";

export class PricingIntegrationService {
  private rulesEngine: BusinessRulesEngine;
  private rulesService: BusinessRulesService;

  constructor() {
    this.rulesEngine = new BusinessRulesEngine({
      enablePerformanceTracking: true,
      enableDebugLogging: process.env.NODE_ENV === "development"
    });
    this.rulesService = new BusinessRulesService();
  }

  /**
   * Calculate enhanced pricing with business rules
   */
  async calculateEnhancedPrice(params: {
    roomTypeId: string;
    propertyId: string;
    organizationId: string;
    date: Date;
    lengthOfStay?: number;
    guestType?: string;
    bookingSource?: string;
    advanceBookingDays?: number;
  }): Promise<PricingResult> {
    try {
      // Get base price from existing pricing system
      const basePrice = await this.getBasePrice(params.roomTypeId, params.date);

      // Get current occupancy rate
      const occupancyRate = await this.getCurrentOccupancy(
        params.propertyId,
        params.date
      );

      // Get demand score (simplified calculation)
      const demandScore = await this.calculateDemandScore(
        params.propertyId,
        params.date
      );

      // Load active business rules for this organization/property
      const rules = await this.rulesService.getRules(
        params.organizationId,
        params.propertyId,
        "PRICING",
        true // active only
      );

      this.rulesEngine.loadRules(rules);

      // Create execution context
      const context: RuleExecutionContext = {
        date: params.date,
        dayOfWeek: format(params.date, "eeee").toLowerCase(),
        isWeekend: isWeekend(params.date),
        season: this.getSeason(params.date),
        propertyId: params.propertyId,
        organizationId: params.organizationId,
        roomTypeId: params.roomTypeId,
        advanceBookingDays:
          params.advanceBookingDays ||
          this.calculateAdvanceBookingDays(params.date),
        lengthOfStay: params.lengthOfStay || 1,
        guestType: params.guestType,
        bookingSource: params.bookingSource || "direct",
        occupancyRate,
        demandScore,
        currentPrice: basePrice,
        basePrice
      };

      // Calculate enhanced price using business rules
      const pricingResult = await this.rulesEngine.calculatePrice(context);

      // Record rule executions for performance tracking
      for (const ruleResult of pricingResult.appliedRules) {
        if (ruleResult.executed) {
          await this.rulesService.recordExecution(ruleResult);
        }
      }

      return pricingResult;
    } catch (error) {
      console.error("❌ Error calculating enhanced price:", error);

      // Fallback to base price
      const basePrice = await this.getBasePrice(params.roomTypeId, params.date);
      return {
        originalPrice: basePrice,
        finalPrice: basePrice,
        priceChange: 0,
        priceChangePercentage: 0,
        appliedRules: [],
        totalExecutionTime: 0,
        context: {} as RuleExecutionContext
      };
    }
  }

  /**
   * Get base price from existing pricing system
   */
  private async getBasePrice(roomTypeId: string, date: Date): Promise<number> {
    try {
      const roomType = await prisma.roomType.findUnique({
        where: { id: roomTypeId },
        include: {
          dailyRates: {
            where: {
              date: {
                gte: new Date(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate()
                ),
                lt: new Date(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate() + 1
                )
              }
            }
          },
          seasonalRates: {
            where: {
              startDate: { lte: date },
              endDate: { gte: date }
            }
          }
        }
      });

      if (!roomType) {
        throw new Error(`Room type ${roomTypeId} not found`);
      }

      const isWeekendDate = isWeekend(date);

      // Check for daily rate override
      const dailyOverride = roomType.dailyRates[0];
      if (dailyOverride) {
        return dailyOverride.basePrice;
      }

      // Check for seasonal rate
      const seasonalRate = roomType.seasonalRates[0];
      const basePrice = isWeekendDate
        ? roomType.weekendPrice || roomType.basePrice
        : roomType.weekdayPrice || roomType.basePrice;

      if (seasonalRate && basePrice) {
        return basePrice * seasonalRate.multiplier;
      }

      return basePrice || roomType.basePrice || 2000;
    } catch (error) {
      console.error("❌ Error getting base price:", error);
      return 2000; // Fallback price
    }
  }

  /**
   * Get current occupancy rate for a property on a specific date
   */
  private async getCurrentOccupancy(
    propertyId: string,
    date: Date
  ): Promise<number> {
    try {
      const startOfDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      // Get total rooms for the property
      const totalRooms = await prisma.room.count({
        where: {
          propertyId
        }
      });

      if (totalRooms === 0) return 0;

      // Get occupied rooms for the date
      const occupiedRooms = await prisma.reservation.count({
        where: {
          room: { propertyId },
          checkedInAt: { lte: startOfDay },
          checkedOutAt: { gt: startOfDay },
          status: {
            in: ["CONFIRMED", "IN_HOUSE"]
          }
        }
      });

      return Math.round((occupiedRooms / totalRooms) * 100);
    } catch (error) {
      console.error("❌ Error calculating occupancy:", error);
      return 50; // Fallback occupancy
    }
  }

  /**
   * Calculate demand score based on booking patterns
   */
  private async calculateDemandScore(
    propertyId: string,
    date: Date
  ): Promise<number> {
    try {
      const startDate = new Date(date);
      startDate.setDate(startDate.getDate() - 30); // Look back 30 days

      const bookingCount = await prisma.reservation.count({
        where: {
          room: { propertyId },
          createdAt: { gte: startDate },
          status: { not: "CANCELLED" }
        }
      });

      // Simple demand score: more bookings = higher demand
      // Scale from 0-100 based on booking volume
      return Math.min(100, Math.round(bookingCount * 2));
    } catch (error) {
      console.error("❌ Error calculating demand score:", error);
      return 50; // Fallback demand score
    }
  }

  /**
   * Determine season based on date
   */
  private getSeason(date: Date): string {
    const month = date.getMonth() + 1; // 1-12

    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
  }

  /**
   * Calculate advance booking days
   */
  private calculateAdvanceBookingDays(checkInDate: Date): number {
    const today = new Date();
    const diffTime = checkInDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get pricing comparison with and without rules
   */
  async getPricingComparison(params: {
    roomTypeId: string;
    propertyId: string;
    organizationId: string;
    date: Date;
    lengthOfStay?: number;
    guestType?: string;
    bookingSource?: string;
  }) {
    const basePrice = await this.getBasePrice(params.roomTypeId, params.date);
    const enhancedPricing = await this.calculateEnhancedPrice(params);

    return {
      basePrice,
      enhancedPrice: enhancedPricing.finalPrice,
      savings: basePrice - enhancedPricing.finalPrice,
      savingsPercentage:
        basePrice > 0
          ? ((basePrice - enhancedPricing.finalPrice) / basePrice) * 100
          : 0,
      appliedRules: enhancedPricing.appliedRules.map((rule) => ({
        name: rule.ruleName,
        executed: rule.executed,
        success: rule.success
      })),
      executionTime: enhancedPricing.totalExecutionTime
    };
  }

  /**
   * Test rules against sample scenarios
   */
  async testRulesWithScenarios(
    organizationId: string,
    propertyId: string,
    roomTypeId: string
  ) {
    const testScenarios = [
      {
        name: "Weekend High Occupancy",
        date: new Date("2024-12-07"), // Saturday
        occupancyOverride: 85,
        expectedIncrease: true
      },
      {
        name: "Last Minute Low Occupancy",
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        occupancyOverride: 45,
        expectedDecrease: true
      },
      {
        name: "Early Bird Booking",
        date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        expectedDecrease: true
      }
    ];

    const results = [];

    for (const scenario of testScenarios) {
      const comparison = await this.getPricingComparison({
        roomTypeId,
        propertyId,
        organizationId,
        date: scenario.date
      });

      results.push({
        scenario: scenario.name,
        basePrice: comparison.basePrice,
        enhancedPrice: comparison.enhancedPrice,
        change: comparison.enhancedPrice - comparison.basePrice,
        changePercentage:
          ((comparison.enhancedPrice - comparison.basePrice) /
            comparison.basePrice) *
          100,
        appliedRules: comparison.appliedRules,
        expectedResult: scenario.expectedIncrease
          ? "increase"
          : scenario.expectedDecrease
          ? "decrease"
          : "no change"
      });
    }

    return results;
  }
}
