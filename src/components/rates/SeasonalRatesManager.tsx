"use client";

import { useState, memo } from "react";
import { format } from "date-fns";
import { Plus, Edit3, Trash2, Calendar, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useSeasonalRates, RoomTypeRates } from "@/lib/hooks/useRatesData";

import { SeasonalRate } from "@/lib/hooks/useRatesData";
import { toast } from "sonner";

interface SeasonalRatesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  roomTypes: RoomTypeRates[];
  onSeasonalRateChange?: () => void;
}

interface SeasonalRateForm {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: string;
  roomTypeId: string | null;
  isActive: boolean;
}

const SeasonalRatesManager = memo(function SeasonalRatesManager({
  isOpen,
  onClose,
  roomTypes,
  onSeasonalRateChange
}: SeasonalRatesManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<SeasonalRateForm | null>(null);
  const [formData, setFormData] = useState<SeasonalRateForm>({
    name: "",
    startDate: "",
    endDate: "",
    multiplier: "1.0",
    roomTypeId: null,
    isActive: true
  });

  // Fetch seasonal rates
  const { seasonalRates, isLoading, mutate, createSeasonalRate } =
    useSeasonalRates();

  const resetForm = () => {
    setFormData({
      name: "",
      startDate: "",
      endDate: "",
      multiplier: "1.0",
      roomTypeId: null,
      isActive: true
    });
    setEditingRate(null);
    setShowForm(false);
  };

  const handleCreate = () => {
    setShowForm(true);
    resetForm();
  };

  const handleEdit = (rate: any) => {
    setFormData({
      id: rate.id,
      name: rate.name,
      startDate: format(new Date(rate.startDate), "yyyy-MM-dd"),
      endDate: format(new Date(rate.endDate), "yyyy-MM-dd"),
      multiplier: rate.multiplier.toString(),
      roomTypeId: rate.roomTypeId,
      isActive: rate.isActive
    });
    setEditingRate(rate);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      // Validate form
      if (
        !formData.name ||
        !formData.startDate ||
        !formData.endDate ||
        !formData.multiplier
      ) {
        toast.error("Please fill in all required fields");
        return;
      }

      const multiplier = parseFloat(formData.multiplier);
      if (isNaN(multiplier) || multiplier <= 0) {
        toast.error("Multiplier must be a positive number");
        return;
      }

      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        toast.error("End date must be after start date");
        return;
      }

      if (editingRate) {
        // Update existing rate
        const response = await fetch("/api/rates/seasonal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id: editingRate.id,
            name: formData.name,
            startDate: formData.startDate,
            endDate: formData.endDate,
            multiplier: multiplier,
            isActive: formData.isActive
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Update failed");
        }

        toast.success("Seasonal rate updated successfully");
      } else {
        // Create new rate
        await createSeasonalRate({
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate,
          multiplier: multiplier,
          roomTypeId: formData.roomTypeId || undefined
        });
      }

      mutate(); // Refresh the list
      resetForm();
      onSeasonalRateChange?.(); // Notify parent to refresh rates data
    } catch (error) {
      console.error("Seasonal rate operation failed:", error);
    }
  };

  const handleDelete = async (rateId: string) => {
    if (!confirm("Are you sure you want to delete this seasonal rate?")) {
      return;
    }

    try {
      const response = await fetch(`/api/rates/seasonal?id=${rateId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }

      toast.success("Seasonal rate deleted successfully");
      mutate(); // Refresh the list
      onSeasonalRateChange?.(); // Notify parent to refresh rates data
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to delete seasonal rate: ${errorMessage}`);
    }
  };

  const formatMultiplier = (multiplier: number) => {
    const percentage = (multiplier - 1) * 100;
    const sign = percentage >= 0 ? "+" : "";
    return `${sign}${percentage.toFixed(1)}%`;
  };

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier > 1) return "text-green-600 dark:text-green-400";
    if (multiplier < 1) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Seasonal Rates Management
          </DialogTitle>
          <DialogDescription>
            Create and manage seasonal pricing multipliers for different periods
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Active Seasonal Rates</h3>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Seasonal Rate
            </Button>
          </div>

          {/* Seasonal Rates List */}
          {isLoading ? (
            <div className="text-center py-8">Loading seasonal rates...</div>
          ) : seasonalRates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No seasonal rates configured. Create your first seasonal rate to
              get started.
            </div>
          ) : (
            <div className="space-y-3">
              {seasonalRates.map((rate) => (
                <div
                  key={rate.id}
                  className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium">{rate.name}</h4>
                      <span
                        className={`font-mono text-sm ${getMultiplierColor(
                          rate.multiplier
                        )}`}
                      >
                        <Percent className="inline h-3 w-3 mr-1" />
                        {formatMultiplier(rate.multiplier)}
                      </span>
                      {!rate.isActive && (
                        <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {format(new Date(rate.startDate), "MMM d, yyyy")} -{" "}
                      {format(new Date(rate.endDate), "MMM d, yyyy")}
                      {rate.roomType && (
                        <span className="ml-2">• {rate.roomType.name}</span>
                      )}
                      {!rate.roomType && (
                        <span className="ml-2">• Property-wide</span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(rate)}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(rate.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Create/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRate ? "Edit Seasonal Rate" : "Create Seasonal Rate"}
            </DialogTitle>
            <DialogDescription>
              Set up pricing multipliers for specific date ranges
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Rate Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Summer Season, Holiday Premium"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startDate: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: e.target.value
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="multiplier">Price Multiplier *</Label>
              <Input
                id="multiplier"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="1.0 = no change, 1.2 = 20% increase, 0.8 = 20% decrease"
                value={formData.multiplier}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    multiplier: e.target.value
                  }))
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                1.0 = no change, 1.2 = 20% increase, 0.8 = 20% decrease
              </p>
            </div>

            <div>
              <Label htmlFor="roomType">Apply To</Label>
              <Select
                value={formData.roomTypeId || "property-wide"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    roomTypeId: value === "property-wide" ? null : value
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="property-wide">
                    All Room Types (Property-wide)
                  </SelectItem>
                  {roomTypes.map((roomType) => (
                    <SelectItem
                      key={roomType.roomTypeId}
                      value={roomType.roomTypeId}
                    >
                      {roomType.roomTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: !!checked }))
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingRate ? "Update" : "Create"} Seasonal Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
});

export default SeasonalRatesManager;
