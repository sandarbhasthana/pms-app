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
import { X, Edit2, Check } from "lucide-react";
import {
  RuleCondition,
  RuleConditionType,
  RuleOperator,
  RuleAction,
  RuleActionType
} from "@/types/business-rules";

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

  const [editingConditionIdx, setEditingConditionIdx] = useState<number | null>(
    null
  );
  const [editingCondition, setEditingCondition] =
    useState<RuleCondition | null>(null);

  const [editingActionIdx, setEditingActionIdx] = useState<number | null>(null);
  const [editingAction, setEditingAction] = useState<RuleAction | null>(null);

  const handleSave = () => {
    if (!formData.name?.trim()) {
      alert("Rule name is required");
      return;
    }

    onSave(formData as BusinessRuleDefinition);
  };

  const handleAddCondition = () => {
    const newCondition = {
      type: "occupancy" as const,
      operator: "greater_than_or_equal" as const,
      value: 80
    };
    setFormData({
      ...formData,
      conditions: [...(formData.conditions || []), newCondition]
    });
  };

  const handleRemoveCondition = (idx: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions?.filter((_, i) => i !== idx) || []
    });
  };

  const handleEditCondition = (idx: number) => {
    const condition = formData.conditions?.[idx];
    if (condition) {
      setEditingCondition({ ...condition });
      setEditingConditionIdx(idx);
    }
  };

  const handleSaveCondition = () => {
    if (editingConditionIdx !== null && editingCondition) {
      const updatedConditions = [...(formData.conditions || [])];
      updatedConditions[editingConditionIdx] = editingCondition;
      setFormData({
        ...formData,
        conditions: updatedConditions
      });
      setEditingConditionIdx(null);
      setEditingCondition(null);
    }
  };

  const handleRemoveAction = (idx: number) => {
    setFormData({
      ...formData,
      actions: formData.actions?.filter((_, i) => i !== idx) || []
    });
  };

  const handleEditAction = (idx: number) => {
    const action = formData.actions?.[idx];
    if (action) {
      setEditingAction({ ...action });
      setEditingActionIdx(idx);
    }
  };

  const handleSaveAction = () => {
    if (editingActionIdx !== null && editingAction) {
      const updatedActions = [...(formData.actions || [])];
      updatedActions[editingActionIdx] = editingAction;
      setFormData({
        ...formData,
        actions: updatedActions
      });
      setEditingActionIdx(null);
      setEditingAction(null);
    }
  };

  const handleAddAction = () => {
    const newAction = {
      type: "multiply_price" as const,
      value: 1.1
    };
    setFormData({
      ...formData,
      actions: [...(formData.actions || []), newAction]
    });
  };

  return (
    <>
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
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  onClick={handleAddCondition}
                >
                  + Add Condition
                </Button>
              </div>

              {formData.conditions && formData.conditions.length > 0 && (
                <div className="space-y-2">
                  {formData.conditions.map((condition, idx) => (
                    <div key={idx} className="space-y-2">
                      {editingConditionIdx === idx ? (
                        // Edit form
                        <div className="p-3 bg-gray-100 dark:!bg-gray-800 rounded-lg space-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              Type
                            </label>
                            <select
                              value={
                                editingCondition?.type ||
                                condition.type ||
                                "occupancy"
                              }
                              onChange={(e) =>
                                setEditingCondition({
                                  ...editingCondition!,
                                  type: e.target.value as RuleConditionType
                                })
                              }
                              className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] dark:text-gray-100"
                            >
                              <option value="occupancy">Occupancy</option>
                              <option value="advance_booking">
                                Advance Booking
                              </option>
                              <option value="day_of_week">Day of Week</option>
                              <option value="season">Season</option>
                              <option value="demand">Demand</option>
                              <option value="length_of_stay">
                                Length of Stay
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              Operator
                            </label>
                            <select
                              value={
                                editingCondition?.operator ||
                                condition.operator ||
                                "greater_than_or_equal"
                              }
                              onChange={(e) =>
                                setEditingCondition({
                                  ...editingCondition!,
                                  operator: e.target.value as RuleOperator
                                })
                              }
                              className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] dark:text-gray-100"
                            >
                              <option value="equals">Equals</option>
                              <option value="not_equals">Not Equals</option>
                              <option value="greater_than">Greater Than</option>
                              <option value="less_than">Less Than</option>
                              <option value="greater_than_or_equal">
                                Greater Than or Equal
                              </option>
                              <option value="less_than_or_equal">
                                Less Than or Equal
                              </option>
                              <option value="between">Between</option>
                              <option value="in">In</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              Value
                            </label>
                            <Input
                              type="text"
                              value={String(
                                editingCondition?.value ?? condition.value ?? ""
                              )}
                              onChange={(e) =>
                                setEditingCondition({
                                  ...editingCondition!,
                                  value: isNaN(Number(e.target.value))
                                    ? e.target.value
                                    : Number(e.target.value)
                                })
                              }
                              className="mt-1 text-sm"
                              placeholder="Enter value"
                            />
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingConditionIdx(null);
                                setEditingCondition(null);
                              }}
                              className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveCondition}
                              className="px-2 py-1 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display view
                        <div className="p-3 bg-gray-50 dark:!bg-gray-900/30 dark:!text-gray-100 rounded-lg flex items-center justify-between">
                          <span className="text-sm">
                            {condition.type} {condition.operator}{" "}
                            {String(condition.value)}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              title="Edit condition"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => handleEditCondition(idx)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Remove condition"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleRemoveCondition(idx)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
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
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  onClick={handleAddAction}
                >
                  + Add Action
                </Button>
              </div>

              {formData.actions && formData.actions.length > 0 && (
                <div className="space-y-2">
                  {formData.actions.map((action, idx) => (
                    <div key={idx} className="space-y-2">
                      {editingActionIdx === idx ? (
                        // Edit form
                        <div className="p-3 bg-gray-100 dark:!bg-gray-800 rounded-lg space-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              Type
                            </label>
                            <select
                              value={
                                editingAction?.type ||
                                action.type ||
                                "multiply_price"
                              }
                              onChange={(e) =>
                                setEditingAction({
                                  ...editingAction!,
                                  type: e.target.value as RuleActionType
                                })
                              }
                              className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] dark:text-gray-100"
                            >
                              <option value="multiply_price">
                                Multiply Price
                              </option>
                              <option value="add_amount">Add Amount</option>
                              <option value="subtract_amount">
                                Subtract Amount
                              </option>
                              <option value="set_price">Set Price</option>
                              <option value="set_minimum_price">
                                Set Minimum Price
                              </option>
                              <option value="set_maximum_price">
                                Set Maximum Price
                              </option>
                              <option value="set_availability">
                                Set Availability
                              </option>
                              <option value="add_availability">
                                Add Availability
                              </option>
                              <option value="subtract_availability">
                                Subtract Availability
                              </option>
                              <option value="set_restriction">
                                Set Restriction
                              </option>
                              <option value="send_notification">
                                Send Notification
                              </option>
                              <option value="trigger_automation">
                                Trigger Automation
                              </option>
                              <option value="log_event">Log Event</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              Value
                            </label>
                            <Input
                              type="text"
                              value={String(
                                editingAction?.value ?? action.value ?? ""
                              )}
                              onChange={(e) =>
                                setEditingAction({
                                  ...editingAction!,
                                  value: isNaN(Number(e.target.value))
                                    ? e.target.value
                                    : Number(e.target.value)
                                })
                              }
                              className="mt-1 text-sm"
                              placeholder="Enter value"
                            />
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingActionIdx(null);
                                setEditingAction(null);
                              }}
                              className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveAction}
                              className="px-2 py-1 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display view
                        <div className="p-3 bg-gray-50 dark:!bg-gray-900/30 dark:!text-gray-100 rounded-lg flex items-center justify-between">
                          <span className="text-sm">
                            {action.type}: {String(action.value)}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              title="Edit action"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => handleEditAction(idx)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Remove action"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleRemoveAction(idx)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-4 mt-4">
              <div className="p-4 bg-gray-50 dark:!bg-gray-900/30 dark:!text-gray-100 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Rule Name
                  </p>
                  <p className="text-lg font-semibold">
                    {formData.name || "—"}
                  </p>
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
    </>
  );
}
