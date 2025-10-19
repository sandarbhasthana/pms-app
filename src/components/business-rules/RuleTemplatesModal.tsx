"use client";

import { BusinessRuleDefinition } from "@/types/business-rules";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";

interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: "PRICING" | "AVAILABILITY" | "RESTRICTIONS";
  rule: Omit<BusinessRuleDefinition, "id" | "propertyId" | "organizationId" | "createdBy">;
}

interface RuleTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (template: RuleTemplate) => void;
  isLoading?: boolean;
}

const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "weekend-pricing",
    name: "Weekend High Demand Pricing",
    description: "Increase prices by 25% on weekends when occupancy exceeds 80%",
    category: "PRICING",
    rule: {
      name: "Weekend High Demand Pricing",
      description: "Increase prices by 25% on weekends when occupancy exceeds 80%",
      category: "PRICING",
      priority: 80,
      isActive: true,
      conditions: [
        {
          type: "day_of_week",
          operator: "equals",
          value: "weekend"
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
      ]
    }
  },
  {
    id: "occupancy-surge",
    name: "Occupancy-Based Surge Pricing",
    description: "Increase prices by 40% when occupancy exceeds 90%",
    category: "PRICING",
    rule: {
      name: "Occupancy-Based Surge Pricing",
      description: "Increase prices by 40% when occupancy exceeds 90%",
      category: "PRICING",
      priority: 90,
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
          value: 1.4
        }
      ]
    }
  },
  {
    id: "seasonal-pricing",
    name: "Seasonal Pricing",
    description: "Reduce prices by 15% during low season (summer months)",
    category: "PRICING",
    rule: {
      name: "Seasonal Pricing",
      description: "Reduce prices by 15% during low season (summer months)",
      category: "PRICING",
      priority: 70,
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
      ]
    }
  },
  {
    id: "early-bird",
    name: "Early Bird Discount",
    description: "Reduce prices by 10% for bookings made more than 30 days in advance",
    category: "PRICING",
    rule: {
      name: "Early Bird Discount",
      description: "Reduce prices by 10% for bookings made more than 30 days in advance",
      category: "PRICING",
      priority: 60,
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
          value: 0.9
        }
      ]
    }
  },
  {
    id: "last-minute",
    name: "Last Minute Deal",
    description: "Reduce prices by 15% for bookings within 3 days with low occupancy",
    category: "PRICING",
    rule: {
      name: "Last Minute Deal",
      description: "Reduce prices by 15% for bookings within 3 days with low occupancy",
      category: "PRICING",
      priority: 75,
      isActive: true,
      conditions: [
        {
          type: "advance_booking",
          operator: "less_than",
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
      ]
    }
  },
  {
    id: "extended-stay",
    name: "Extended Stay Discount",
    description: "Reduce prices by 20% for stays longer than 7 nights",
    category: "PRICING",
    rule: {
      name: "Extended Stay Discount",
      description: "Reduce prices by 20% for stays longer than 7 nights",
      category: "PRICING",
      priority: 65,
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
          value: 0.8
        }
      ]
    }
  }
];

export function RuleTemplatesModal({
  isOpen,
  onClose,
  onApply,
  isLoading = false
}: RuleTemplatesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rule Templates</DialogTitle>
          <DialogDescription>
            Choose a pre-defined template to quickly create a new rule
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {RULE_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm">{template.name}</h3>
                <Badge variant="outline" className="capitalize text-xs">
                  {template.category.toLowerCase()}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {template.description}
              </p>

              <div className="space-y-2 mb-4 text-xs">
                <div>
                  <p className="font-medium text-muted-foreground">Conditions:</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {template.rule.conditions.map((cond, idx) => (
                      <li key={idx}>
                        {cond.type} {cond.operator} {String(cond.value)}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="font-medium text-muted-foreground">Actions:</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {template.rule.actions.map((action, idx) => (
                      <li key={idx}>
                        {action.type}: {String(action.value)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button
                onClick={() => onApply(template)}
                disabled={isLoading}
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Copy className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

