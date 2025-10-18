"use client";

import React, { useState, useMemo } from "react";
import { ReservationStatus } from "@prisma/client";
import {
  BulkStatusManager,
  AdvancedStatusFilter,
  EnhancedAuditTrail
} from "@/components/reservation-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from "react-day-picker";
import {
  ClipboardDocumentListIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";

// Mock data for testing
const MOCK_RESERVATIONS = [
  {
    id: "res-001",
    guestName: "John Smith",
    roomNumber: "101",
    checkIn: "2024-01-15",
    checkOut: "2024-01-18",
    status: ReservationStatus.CONFIRMATION_PENDING,
    paymentStatus: "UNPAID"
  },
  {
    id: "res-002",
    guestName: "Sarah Johnson",
    roomNumber: "102",
    checkIn: "2024-01-16",
    checkOut: "2024-01-20",
    status: ReservationStatus.CONFIRMED,
    paymentStatus: "PAID"
  },
  {
    id: "res-003",
    guestName: "Mike Wilson",
    roomNumber: "201",
    checkIn: "2024-01-14",
    checkOut: "2024-01-17",
    status: ReservationStatus.IN_HOUSE,
    paymentStatus: "PARTIALLY_PAID"
  },
  {
    id: "res-004",
    guestName: "Emily Davis",
    roomNumber: "202",
    checkIn: "2024-01-17",
    checkOut: "2024-01-21",
    status: ReservationStatus.CONFIRMED,
    paymentStatus: "PAID"
  },
  {
    id: "res-005",
    guestName: "Robert Brown",
    roomNumber: "301",
    checkIn: "2024-01-13",
    checkOut: "2024-01-16",
    status: ReservationStatus.CHECKED_OUT,
    paymentStatus: "PAID"
  },
  {
    id: "res-006",
    guestName: "Lisa Anderson",
    roomNumber: "302",
    checkIn: "2024-01-18",
    checkOut: "2024-01-22",
    status: ReservationStatus.CONFIRMATION_PENDING,
    paymentStatus: "UNPAID"
  }
];

const MOCK_AUDIT_ENTRIES = [
  {
    id: "audit-001",
    reservationId: "res-001",
    fromStatus: ReservationStatus.CONFIRMATION_PENDING,
    toStatus: ReservationStatus.CONFIRMED,
    reason: "Payment received via credit card",
    changedBy: "John Doe (Front Desk)",
    changedAt: "2024-01-15T10:30:00Z",
    isAutomatic: false,
    metadata: {
      userRole: "FRONT_DESK",
      propertyId: "prop-001",
      transitionType: "manual"
    }
  },
  {
    id: "audit-002",
    reservationId: "res-002",
    fromStatus: ReservationStatus.CONFIRMED,
    toStatus: ReservationStatus.IN_HOUSE,
    reason: "Guest checked in at front desk",
    changedBy: "Jane Smith (Front Desk)",
    changedAt: "2024-01-16T15:45:00Z",
    isAutomatic: false,
    metadata: {
      userRole: "FRONT_DESK",
      propertyId: "prop-001",
      transitionType: "manual"
    }
  },
  {
    id: "audit-003",
    reservationId: "res-003",
    fromStatus: ReservationStatus.IN_HOUSE,
    toStatus: ReservationStatus.CHECKED_OUT,
    reason: "Automatic checkout - past checkout time",
    changedBy: "System",
    changedAt: "2024-01-17T12:00:00Z",
    isAutomatic: true,
    metadata: {
      userRole: "SYSTEM",
      propertyId: "prop-001",
      transitionType: "automatic"
    }
  },
  {
    id: "audit-004",
    reservationId: "res-004",
    fromStatus: ReservationStatus.CONFIRMATION_PENDING,
    toStatus: ReservationStatus.CANCELLED,
    reason: "Guest requested cancellation",
    changedBy: "Mike Johnson (Manager)",
    changedAt: "2024-01-14T09:15:00Z",
    isAutomatic: false,
    requiresApproval: true,
    approvedBy: "Sarah Wilson (Property Manager)",
    approvedAt: "2024-01-14T09:30:00Z",
    metadata: {
      userRole: "PROPERTY_MGR",
      propertyId: "prop-001",
      transitionType: "manual"
    }
  }
];

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

export default function BulkOperationsTestPage() {
  const [reservations, setReservations] = useState(MOCK_RESERVATIONS);
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
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
  });

  // Filter reservations based on criteria - using useMemo instead of useEffect
  const filteredReservations = useMemo(() => {
    let filtered = [...reservations];

    // Search filter
    if (filterCriteria.search) {
      const searchTerm = filterCriteria.search.toLowerCase();
      filtered = filtered.filter(
        (res) =>
          res.guestName.toLowerCase().includes(searchTerm) ||
          res.roomNumber?.toLowerCase().includes(searchTerm) ||
          res.id.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    if (filterCriteria.statuses.length > 0) {
      filtered = filtered.filter((res) =>
        filterCriteria.statuses.includes(res.status)
      );
    }

    // Payment status filter
    if (filterCriteria.paymentStatuses.length > 0) {
      filtered = filtered.filter(
        (res) =>
          res.paymentStatus &&
          filterCriteria.paymentStatuses.includes(res.paymentStatus)
      );
    }

    // Room filter
    if (filterCriteria.roomNumbers.length > 0) {
      filtered = filtered.filter(
        (res) =>
          res.roomNumber && filterCriteria.roomNumbers.includes(res.roomNumber)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: Date | string;
      let bValue: Date | string;

      switch (filterCriteria.sortBy) {
        case "checkIn":
          aValue = new Date(a.checkIn);
          bValue = new Date(b.checkIn);
          break;
        case "checkOut":
          aValue = new Date(a.checkOut);
          bValue = new Date(b.checkOut);
          break;
        case "guestName":
          aValue = a.guestName;
          bValue = b.guestName;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.checkIn;
          bValue = b.checkIn;
      }

      if (aValue < bValue) return filterCriteria.sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return filterCriteria.sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [reservations, filterCriteria]);

  // Handle reservation updates from bulk manager
  const handleReservationsUpdate = (
    updatedReservations: Array<{
      id: string;
      guestName: string;
      roomNumber?: string;
      checkIn: string;
      checkOut: string;
      status: ReservationStatus;
      paymentStatus?: string;
    }>
  ) => {
    setReservations(updatedReservations as typeof reservations);
  };

  // Get available room numbers for filter
  const availableRooms = useMemo(() => {
    const rooms = new Set(
      reservations.map((res) => res.roomNumber).filter(Boolean)
    );
    return Array.from(rooms).sort();
  }, [reservations]);

  // Calculate statistics
  const stats = useMemo(() => {
    const statusCounts = reservations.reduce((acc, res) => {
      acc[res.status] = (acc[res.status] || 0) + 1;
      return acc;
    }, {} as Record<ReservationStatus, number>);

    const paymentCounts = reservations.reduce((acc, res) => {
      if (res.paymentStatus) {
        acc[res.paymentStatus] = (acc[res.paymentStatus] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return { statusCounts, paymentCounts };
  }, [reservations]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Bulk Operations Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Test bulk status management, advanced filtering, and audit trail
            functionality
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredReservations.length} / {reservations.length} reservations
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reservations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Filtered Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredReservations.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats.statusCounts[ReservationStatus.CONFIRMATION_PENDING] || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Current Guests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.statusCounts[ReservationStatus.IN_HOUSE] || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="bulk-manager" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bulk-manager" className="flex items-center gap-2">
            <ClipboardDocumentListIcon className="h-4 w-4" />
            Bulk Manager
          </TabsTrigger>
          <TabsTrigger
            value="advanced-filter"
            className="flex items-center gap-2"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            Advanced Filter
          </TabsTrigger>
          <TabsTrigger value="audit-trail" className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk-manager" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardDocumentListIcon className="h-5 w-5" />
                Bulk Status Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BulkStatusManager
                reservations={filteredReservations}
                onReservationsUpdate={handleReservationsUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced-filter" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
                Advanced Status Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdvancedStatusFilter
                onFilterChange={setFilterCriteria}
                availableRooms={availableRooms}
                availablePaymentStatuses={["PAID", "PARTIALLY_PAID", "UNPAID"]}
              />

              {/* Filter Results Preview */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-medium mb-3">Filter Results Preview</h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredReservations.length} of {reservations.length}{" "}
                  reservations
                </div>
                <div className="mt-2 space-y-1">
                  {filteredReservations.slice(0, 3).map((res) => (
                    <div key={res.id} className="text-sm">
                      {res.guestName} - Room {res.roomNumber} - {res.status}
                    </div>
                  ))}
                  {filteredReservations.length > 3 && (
                    <div className="text-sm text-gray-500">
                      ... and {filteredReservations.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-trail" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                Enhanced Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedAuditTrail
                entries={MOCK_AUDIT_ENTRIES}
                showReservationFilter={true}
                maxHeight="500px"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Debug Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Current Filter Criteria:</h4>
              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(filterCriteria, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Statistics:</h4>
              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
