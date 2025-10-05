/**
 * Sample Business Rules
 * 
 * Pre-defined business rules for common hotel pricing scenarios
 */

import { BusinessRuleDefinition } from "@/types/business-rules";

export const sampleBusinessRules: Omit<BusinessRuleDefinition, 'id' | 'organizationId' | 'createdBy'>[] = [
  {
    name: "Weekend High Demand Pricing",
    description: "Increase prices by 25% on weekends when occupancy is above 80%",
    category: "PRICING",
    priority: 10,
    isActive: true,
    conditions: [
      {
        type: "day_of_week",
        operator: "in",
        value: ["saturday", "sunday"]
      },
      {
        type: "occupancy",
        operator: "greater_than",
        value: 80
      }
    ],
    actions: [
      {
        type: "multiply_price",
        value: 1.25
      }
    ],
    metadata: {
      description: "Capitalize on high weekend demand",
      category: "revenue_optimization"
    }
  },

  {
    name: "Last Minute Booking Discount",
    description: "Apply 15% discount for bookings made within 3 days when occupancy is below 60%",
    category: "PRICING",
    priority: 20,
    isActive: true,
    conditions: [
      {
        type: "advance_booking",
        operator: "less_than_or_equal",
        value: 3
      },
      {
        type: "occupancy",
        operator: "less_than",
        value: 60
      }
    ],
    actions: [
      {
        type: "multiply_price",
        value: 0.85
      }
    ],
    metadata: {
      description: "Fill empty rooms with last-minute discounts",
      category: "occupancy_optimization"
    }
  },

  {
    name: "Early Bird Discount",
    description: "Apply 10% discount for bookings made more than 30 days in advance",
    category: "PRICING",
    priority: 30,
    isActive: true,
    conditions: [
      {
        type: "advance_booking",
        operator: "greater_than",
        value: 30
      }
    ],
    actions: [
      {
        type: "multiply_price",
        value: 0.90
      }
    ],
    metadata: {
      description: "Encourage early bookings for better cash flow",
      category: "cash_flow_optimization"
    }
  },

  {
    name: "High Demand Surge Pricing",
    description: "Increase prices by 40% when occupancy exceeds 90%",
    category: "PRICING",
    priority: 5,
    isActive: true,
    conditions: [
      {
        type: "occupancy",
        operator: "greater_than",
        value: 90
      }
    ],
    actions: [
      {
        type: "multiply_price",
        value: 1.40
      }
    ],
    metadata: {
      description: "Maximize revenue during peak demand",
      category: "revenue_optimization"
    }
  },

  {
    name: "Competitive Price Matching",
    description: "Match competitor prices when they are 5% or more below our price",
    category: "PRICING",
    priority: 15,
    isActive: false, // Disabled by default as it requires competitor data
    conditions: [
      {
        type: "competitor_price",
        operator: "less_than",
        value: 0.95 // 95% of current price
      }
    ],
    actions: [
      {
        type: "multiply_price",
        value: 0.98 // Match but stay 2% above competitor
      }
    ],
    metadata: {
      description: "Stay competitive while maintaining margin",
      category: "competitive_strategy"
    }
  },

  {
    name: "Extended Stay Discount",
    description: "Apply 20% discount for stays longer than 7 nights",
    category: "PRICING",
    priority: 25,
    isActive: true,
    conditions: [
      {
        type: "length_of_stay",
        operator: "greater_than",
        value: 7
      }
    ],
    actions: [
      {
        type: "multiply_price",
        value: 0.80
      }
    ],
    metadata: {
      description: "Encourage longer stays for better occupancy",
      category: "occupancy_optimization"
    }
  },

  {
    name: "Low Season Pricing",
    description: "Reduce prices by 15% during low season (summer months)",
    category: "PRICING",
    priority: 35,
    isActive: true,
    conditions: [
      {
        type: "season",
        operator: "equals",
        value: "summer"
      }
    ],
    actions: [
      {
        type: "multiply_price",
        value: 0.85
      }
    ],
    metadata: {
      description: "Attract guests during traditionally slow period",
      category: "seasonal_optimization"
    }
  },

  {
    name: "Corporate Rate Discount",
    description: "Apply 12% discount for corporate bookings",
    category: "PRICING",
    priority: 40,
    isActive: true,
    conditions: [
      {
        type: "guest_type",
        operator: "equals",
        value: "corporate"
      }
    ],
    actions: [
      {
        type: "multiply_price",
        value: 0.88
      }
    ],
    metadata: {
      description: "Maintain corporate relationships with competitive rates",
      category: "customer_segment"
    }
  },

  {
    name: "Direct Booking Incentive",
    description: "Apply 8% discount for direct bookings to reduce OTA commissions",
    category: "PRICING",
    priority: 45,
    isActive: true,
    conditions: [
      {
        type: "booking_source",
        operator: "equals",
        value: "direct"
      }
    ],
    actions: [
      {
        type: "multiply_price",
        value: 0.92
      }
    ],
    metadata: {
      description: "Encourage direct bookings to reduce commission costs",
      category: "channel_optimization"
    }
  },

  {
    name: "Minimum Price Floor",
    description: "Ensure prices never go below ₹1500 per night",
    category: "PRICING",
    priority: 1, // Highest priority
    isActive: true,
    conditions: [
      {
        type: "occupancy",
        operator: "greater_than_or_equal",
        value: 0 // Always applies
      }
    ],
    actions: [
      {
        type: "set_minimum_price",
        value: 1500
      }
    ],
    metadata: {
      description: "Protect profit margins with minimum price floor",
      category: "profit_protection"
    }
  }
];

/**
 * Get sample rules for a specific category
 */
export function getSampleRulesByCategory(category: string) {
  return sampleBusinessRules.filter(rule => 
    rule.metadata?.category === category || rule.category === category
  );
}

/**
 * Get sample rules by priority range
 */
export function getSampleRulesByPriority(minPriority: number, maxPriority: number) {
  return sampleBusinessRules.filter(rule => 
    rule.priority >= minPriority && rule.priority <= maxPriority
  );
}

/**
 * Get active sample rules only
 */
export function getActiveSampleRules() {
  return sampleBusinessRules.filter(rule => rule.isActive);
}

/**
 * Create sample rules for an organization
 */
export function createSampleRulesForOrganization(
  organizationId: string, 
  createdBy: string,
  propertyId?: string
): BusinessRuleDefinition[] {
  return sampleBusinessRules.map(rule => ({
    ...rule,
    organizationId,
    createdBy,
    propertyId
  }));
}
