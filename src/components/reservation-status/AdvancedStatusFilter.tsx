"use client";

import React, { useState, useMemo } from "react";
import { ReservationStatus } from "@prisma/client";
import { StatusBadge } from "@/components/reservation-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  XMarkIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon
} from "@heroicons/react/24/outline";
import { DateRange } from "react-day-picker";

interface FilterCriteria {
  search: string;
  statuses: ReservationStatus[];
  paymentStatuses: string[];
  dateRange: DateRange | undefined;
  roomNumbers: string[];
  guestTypes: string[];
  sortBy: "checkIn" | "checkOut" | "guestName" | "status" | "createdAt";
  sortOrder: "asc" | "desc";
  showCancelled: boolean;
  showNoShow: boolean;
}

interface AdvancedStatusFilterProps {
  onFilterChange: (criteria: FilterCriteria) => void;
  availableRooms?: string[];
  availablePaymentStatuses?: string[];
  className?: string;
}

const DEFAULT_FILTERS: FilterCriteria = {
  search: "",
  statuses: [],
  paymentStatuses: [],
  dateRange: undefined,
  roomNumbers: [],
  guestTypes: [],
  sortBy: "checkIn",
  sortOrder: "asc",
  showCancelled: false,
  showNoShow: false
};

export default function AdvancedStatusFilter({
  onFilterChange,
  availableRooms = [],
  availablePaymentStatuses = ["PAID", "PARTIALLY_PAID", "UNPAID"],
  className = ""
}: AdvancedStatusFilterProps) {
  const [filters, setFilters] = useState<FilterCriteria>(DEFAULT_FILTERS);
  const [isOpen, setIsOpen] = useState(false);

  // Calculate active filter count using useMemo instead of useEffect
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.paymentStatuses.length > 0) count++;
    if (filters.dateRange?.from || filters.dateRange?.to) count++;
    if (filters.roomNumbers.length > 0) count++;
    if (filters.guestTypes.length > 0) count++;
    if (!filters.showCancelled || !filters.showNoShow) count++;
    return count;
  }, [filters]);

  // Update filters and notify parent
  const updateFilters = (newFilters: Partial<FilterCriteria>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  // Handle status selection
  const handleStatusToggle = (status: ReservationStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    updateFilters({ statuses: newStatuses });
  };

  // Handle payment status selection
  const handlePaymentStatusToggle = (paymentStatus: string) => {
    const newPaymentStatuses = filters.paymentStatuses.includes(paymentStatus)
      ? filters.paymentStatuses.filter((s) => s !== paymentStatus)
      : [...filters.paymentStatuses, paymentStatus];
    updateFilters({ paymentStatuses: newPaymentStatuses });
  };

  // Handle room number selection
  const handleRoomToggle = (roomNumber: string) => {
    const newRoomNumbers = filters.roomNumbers.includes(roomNumber)
      ? filters.roomNumbers.filter((r) => r !== roomNumber)
      : [...filters.roomNumbers, roomNumber];
    updateFilters({ roomNumbers: newRoomNumbers });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    onFilterChange(DEFAULT_FILTERS);
  };

  // Quick filter presets
  const applyQuickFilter = (preset: string) => {
    switch (preset) {
      case "today-checkins":
        const today = new Date();
        updateFilters({
          dateRange: { from: today, to: today },
          statuses: [ReservationStatus.CONFIRMED],
          sortBy: "checkIn"
        });
        break;
      case "pending-confirmation":
        updateFilters({
          statuses: [ReservationStatus.CONFIRMATION_PENDING],
          sortBy: "createdAt",
          sortOrder: "desc"
        });
        break;
      case "current-guests":
        updateFilters({
          statuses: [ReservationStatus.IN_HOUSE],
          sortBy: "checkOut"
        });
        break;
      case "unpaid-reservations":
        updateFilters({
          paymentStatuses: ["UNPAID", "PARTIALLY_PAID"],
          statuses: [ReservationStatus.CONFIRMED, ReservationStatus.IN_HOUSE],
          sortBy: "checkIn"
        });
        break;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Filter Bar */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by guest name, room, or reservation ID..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Quick Sort */}
        <Select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onValueChange={(value) => {
            const [sortBy, sortOrder] = value.split("-") as [
              typeof filters.sortBy,
              typeof filters.sortOrder
            ];
            updateFilters({ sortBy, sortOrder });
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="checkIn-asc">Check-in (Earliest)</SelectItem>
            <SelectItem value="checkIn-desc">Check-in (Latest)</SelectItem>
            <SelectItem value="checkOut-asc">Check-out (Earliest)</SelectItem>
            <SelectItem value="checkOut-desc">Check-out (Latest)</SelectItem>
            <SelectItem value="guestName-asc">Guest Name (A-Z)</SelectItem>
            <SelectItem value="guestName-desc">Guest Name (Z-A)</SelectItem>
            <SelectItem value="status-asc">Status (A-Z)</SelectItem>
            <SelectItem value="createdAt-desc">Recently Created</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced Filters Toggle */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Advanced Filters</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    disabled={activeFilterCount === 0}
                  >
                    Clear All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Filter Presets */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Quick Filters
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickFilter("today-checkins")}
                      className="text-xs"
                    >
                      Today&apos;s Check-ins
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickFilter("pending-confirmation")}
                      className="text-xs"
                    >
                      Pending Confirmation
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickFilter("current-guests")}
                      className="text-xs"
                    >
                      Current Guests
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickFilter("unpaid-reservations")}
                      className="text-xs"
                    >
                      Unpaid Reservations
                    </Button>
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Reservation Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(ReservationStatus).map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={filters.statuses.includes(status)}
                          onCheckedChange={() => handleStatusToggle(status)}
                        />
                        <label
                          htmlFor={`status-${status}`}
                          className="text-sm flex items-center gap-2 cursor-pointer"
                        >
                          <StatusBadge status={status} size="sm" />
                          <span className="text-xs">
                            {status.replace("_", " ")}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Status Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Payment Status
                  </label>
                  <div className="space-y-2">
                    {availablePaymentStatuses.map((paymentStatus) => (
                      <div
                        key={paymentStatus}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`payment-${paymentStatus}`}
                          checked={filters.paymentStatuses.includes(
                            paymentStatus
                          )}
                          onCheckedChange={() =>
                            handlePaymentStatusToggle(paymentStatus)
                          }
                        />
                        <label
                          htmlFor={`payment-${paymentStatus}`}
                          className="text-sm cursor-pointer"
                        >
                          {paymentStatus.replace("_", " ")}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Date Range
                  </label>
                  <DatePickerWithRange
                    date={filters.dateRange}
                    onDateChange={(dateRange) => updateFilters({ dateRange })}
                  />
                </div>

                {/* Room Filter */}
                {availableRooms.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Rooms
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                      {availableRooms.map((roomNumber) => (
                        <div
                          key={roomNumber}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`room-${roomNumber}`}
                            checked={filters.roomNumbers.includes(roomNumber)}
                            onCheckedChange={() => handleRoomToggle(roomNumber)}
                          />
                          <label
                            htmlFor={`room-${roomNumber}`}
                            className="text-sm cursor-pointer"
                          >
                            {roomNumber}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Options */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Special Options
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-cancelled"
                        checked={filters.showCancelled}
                        onCheckedChange={(checked) =>
                          updateFilters({ showCancelled: !!checked })
                        }
                      />
                      <label
                        htmlFor="show-cancelled"
                        className="text-sm cursor-pointer"
                      >
                        Include cancelled reservations
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-no-show"
                        checked={filters.showNoShow}
                        onCheckedChange={(checked) =>
                          updateFilters({ showNoShow: !!checked })
                        }
                      />
                      <label
                        htmlFor="show-no-show"
                        className="text-sm cursor-pointer"
                      >
                        Include no-show reservations
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Active filters:</span>

          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: &quot;{filters.search}&quot;
              <XMarkIcon
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilters({ search: "" })}
              />
            </Badge>
          )}

          {filters.statuses.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {filters.statuses.length} selected
              <XMarkIcon
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilters({ statuses: [] })}
              />
            </Badge>
          )}

          {filters.paymentStatuses.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Payment: {filters.paymentStatuses.length} selected
              <XMarkIcon
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilters({ paymentStatuses: [] })}
              />
            </Badge>
          )}

          {(filters.dateRange?.from || filters.dateRange?.to) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              Date range
              <XMarkIcon
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilters({ dateRange: undefined })}
              />
            </Badge>
          )}

          {filters.roomNumbers.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Rooms: {filters.roomNumbers.length} selected
              <XMarkIcon
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilters({ roomNumbers: [] })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
