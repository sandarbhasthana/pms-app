"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  RuleCondition,
  RuleConditionType,
  RuleOperator
} from "@/types/business-rules";

interface EditConditionDialogProps {
  open: boolean;
  condition: RuleCondition | null;
  onClose: () => void;
  onSave: (condition: RuleCondition) => void;
}

export function EditConditionDialog({
  open,
  condition,
  onClose,
  onSave
}: EditConditionDialogProps) {
  const [editingCondition, setEditingCondition] =
    React.useState<RuleCondition | null>(condition);

  React.useEffect(() => {
    setEditingCondition(condition);
  }, [condition]);

  const handleSave = () => {
    if (editingCondition) {
      onSave(editingCondition);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Condition</DialogTitle>
          <DialogDescription>Modify the condition parameters</DialogDescription>
        </DialogHeader>

        {editingCondition && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cond-type">Condition Type</Label>
              <select
                id="cond-type"
                value={editingCondition.type}
                onChange={(e) =>
                  setEditingCondition({
                    ...editingCondition,
                    type: e.target.value as RuleConditionType
                  })
                }
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-sm"
              >
                <option value="occupancy">Occupancy</option>
                <option value="advance_booking">Advance Booking</option>
                <option value="day_of_week">Day of Week</option>
                <option value="season">Season</option>
                <option value="demand">Demand</option>
                <option value="length_of_stay">Length of Stay</option>
              </select>
            </div>

            <div>
              <Label htmlFor="cond-operator">Operator</Label>
              <select
                id="cond-operator"
                value={editingCondition.operator}
                onChange={(e) =>
                  setEditingCondition({
                    ...editingCondition,
                    operator: e.target.value as RuleOperator
                  })
                }
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-sm"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="greater_than_or_equal">
                  Greater Than or Equal
                </option>
                <option value="less_than_or_equal">Less Than or Equal</option>
                <option value="between">Between</option>
                <option value="in">In</option>
              </select>
            </div>

            <div>
              <Label htmlFor="cond-value">Value</Label>
              <Input
                id="cond-value"
                type="text"
                value={String(editingCondition.value)}
                onChange={(e) =>
                  setEditingCondition({
                    ...editingCondition,
                    value: isNaN(Number(e.target.value))
                      ? e.target.value
                      : Number(e.target.value)
                  })
                }
                placeholder="Enter value"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Save Condition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
