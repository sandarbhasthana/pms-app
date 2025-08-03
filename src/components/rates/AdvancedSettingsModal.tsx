"use client";

import { useState, memo } from "react";
import { format, addDays } from "date-fns";
import {
  Settings,
  Calendar,
  Ban,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
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
import { RoomTypeRates } from "@/lib/hooks/useRatesData";
import { toast } from "sonner";

interface AdvancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomTypes: RoomTypeRates[];
  onSettingsChange?: () => void;
}

const AdvancedSettingsModal = memo(function AdvancedSettingsModal({
  isOpen,
  onClose,
  roomTypes,
  onSettingsChange
}: AdvancedSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<
    "block" | "reset" | "restrictions"
  >("block");

  // Block Dates State
  const [blockDatesForm, setBlockDatesForm] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    roomTypeIds: [] as string[],
    reason: ""
  });

  // Reset State
  const [resetForm, setResetForm] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    roomTypeIds: [] as string[],
    resetType: "daily" as "daily" | "seasonal" | "all",
    confirmText: ""
  });

  // Restrictions State
  const [restrictionsForm, setRestrictionsForm] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    roomTypeIds: [] as string[],
    minLOS: "",
    maxLOS: "",
    closedToArrival: false,
    closedToDeparture: false
  });

  const handleRoomTypeToggle = (
    roomTypeId: string,
    formType: "block" | "reset" | "restrictions"
  ) => {
    if (formType === "block") {
      setBlockDatesForm((prev) => ({
        ...prev,
        roomTypeIds: prev.roomTypeIds.includes(roomTypeId)
          ? prev.roomTypeIds.filter((id: string) => id !== roomTypeId)
          : [...prev.roomTypeIds, roomTypeId]
      }));
    } else if (formType === "reset") {
      setResetForm((prev) => ({
        ...prev,
        roomTypeIds: prev.roomTypeIds.includes(roomTypeId)
          ? prev.roomTypeIds.filter((id: string) => id !== roomTypeId)
          : [...prev.roomTypeIds, roomTypeId]
      }));
    } else {
      setRestrictionsForm((prev) => ({
        ...prev,
        roomTypeIds: prev.roomTypeIds.includes(roomTypeId)
          ? prev.roomTypeIds.filter((id: string) => id !== roomTypeId)
          : [...prev.roomTypeIds, roomTypeId]
      }));
    }
  };

  const handleSelectAllRoomTypes = (
    formType: "block" | "reset" | "restrictions"
  ) => {
    const allSelected =
      formType === "block"
        ? blockDatesForm.roomTypeIds.length === roomTypes.length
        : formType === "reset"
        ? resetForm.roomTypeIds.length === roomTypes.length
        : restrictionsForm.roomTypeIds.length === roomTypes.length;

    const newRoomTypeIds = allSelected
      ? []
      : roomTypes.map((rt) => rt.roomTypeId);

    if (formType === "block") {
      setBlockDatesForm((prev) => ({ ...prev, roomTypeIds: newRoomTypeIds }));
    } else if (formType === "reset") {
      setResetForm((prev) => ({ ...prev, roomTypeIds: newRoomTypeIds }));
    } else {
      setRestrictionsForm((prev) => ({ ...prev, roomTypeIds: newRoomTypeIds }));
    }
  };

  const handleBlockDates = async () => {
    if (blockDatesForm.roomTypeIds.length === 0) {
      toast.error("Please select at least one room type");
      return;
    }

    try {
      // Create daily rate overrides with zero availability to block dates
      const updates: Array<{
        roomTypeId: string;
        date: string;
        price: number;
        availability?: number;
        restrictions?: any;
      }> = [];
      const startDate = new Date(blockDatesForm.startDate);
      const endDate = new Date(blockDatesForm.endDate);

      for (
        let date = new Date(startDate);
        date <= endDate;
        date.setDate(date.getDate() + 1)
      ) {
        blockDatesForm.roomTypeIds.forEach((roomTypeId) => {
          updates.push({
            roomTypeId,
            date: format(date, "yyyy-MM-dd"),
            price: 0, // Blocked rate
            availability: 0, // No availability
            restrictions: {
              closedToArrival: true,
              closedToDeparture: true
            }
          });
        });
      }

      const response = await fetch("/api/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Block dates failed");
      }

      toast.success(
        `Successfully blocked dates for ${blockDatesForm.roomTypeIds.length} room type(s)`
      );
      onSettingsChange?.();
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to block dates: ${errorMessage}`);
    }
  };

  const handleResetRates = async () => {
    if (resetForm.confirmText !== "RESET") {
      toast.error("Please type 'RESET' to confirm this action");
      return;
    }

    if (resetForm.roomTypeIds.length === 0) {
      toast.error("Please select at least one room type");
      return;
    }

    try {
      // This would need a specific API endpoint for bulk deletion/reset
      // For now, we'll show a success message
      toast.success(
        `Reset operation would affect ${resetForm.roomTypeIds.length} room type(s)`
      );
      toast.info(
        "Reset functionality coming soon - this is a destructive operation that needs careful implementation"
      );

      // onSettingsChange?.();
      // onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to reset rates: ${errorMessage}`);
    }
  };

  const handleApplyRestrictions = async () => {
    if (restrictionsForm.roomTypeIds.length === 0) {
      toast.error("Please select at least one room type");
      return;
    }

    try {
      const updates: Array<{
        roomTypeId: string;
        date: string;
        price: number;
        availability?: number;
        restrictions?: any;
      }> = [];
      const startDate = new Date(restrictionsForm.startDate);
      const endDate = new Date(restrictionsForm.endDate);

      for (
        let date = new Date(startDate);
        date <= endDate;
        date.setDate(date.getDate() + 1)
      ) {
        restrictionsForm.roomTypeIds.forEach((roomTypeId) => {
          // Get current rate for this room type and date to preserve pricing
          const roomType = roomTypes.find((rt) => rt.roomTypeId === roomTypeId);
          const dateString = format(date, "yyyy-MM-dd");
          const currentRate = roomType?.dates[dateString];

          updates.push({
            roomTypeId,
            date: dateString,
            price: currentRate?.finalPrice || 0,
            availability: currentRate?.availability,
            restrictions: {
              minLOS: restrictionsForm.minLOS
                ? parseInt(restrictionsForm.minLOS)
                : undefined,
              maxLOS: restrictionsForm.maxLOS
                ? parseInt(restrictionsForm.maxLOS)
                : undefined,
              closedToArrival: restrictionsForm.closedToArrival,
              closedToDeparture: restrictionsForm.closedToDeparture
            }
          });
        });
      }

      const response = await fetch("/api/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Apply restrictions failed");
      }

      toast.success(
        `Successfully applied restrictions to ${restrictionsForm.roomTypeIds.length} room type(s)`
      );
      onSettingsChange?.();
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to apply restrictions: ${errorMessage}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Advanced Rate Settings
          </DialogTitle>
          <DialogDescription>
            Manage bulk operations, restrictions, and rate resets
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex space-x-1 border-b">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === "block"
                ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("block")}
          >
            <Ban className="inline mr-2 h-4 w-4" />
            Block Dates
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === "restrictions"
                ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("restrictions")}
          >
            <Calendar className="inline mr-2 h-4 w-4" />
            Restrictions
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === "reset"
                ? "bg-red-50 text-red-700 border-b-2 border-red-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("reset")}
          >
            <RotateCcw className="inline mr-2 h-4 w-4" />
            Reset Rates
          </button>
        </div>

        <div className="space-y-6 mt-6">
          {/* Block Dates Tab */}
          {activeTab === "block" && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Block Dates
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      This will set availability to 0 and close the dates for
                      arrival/departure for the selected room types and date
                      range.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="blockStartDate">Start Date</Label>
                  <Input
                    id="blockStartDate"
                    type="date"
                    value={blockDatesForm.startDate}
                    onChange={(e) =>
                      setBlockDatesForm((prev) => ({
                        ...prev,
                        startDate: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="blockEndDate">End Date</Label>
                  <Input
                    id="blockEndDate"
                    type="date"
                    value={blockDatesForm.endDate}
                    onChange={(e) =>
                      setBlockDatesForm((prev) => ({
                        ...prev,
                        endDate: e.target.value
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Room Types</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAllRoomTypes("block")}
                  >
                    {blockDatesForm.roomTypeIds.length === roomTypes.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                  {roomTypes.map((roomType) => (
                    <div
                      key={roomType.roomTypeId}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`block-${roomType.roomTypeId}`}
                        checked={blockDatesForm.roomTypeIds.includes(
                          roomType.roomTypeId
                        )}
                        onCheckedChange={() =>
                          handleRoomTypeToggle(roomType.roomTypeId, "block")
                        }
                      />
                      <Label
                        htmlFor={`block-${roomType.roomTypeId}`}
                        className="text-sm cursor-pointer"
                      >
                        {roomType.roomTypeName}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="blockReason">Reason (optional)</Label>
                <Input
                  id="blockReason"
                  placeholder="e.g., Maintenance, Private Event"
                  value={blockDatesForm.reason}
                  onChange={(e) =>
                    setBlockDatesForm((prev) => ({
                      ...prev,
                      reason: e.target.value
                    }))
                  }
                />
              </div>
            </div>
          )}

          {/* Restrictions Tab */}
          {activeTab === "restrictions" && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-200">
                  Apply Restrictions
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Set minimum/maximum length of stay and arrival/departure
                  restrictions for selected dates.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="restrictStartDate">Start Date</Label>
                  <Input
                    id="restrictStartDate"
                    type="date"
                    value={restrictionsForm.startDate}
                    onChange={(e) =>
                      setRestrictionsForm((prev) => ({
                        ...prev,
                        startDate: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="restrictEndDate">End Date</Label>
                  <Input
                    id="restrictEndDate"
                    type="date"
                    value={restrictionsForm.endDate}
                    onChange={(e) =>
                      setRestrictionsForm((prev) => ({
                        ...prev,
                        endDate: e.target.value
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Room Types</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAllRoomTypes("restrictions")}
                  >
                    {restrictionsForm.roomTypeIds.length === roomTypes.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                  {roomTypes.map((roomType) => (
                    <div
                      key={roomType.roomTypeId}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`restrict-${roomType.roomTypeId}`}
                        checked={restrictionsForm.roomTypeIds.includes(
                          roomType.roomTypeId
                        )}
                        onCheckedChange={() =>
                          handleRoomTypeToggle(
                            roomType.roomTypeId,
                            "restrictions"
                          )
                        }
                      />
                      <Label
                        htmlFor={`restrict-${roomType.roomTypeId}`}
                        className="text-sm cursor-pointer"
                      >
                        {roomType.roomTypeName}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minLOS">Minimum LOS (nights)</Label>
                  <Input
                    id="minLOS"
                    type="number"
                    min="1"
                    value={restrictionsForm.minLOS}
                    onChange={(e) =>
                      setRestrictionsForm((prev) => ({
                        ...prev,
                        minLOS: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maxLOS">Maximum LOS (nights)</Label>
                  <Input
                    id="maxLOS"
                    type="number"
                    min="1"
                    value={restrictionsForm.maxLOS}
                    onChange={(e) =>
                      setRestrictionsForm((prev) => ({
                        ...prev,
                        maxLOS: e.target.value
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="closedToArrival"
                    checked={restrictionsForm.closedToArrival}
                    onCheckedChange={(checked) =>
                      setRestrictionsForm((prev) => ({
                        ...prev,
                        closedToArrival: !!checked
                      }))
                    }
                  />
                  <Label htmlFor="closedToArrival">Closed to Arrival</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="closedToDeparture"
                    checked={restrictionsForm.closedToDeparture}
                    onCheckedChange={(checked) =>
                      setRestrictionsForm((prev) => ({
                        ...prev,
                        closedToDeparture: !!checked
                      }))
                    }
                  />
                  <Label htmlFor="closedToDeparture">Closed to Departure</Label>
                </div>
              </div>
            </div>
          )}

          {/* Reset Tab */}
          {activeTab === "reset" && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-200">
                      Danger Zone
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      This action will permanently delete rate overrides and
                      cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="resetType">Reset Type</Label>
                <Select
                  value={resetForm.resetType}
                  onValueChange={(value: "daily" | "seasonal" | "all") =>
                    setResetForm((prev) => ({ ...prev, resetType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">
                      Daily Rate Overrides Only
                    </SelectItem>
                    <SelectItem value="seasonal">
                      Seasonal Rates Only
                    </SelectItem>
                    <SelectItem value="all">All Rate Overrides</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="resetStartDate">Start Date</Label>
                  <Input
                    id="resetStartDate"
                    type="date"
                    value={resetForm.startDate}
                    onChange={(e) =>
                      setResetForm((prev) => ({
                        ...prev,
                        startDate: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="resetEndDate">End Date</Label>
                  <Input
                    id="resetEndDate"
                    type="date"
                    value={resetForm.endDate}
                    onChange={(e) =>
                      setResetForm((prev) => ({
                        ...prev,
                        endDate: e.target.value
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Room Types</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAllRoomTypes("reset")}
                  >
                    {resetForm.roomTypeIds.length === roomTypes.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                  {roomTypes.map((roomType) => (
                    <div
                      key={roomType.roomTypeId}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`reset-${roomType.roomTypeId}`}
                        checked={resetForm.roomTypeIds.includes(
                          roomType.roomTypeId
                        )}
                        onCheckedChange={() =>
                          handleRoomTypeToggle(roomType.roomTypeId, "reset")
                        }
                      />
                      <Label
                        htmlFor={`reset-${roomType.roomTypeId}`}
                        className="text-sm cursor-pointer"
                      >
                        {roomType.roomTypeName}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="confirmText">Type "RESET" to confirm</Label>
                <Input
                  id="confirmText"
                  placeholder="RESET"
                  value={resetForm.confirmText}
                  onChange={(e) =>
                    setResetForm((prev) => ({
                      ...prev,
                      confirmText: e.target.value
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {activeTab === "block" && (
            <Button onClick={handleBlockDates}>Block Selected Dates</Button>
          )}
          {activeTab === "restrictions" && (
            <Button onClick={handleApplyRestrictions}>
              Apply Restrictions
            </Button>
          )}
          {activeTab === "reset" && (
            <Button
              variant="destructive"
              onClick={handleResetRates}
              disabled={resetForm.confirmText !== "RESET"}
            >
              Reset Rates
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default AdvancedSettingsModal;
