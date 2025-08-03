"use client";

import { useState, useRef, useEffect, memo } from "react";
import { format } from "date-fns";
import { Edit3, Check, X, AlertCircle, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { RateCell as RateCellType } from "@/lib/hooks/useRatesData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

interface RateCellProps {
  roomTypeId: string;
  roomTypeName: string;
  date: Date;
  rateData: RateCellType;
  isUpdating?: boolean;
  onUpdate: (price: number, availability?: number) => Promise<void>;
  onDelete?: () => Promise<void>;
  className?: string;
}

const RateCell = memo(function RateCell({
  roomTypeId,
  roomTypeName,
  date,
  rateData,
  isUpdating = false,
  onUpdate,
  onDelete,
  className
}: RateCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(rateData.finalPrice.toString());
  const [editAvailability, setEditAvailability] = useState(
    rateData.availability.toString()
  );
  const [showDetails, setShowDetails] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dateString = format(date, "yyyy-MM-dd");

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update local state when rateData changes
  useEffect(() => {
    setEditPrice(rateData.finalPrice.toString());
    setEditAvailability(rateData.availability.toString());
  }, [rateData.finalPrice, rateData.availability]);

  const handleStartEdit = () => {
    if (isUpdating) return;
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditPrice(rateData.finalPrice.toString());
    setEditAvailability(rateData.availability.toString());
  };

  const handleSaveEdit = async () => {
    const newPrice = parseFloat(editPrice);
    const newAvailability = parseInt(editAvailability);

    if (isNaN(newPrice) || newPrice < 0) {
      return; // Invalid price
    }

    if (isNaN(newAvailability) || newAvailability < 0) {
      return; // Invalid availability
    }

    try {
      await onUpdate(newPrice, newAvailability);
      setIsEditing(false);
    } catch (error) {
      // Error handling is done in the hook
      console.error("Failed to update rate:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !rateData.isOverride) return;

    try {
      await onDelete();
      setShowDetails(false);
    } catch (error) {
      console.error("Failed to delete rate:", error);
    }
  };

  // Determine cell styling based on rate type
  const getCellStyling = () => {
    if (rateData.isOverride) {
      return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    } else if (rateData.isSeasonal) {
      return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
    } else {
      return "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    }
  };

  const getPriceColor = () => {
    if (rateData.isOverride) {
      return "text-blue-700 dark:text-blue-300";
    } else if (rateData.isSeasonal) {
      return "text-orange-700 dark:text-orange-300";
    } else {
      return "text-gray-900 dark:text-gray-100";
    }
  };

  const getAvailabilityColor = () => {
    if (rateData.availability === 0) {
      return "text-red-600 dark:text-red-400";
    } else if (rateData.availability <= 2) {
      return "text-yellow-600 dark:text-yellow-400";
    } else {
      return "text-green-600 dark:text-green-400";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isEditing) {
    return (
      <td className={cn("p-2 border text-center", getCellStyling(), className)}>
        <div className="space-y-2">
          <div className="flex items-center space-x-1">
            <Input
              ref={inputRef}
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm text-center"
              min="0"
              step="0.01"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSaveEdit}
              disabled={isUpdating}
              className="h-8 w-8 p-0"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEdit}
              disabled={isUpdating}
              className="h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Input
            type="number"
            value={editAvailability}
            onChange={(e) => setEditAvailability(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-6 text-xs text-center"
            min="0"
            placeholder="Availability"
          />
        </div>
      </td>
    );
  }

  return (
    <TooltipProvider>
      <td
        className={cn(
          "p-2 border text-center relative group",
          getCellStyling(),
          className
        )}
      >
        <Popover open={showDetails} onOpenChange={setShowDetails}>
          <PopoverTrigger asChild>
            <div
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded p-1 transition-colors"
              onClick={() => setShowDetails(true)}
            >
              {/* Price Display */}
              <div className={cn("font-medium text-sm", getPriceColor())}>
                {formatCurrency(rateData.finalPrice)}
              </div>

              {/* Availability Display */}
              <div className={cn("text-xs mt-1", getAvailabilityColor())}>
                <Users className="inline h-3 w-3 mr-1" />
                {rateData.availability}
              </div>

              {/* Rate Type Indicator */}
              {(rateData.isOverride || rateData.isSeasonal) && (
                <div className="absolute top-1 right-1">
                  {rateData.isOverride && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Calendar className="h-3 w-3 text-blue-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Daily Override</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {rateData.isSeasonal && (
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Seasonal Rate</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}

              {/* Edit Button (shown on hover) */}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit();
                }}
                disabled={isUpdating}
                className="absolute top-1 left-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            </div>
          </PopoverTrigger>

          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Rate Details</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartEdit}
                  disabled={isUpdating}
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Room Type:</span>
                  <p className="font-medium">{roomTypeName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <p className="font-medium">{format(date, "MMM d, yyyy")}</p>
                </div>
                <div>
                  <span className="text-gray-500">Base Price:</span>
                  <p className="font-medium">
                    {formatCurrency(rateData.basePrice)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Final Price:</span>
                  <p className={cn("font-medium", getPriceColor())}>
                    {formatCurrency(rateData.finalPrice)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Availability:</span>
                  <p className={cn("font-medium", getAvailabilityColor())}>
                    {rateData.availability} rooms
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Rate Type:</span>
                  <p className="font-medium">
                    {rateData.isOverride
                      ? "Daily Override"
                      : rateData.isSeasonal
                      ? "Seasonal Rate"
                      : "Base Rate"}
                  </p>
                </div>
              </div>

              {/* Restrictions */}
              {(rateData.restrictions.minLOS ||
                rateData.restrictions.maxLOS ||
                rateData.restrictions.closedToArrival ||
                rateData.restrictions.closedToDeparture) && (
                <div className="border-t pt-3">
                  <span className="text-gray-500 text-sm">Restrictions:</span>
                  <div className="mt-1 space-y-1 text-sm">
                    {rateData.restrictions.minLOS && (
                      <p>Min LOS: {rateData.restrictions.minLOS} nights</p>
                    )}
                    {rateData.restrictions.maxLOS && (
                      <p>Max LOS: {rateData.restrictions.maxLOS} nights</p>
                    )}
                    {rateData.restrictions.closedToArrival && (
                      <p className="text-red-600">Closed to Arrival</p>
                    )}
                    {rateData.restrictions.closedToDeparture && (
                      <p className="text-red-600">Closed to Departure</p>
                    )}
                  </div>
                </div>
              )}

              {/* Delete Override Button */}
              {rateData.isOverride && onDelete && (
                <div className="border-t pt-3">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isUpdating}
                    className="w-full"
                  >
                    Remove Daily Override
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Loading Overlay */}
        {isUpdating && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
          </div>
        )}
      </td>
    </TooltipProvider>
  );
});

export default RateCell;
