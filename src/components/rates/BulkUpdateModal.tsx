"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react";
import { format, addDays, eachDayOfInterval } from "date-fns";
import { Plus, X } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { RoomTypeRates, RateRestrictions } from "@/lib/hooks/useRatesData";

interface BulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomTypes: RoomTypeRates[];
  startDate: Date;
  days: number;
  onBulkUpdate: (
    updates: Array<{
      roomTypeId: string;
      date: string;
      price: number;
      availability?: number;
      restrictions?: Partial<RateRestrictions>;
    }>
  ) => Promise<void>;
  isUpdating?: boolean;
}

interface DateRange {
  start: Date;
  end: Date;
}

const BulkUpdateModal = memo(function BulkUpdateModal({
  isOpen,
  onClose,
  roomTypes,
  startDate,
  days,
  onBulkUpdate,
  isUpdating = false
}: BulkUpdateModalProps) {
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startDate,
    end: addDays(startDate, days - 1)
  });
  const [updateType, setUpdateType] = useState<"set" | "adjust">("set");
  const [priceValue, setPriceValue] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"amount" | "percentage">(
    "amount"
  );
  const [availability, setAvailability] = useState("");
  const [applyToWeekends, setApplyToWeekends] = useState(true);
  const [applyToWeekdays, setApplyToWeekdays] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([
    0, 1, 2, 3, 4, 5, 6
  ]); // All days selected by default
  const [restrictions, setRestrictions] = useState({
    minLOS: "",
    maxLOS: "",
    closedToArrival: false,
    closedToDeparture: false
  });

  // Ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Day selection constants
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];
  const weekdayIndices = useMemo(() => [1, 2, 3, 4, 5], []); // Monday to Friday
  const weekendIndices = useMemo(() => [0, 6], []); // Sunday and Saturday

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRoomTypes([]);
      setDateRange({
        start: startDate,
        end: addDays(startDate, days - 1)
      });
      setUpdateType("set");
      setPriceValue("");
      setAvailability("");
      setApplyToWeekends(true);
      setApplyToWeekdays(true);
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]); // Reset to all days
      setRestrictions({
        minLOS: "",
        maxLOS: "",
        closedToArrival: false,
        closedToDeparture: false
      });
    }
  }, [isOpen, startDate, days]);

  // Keep weekdays/weekends checkboxes in sync with individual day selections
  useEffect(() => {
    const hasAllWeekdays = weekdayIndices.every((day) =>
      selectedDays.includes(day)
    );
    const hasAllWeekends = weekendIndices.every((day) =>
      selectedDays.includes(day)
    );

    setApplyToWeekdays(hasAllWeekdays);
    setApplyToWeekends(hasAllWeekends);
  }, [selectedDays, weekdayIndices, weekendIndices]);

  // Focus management for scroll wheel functionality
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const dialogContent = document.querySelector('[role="dialog"]');
        if (dialogContent) {
          (dialogContent as HTMLElement).focus();
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleRoomTypeToggle = (roomTypeId: string) => {
    setSelectedRoomTypes((prev) =>
      prev.includes(roomTypeId)
        ? prev.filter((id) => id !== roomTypeId)
        : [...prev, roomTypeId]
    );
  };

  const handleSelectAllRoomTypes = () => {
    if (selectedRoomTypes.length === roomTypes.length) {
      setSelectedRoomTypes([]);
    } else {
      setSelectedRoomTypes(roomTypes.map((rt) => rt.roomTypeId));
    }
  };

  // Day selection helpers
  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const handleWeekdaysToggle = (checked: boolean) => {
    setApplyToWeekdays(checked);
    if (checked) {
      // Add weekdays to selected days
      setSelectedDays((prev) =>
        [...new Set([...prev, ...weekdayIndices])].sort()
      );
    } else {
      // Remove weekdays from selected days
      setSelectedDays((prev) =>
        prev.filter((d) => !weekdayIndices.includes(d))
      );
    }
  };

  const handleWeekendsToggle = (checked: boolean) => {
    setApplyToWeekends(checked);
    if (checked) {
      // Add weekends to selected days
      setSelectedDays((prev) =>
        [...new Set([...prev, ...weekendIndices])].sort()
      );
    } else {
      // Remove weekends from selected days
      setSelectedDays((prev) =>
        prev.filter((d) => !weekendIndices.includes(d))
      );
    }
  };

  const handleSelectAllDays = () => {
    if (selectedDays.length === 7) {
      setSelectedDays([]);
      setApplyToWeekdays(false);
      setApplyToWeekends(false);
    } else {
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      setApplyToWeekdays(true);
      setApplyToWeekends(true);
    }
  };

  const calculateUpdates = () => {
    const updates: Array<{
      roomTypeId: string;
      date: string;
      price: number;
      availability?: number;
      restrictions?: Partial<RateRestrictions>;
    }> = [];

    // Generate all dates in range
    const dates = eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end
    });

    selectedRoomTypes.forEach((roomTypeId) => {
      const roomType = roomTypes.find((rt) => rt.roomTypeId === roomTypeId);
      if (!roomType) return;

      dates.forEach((date) => {
        const dateString = format(date, "yyyy-MM-dd");
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // Skip if this day is not selected
        if (!selectedDays.includes(dayOfWeek)) return;

        const currentRateData = roomType.dates[dateString];
        if (!currentRateData) return;

        let newPrice: number;

        if (updateType === "set") {
          newPrice = parseFloat(priceValue);
        } else {
          // Adjustment
          const currentPrice = currentRateData.finalPrice;
          if (adjustmentType === "amount") {
            newPrice = currentPrice + parseFloat(priceValue);
          } else {
            // Percentage
            const percentage = parseFloat(priceValue) / 100;
            newPrice = currentPrice * (1 + percentage);
          }
        }

        if (isNaN(newPrice) || newPrice < 0) return;

        const update: {
          roomTypeId: string;
          date: string;
          price: number;
          availability?: number;
          restrictions?: Partial<RateRestrictions>;
        } = {
          roomTypeId,
          date: dateString,
          price: Math.round(newPrice * 100) / 100 // Round to 2 decimal places
        };

        // Add availability if specified
        if (availability) {
          const newAvailability = parseInt(availability);
          if (!isNaN(newAvailability) && newAvailability >= 0) {
            update.availability = newAvailability;
          }
        }

        // Add restrictions if specified
        const restrictionsToAdd: Partial<RateRestrictions> = {};
        if (restrictions.minLOS) {
          const minLOS = parseInt(restrictions.minLOS);
          if (!isNaN(minLOS) && minLOS > 0) {
            restrictionsToAdd.minLOS = minLOS;
          }
        }
        if (restrictions.maxLOS) {
          const maxLOS = parseInt(restrictions.maxLOS);
          if (!isNaN(maxLOS) && maxLOS > 0) {
            restrictionsToAdd.maxLOS = maxLOS;
          }
        }
        if (restrictions.closedToArrival) {
          restrictionsToAdd.closedToArrival = true;
        }
        if (restrictions.closedToDeparture) {
          restrictionsToAdd.closedToDeparture = true;
        }

        if (Object.keys(restrictionsToAdd).length > 0) {
          update.restrictions = restrictionsToAdd;
        }

        updates.push(update);
      });
    });

    return updates;
  };

  const handleSubmit = async () => {
    const updates = calculateUpdates();

    if (updates.length === 0) {
      return;
    }

    try {
      await onBulkUpdate(updates);
      onClose();
    } catch (error) {
      // Error handling is done in the hook
      console.error("Bulk update failed:", error);
    }
  };

  const previewCount = calculateUpdates().length;
  const isFormValid =
    selectedRoomTypes.length > 0 &&
    priceValue &&
    !isNaN(parseFloat(priceValue));

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-4xl max-h-[95vh] overflow-y-auto [&>button]:hidden"
          ref={scrollContainerRef}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            setTimeout(() => {
              scrollContainerRef.current?.focus();
            }, 100);
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Plus className="mr-2 h-5 w-5" />
                Long-term Interval Update
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 hover:rotate-90"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Close</p>
                </TooltipContent>
              </Tooltip>
            </DialogTitle>
            <DialogDescription>
              Update rates for multiple room types and dates at once
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8">
            {/* Room Type Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">Room Types</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllRoomTypes}
                >
                  {selectedRoomTypes.length === roomTypes.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3 max-h-40 overflow-y-auto border rounded p-4 bg-gray-50 dark:bg-gray-800">
                {roomTypes.map((roomType) => (
                  <div
                    key={roomType.roomTypeId}
                    className="flex items-start space-x-2"
                  >
                    <Checkbox
                      id={roomType.roomTypeId}
                      checked={selectedRoomTypes.includes(roomType.roomTypeId)}
                      onCheckedChange={() =>
                        handleRoomTypeToggle(roomType.roomTypeId)
                      }
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={roomType.roomTypeId}
                      className="text-sm cursor-pointer font-medium leading-4"
                    >
                      {roomType.roomTypeName} ({roomType.totalRooms})
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={format(dateRange.start, "yyyy-MM-dd")}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      start: new Date(e.target.value)
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={format(dateRange.end, "yyyy-MM-dd")}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      end: new Date(e.target.value)
                    }))
                  }
                />
              </div>
            </div>

            {/* Day Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">Apply To Days</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllDays}
                >
                  {selectedDays.length === 7 ? "Deselect All" : "Select All"}
                </Button>
              </div>

              {/* Quick Selection */}
              <div className="flex space-x-4 mb-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="weekdays"
                    checked={applyToWeekdays}
                    onCheckedChange={(checked) =>
                      handleWeekdaysToggle(!!checked)
                    }
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="weekdays"
                    className="text-sm font-medium leading-4 cursor-pointer"
                  >
                    Weekdays (Mon-Fri)
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="weekends"
                    checked={applyToWeekends}
                    onCheckedChange={(checked) =>
                      handleWeekendsToggle(!!checked)
                    }
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="weekends"
                    className="text-sm font-medium leading-4 cursor-pointer"
                  >
                    Weekends (Sat-Sun)
                  </Label>
                </div>
              </div>

              {/* Individual Day Selection */}
              <div className="grid grid-cols-7 gap-3 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                {dayNames.map((dayName, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Checkbox
                      id={`day-${index}`}
                      checked={selectedDays.includes(index)}
                      onCheckedChange={() => handleDayToggle(index)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`day-${index}`}
                      className="text-sm font-medium cursor-pointer leading-4"
                    >
                      {dayName.slice(0, 3)}
                    </Label>
                  </div>
                ))}
              </div>

              {selectedDays.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Selected: {selectedDays.map((d) => dayNames[d]).join(", ")}
                </p>
              )}
            </div>

            {/* Price Update */}
            <div>
              <Label className="text-base font-medium">Price Update</Label>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <Label className="text-sm font-medium">Update Type</Label>
                  <Select
                    value={updateType}
                    onValueChange={(value: "set" | "adjust") =>
                      setUpdateType(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="set">Set Fixed Price</SelectItem>
                      <SelectItem value="adjust">
                        Adjust Existing Prices
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    {updateType === "set" ? "Price Amount" : "Adjustment Value"}
                  </Label>
                  <Input
                    type="number"
                    placeholder={
                      updateType === "set" ? "Enter price" : "Enter adjustment"
                    }
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    step="0.01"
                    min={updateType === "set" ? "0" : undefined}
                  />
                </div>

                {updateType === "adjust" && (
                  <div>
                    <Label className="text-sm font-medium">
                      Adjustment Type
                    </Label>
                    <Select
                      value={adjustmentType}
                      onValueChange={(value: "amount" | "percentage") =>
                        setAdjustmentType(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Amount (₹)</SelectItem>
                        <SelectItem value="percentage">
                          Percentage (%)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Availability */}
            <div>
              <Label htmlFor="availability">Availability (optional)</Label>
              <Input
                id="availability"
                type="number"
                placeholder="Leave empty to keep current"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                min="0"
              />
            </div>

            {/* Restrictions */}
            <div>
              <Label className="text-base font-medium">
                Restrictions (optional)
              </Label>
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div>
                  <Label htmlFor="minLOS" className="text-sm font-medium">
                    Min LOS (nights)
                  </Label>
                  <Input
                    id="minLOS"
                    type="number"
                    placeholder="No minimum"
                    value={restrictions.minLOS}
                    onChange={(e) =>
                      setRestrictions((prev) => ({
                        ...prev,
                        minLOS: e.target.value
                      }))
                    }
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxLOS" className="text-sm font-medium">
                    Max LOS (nights)
                  </Label>
                  <Input
                    id="maxLOS"
                    type="number"
                    placeholder="No maximum"
                    value={restrictions.maxLOS}
                    onChange={(e) =>
                      setRestrictions((prev) => ({
                        ...prev,
                        maxLOS: e.target.value
                      }))
                    }
                    min="1"
                  />
                </div>
                <div className="mt-2 ml-8">
                  <Label className="text-sm font-medium invisible">
                    Placeholder
                  </Label>
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="closedToArrival"
                      checked={restrictions.closedToArrival}
                      onCheckedChange={(checked) =>
                        setRestrictions((prev) => ({
                          ...prev,
                          closedToArrival: !!checked
                        }))
                      }
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="closedToArrival"
                      className="text-sm font-medium leading-4 cursor-pointer"
                    >
                      Closed to Arrival
                    </Label>
                  </div>
                </div>
                <div className="mt-2">
                  <Label className="text-sm font-medium invisible">
                    Placeholder
                  </Label>
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="closedToDeparture"
                      checked={restrictions.closedToDeparture}
                      onCheckedChange={(checked) =>
                        setRestrictions((prev) => ({
                          ...prev,
                          closedToDeparture: !!checked
                        }))
                      }
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="closedToDeparture"
                      className="text-sm font-medium leading-4 cursor-pointer"
                    >
                      Closed to Departure
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            {isFormValid && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Preview:</strong> This will update {previewCount} rate
                  entries across {selectedRoomTypes.length} room type(s)
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-12">
            <Button variant="outline" onClick={onClose} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isUpdating}
            >
              {isUpdating ? "Updating..." : `Update ${previewCount} Rates`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
});

export default BulkUpdateModal;
