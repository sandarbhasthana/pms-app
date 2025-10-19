"use client";

import { useState } from "react";
import { BusinessRuleDefinition } from "@/types/business-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";

interface RuleEditorSheetProps {
  isOpen: boolean;
  rule?: BusinessRuleDefinition;
  onClose: () => void;
  onSave: (rule: BusinessRuleDefinition) => void;
  isLoading?: boolean;
}

export function RuleEditorSheet({
  isOpen,
  rule,
  onClose,
  onSave,
  isLoading = false
}: RuleEditorSheetProps) {
  const [formData, setFormData] = useState<Partial<BusinessRuleDefinition>>(
    rule || {
      name: "",
      description: "",
      category: "PRICING",
      priority: 50,
      isActive: true,
      conditions: [],
      actions: []
    }
  );

  const handleSave = () => {
    if (!formData.name?.trim()) {
      alert("Rule name is required");
      return;
    }

    onSave(formData as BusinessRuleDefinition);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{rule ? "Edit Rule" : "Create New Rule"}</SheetTitle>
          <SheetDescription>
            {rule
              ? "Update the rule details and conditions"
              : "Create a new business rule for dynamic pricing"}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Weekend High Demand Pricing"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this rule does..."
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Rule Type</Label>
                <select
                  id="category"
                  value={formData.category || "PRICING"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as
                        | "PRICING"
                        | "AVAILABILITY"
                        | "RESTRICTIONS"
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e]"
                >
                  <option value="PRICING">Pricing</option>
                  <option value="AVAILABILITY">Availability</option>
                  <option value="RESTRICTIONS">Restrictions</option>
                </select>
              </div>

              <div>
                <Label htmlFor="priority">Priority (1-100)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.priority || 50}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: parseInt(e.target.value)
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive || false}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
            </div>
          </TabsContent>

          {/* Conditions Tab */}
          <TabsContent value="conditions" className="space-y-4 mt-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                📋 Conditions define when this rule applies. Add conditions to
                specify the criteria.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                Conditions: {formData.conditions?.length || 0}
              </p>
              <Button variant="outline" className="w-full">
                + Add Condition
              </Button>
            </div>

            {formData.conditions && formData.conditions.length > 0 && (
              <div className="space-y-2">
                {formData.conditions.map((condition, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg flex items-center justify-between"
                  >
                    <span className="text-sm">
                      {condition.type} {condition.operator}{" "}
                      {String(condition.value)}
                    </span>
                    <button
                      type="button"
                      title="Remove condition"
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4 mt-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                ⚡ Actions define what happens when conditions are met. Add
                actions to specify the price adjustments.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                Actions: {formData.actions?.length || 0}
              </p>
              <Button variant="outline" className="w-full">
                + Add Action
              </Button>
            </div>

            {formData.actions && formData.actions.length > 0 && (
              <div className="space-y-2">
                {formData.actions.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg flex items-center justify-between"
                  >
                    <span className="text-sm">
                      {action.type}: {String(action.value)}
                    </span>
                    <button
                      type="button"
                      title="Remove action"
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4 mt-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Rule Name
                </p>
                <p className="text-lg font-semibold">{formData.name || "—"}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Description
                </p>
                <p className="text-sm">{formData.description || "—"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Type
                  </p>
                  <p className="text-sm capitalize">
                    {formData.category?.toLowerCase() || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Priority
                  </p>
                  <p className="text-sm">{formData.priority || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <p className="text-sm">
                  {formData.isActive ? "✅ Active" : "⏸️ Inactive"}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? "Saving..." : "Save Rule"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
