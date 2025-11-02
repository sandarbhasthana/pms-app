"use client";

import React, { useState, useMemo } from "react";
import { ReservationStatus } from "@prisma/client";
import { StatusBadge } from "@/components/reservation-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ClockIcon,
  UserIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  HandRaisedIcon
} from "@heroicons/react/24/outline";
import { formatRelativeTime } from "@/lib/utils/dateFormatter";

interface AuditTrailEntry {
  id: string;
  reservationId: string;
  fromStatus: ReservationStatus;
  toStatus: ReservationStatus;
  reason: string;
  changedBy: string;
  changedAt: string;
  isAutomatic: boolean;
  requiresApproval?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  metadata?: {
    userRole?: string;
    propertyId?: string;
    organizationId?: string;
    transitionType?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

interface EnhancedAuditTrailProps {
  entries: AuditTrailEntry[];
  reservationId?: string;
  showReservationFilter?: boolean;
  maxHeight?: string;
}

export default function EnhancedAuditTrail({
  entries,
  reservationId,
  showReservationFilter = false,
  maxHeight = "400px"
}: EnhancedAuditTrailProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | "manual" | "automatic">(
    "all"
  );
  const [dateRange, setDateRange] = useState<
    "all" | "today" | "week" | "month"
  >("all");

  // Filter and search entries using useMemo instead of useEffect
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Filter by reservation ID if specified
    if (reservationId) {
      filtered = filtered.filter(
        (entry) => entry.reservationId === reservationId
      );
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.reason.toLowerCase().includes(term) ||
          entry.changedBy.toLowerCase().includes(term) ||
          entry.fromStatus.toLowerCase().includes(term) ||
          entry.toStatus.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(
        (entry) =>
          entry.fromStatus === statusFilter || entry.toStatus === statusFilter
      );
    }

    // User filter
    if (userFilter) {
      filtered = filtered.filter((entry) =>
        entry.changedBy.toLowerCase().includes(userFilter.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((entry) =>
        typeFilter === "automatic" ? entry.isAutomatic : !entry.isAutomatic
      );
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateRange) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(
        (entry) => new Date(entry.changedAt) >= filterDate
      );
    }

    // Sort by date (newest first)
    return filtered.sort(
      (a, b) =>
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );
  }, [
    entries,
    reservationId,
    searchTerm,
    statusFilter,
    userFilter,
    typeFilter,
    dateRange
  ]);

  // Get unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const users = new Set(entries.map((entry) => entry.changedBy));
    return Array.from(users).sort();
  }, [entries]);

  // Get unique statuses for filter dropdown
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set([
      ...entries.map((entry) => entry.fromStatus),
      ...entries.map((entry) => entry.toStatus)
    ]);
    return Array.from(statuses).sort();
  }, [entries]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setUserFilter("");
    setTypeFilter("all");
    setDateRange("all");
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return formatRelativeTime(dateString);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              Audit Trail
            </span>
            <Badge variant="outline">{filteredEntries.length} entries</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {uniqueStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={status as ReservationStatus}
                        size="sm"
                      />
                      <span>{status.replace("_", " ")}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* User Filter */}
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All users</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(value: string) =>
                setTypeFilter(value as "all" | "manual" | "automatic")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All changes</SelectItem>
                <SelectItem value="manual">Manual only</SelectItem>
                <SelectItem value="automatic">Automatic only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Select
                value={dateRange}
                onValueChange={(value: string) =>
                  setDateRange(value as "all" | "today" | "week" | "month")
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last week</SelectItem>
                  <SelectItem value="month">Last month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              disabled={
                !searchTerm &&
                !statusFilter &&
                !userFilter &&
                typeFilter === "all" &&
                dateRange === "all"
              }
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail Entries */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0 overflow-y-auto" style={{ maxHeight }}>
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No audit trail entries found</p>
                {(searchTerm ||
                  statusFilter ||
                  userFilter ||
                  typeFilter !== "all" ||
                  dateRange !== "all") && (
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                )}
              </div>
            ) : (
              filteredEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`p-4 border-b border-gray-200 dark:border-gray-700 ${
                    index % 2 === 0
                      ? "bg-gray-50 dark:bg-gray-800/50"
                      : "bg-white dark:bg-gray-800"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Status Transition */}
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={entry.fromStatus} size="sm" />
                        <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                        <StatusBadge status={entry.toStatus} size="sm" />

                        {/* Change Type Badge */}
                        <Badge
                          variant={entry.isAutomatic ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {entry.isAutomatic ? (
                            <div className="flex items-center gap-1">
                              <ComputerDesktopIcon className="h-3 w-3" />
                              Auto
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <HandRaisedIcon className="h-3 w-3" />
                              Manual
                            </div>
                          )}
                        </Badge>

                        {/* Approval Badge */}
                        {entry.requiresApproval && (
                          <Badge variant="outline" className="text-xs">
                            {entry.approvedBy ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircleIcon className="h-3 w-3" />
                                Approved
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-amber-600">
                                <ExclamationTriangleIcon className="h-3 w-3" />
                                Pending
                              </div>
                            )}
                          </Badge>
                        )}
                      </div>

                      {/* Reason */}
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        <strong>Reason:</strong> {entry.reason}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {entry.changedBy}
                          {entry.metadata?.userRole && (
                            <Badge variant="outline" className="text-xs ml-1">
                              {entry.metadata.userRole}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {formatDate(entry.changedAt)}
                        </div>

                        {showReservationFilter && (
                          <div>
                            Reservation: {entry.reservationId.slice(-8)}
                          </div>
                        )}
                      </div>

                      {/* Approval Info */}
                      {entry.approvedBy && entry.approvedAt && (
                        <div className="text-xs text-green-600 mt-1">
                          Approved by {entry.approvedBy} on{" "}
                          {formatDate(entry.approvedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
