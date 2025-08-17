"use client";

import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import {
  History,
  Filter,
  Download,
  User,
  Calendar,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useRateLogs } from "@/lib/hooks/useRatesData";
import { RoomTypeRates } from "@/lib/hooks/useRatesData";

interface RateLogsViewerProps {
  roomTypes: RoomTypeRates[];
}

export default function RateLogsViewer({ roomTypes }: RateLogsViewerProps) {
  const [filters, setFilters] = useState({
    roomTypeId: "",
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    changeType: "",
    limit: 50
  });

  const { logs, isLoading, pagination } = useRateLogs(filters);

  // Group logs by date for better organization
  const groupedLogs = useMemo(() => {
    const groups: Record<string, typeof logs> = {};
    logs.forEach((log) => {
      const dateKey = format(new Date(log.createdAt), "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });
    return groups;
  }, [logs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPriceChangeIcon = (oldPrice: number | null, newPrice: number) => {
    if (oldPrice === null)
      return <TrendingUp className="h-4 w-4 text-blue-500" />;
    if (newPrice > oldPrice)
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (newPrice < oldPrice)
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4" />; // No change
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case "BASE_RATE":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "DAILY_RATE":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "SEASONAL_RATE":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "DAILY_RATE_DELETED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatChangeType = (changeType: string) => {
    switch (changeType) {
      case "BASE_RATE":
        return "Base Rate";
      case "DAILY_RATE":
        return "Daily Override";
      case "SEASONAL_RATE":
        return "Seasonal Rate";
      case "DAILY_RATE_DELETED":
        return "Override Removed";
      default:
        return changeType.replace(/_/g, " ");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5" />
          <h3 className="text-lg font-medium">Rate Change Logs</h3>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="roomType">Room Type</Label>
            <Select
              value={filters.roomTypeId}
              onValueChange={(value) => handleFilterChange("roomTypeId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All room types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Room Types</SelectItem>
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

          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="changeType">Change Type</Label>
            <Select
              value={filters.changeType}
              onValueChange={(value) => handleFilterChange("changeType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All changes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Changes</SelectItem>
                <SelectItem value="BASE_RATE">Base Rate</SelectItem>
                <SelectItem value="DAILY_RATE">Daily Override</SelectItem>
                <SelectItem value="SEASONAL_RATE">Seasonal Rate</SelectItem>
                <SelectItem value="DAILY_RATE_DELETED">
                  Override Removed
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="limit">Show</Label>
            <Select
              value={filters.limit.toString()}
              onValueChange={(value) => handleFilterChange("limit", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 entries</SelectItem>
                <SelectItem value="50">50 entries</SelectItem>
                <SelectItem value="100">100 entries</SelectItem>
                <SelectItem value="200">200 entries</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Logs Display */}
      {isLoading ? (
        <div className="text-center py-8">Loading rate change logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No rate changes found for the selected filters.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLogs).map(([dateKey, dayLogs]) => (
            <div key={dateKey} className="space-y-3">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(dateKey), "EEEE, MMMM d, yyyy")}</span>
                <span className="text-xs">({dayLogs.length} changes)</span>
              </div>

              <div className="space-y-2">
                {dayLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white dark:bg-gray-800 border rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-medium">
                            {log.roomType.name}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getChangeTypeColor(
                              log.changeType
                            )}`}
                          >
                            {formatChangeType(log.changeType)}
                          </span>
                          {log.date && (
                            <span className="text-sm text-gray-500">
                              {format(new Date(log.date), "MMM d")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-2">
                            {getPriceChangeIcon(log.oldPrice, log.newPrice)}
                            <span>
                              {log.oldPrice !== null
                                ? formatCurrency(log.oldPrice)
                                : "New"}
                              → {formatCurrency(log.newPrice)}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 text-gray-500">
                            <User className="h-3 w-3" />
                            <span>{log.user.name || log.user.email}</span>
                          </div>

                          <span className="text-gray-500">
                            {format(new Date(log.createdAt), "h:mm a")}
                          </span>
                        </div>

                        {log.reason && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {log.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Pagination Info */}
          {pagination && (
            <div className="text-center text-sm text-gray-500">
              Showing {logs.length} of {pagination.total} entries
              {pagination.hasMore && (
                <Button variant="outline" size="sm" className="ml-4">
                  Load More
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
