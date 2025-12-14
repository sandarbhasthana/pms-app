// File: src/components/dashboard/PropertyDashboard.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Building2,
  Bed,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PropertyStatusTag,
  RoleTag,
  OrganizationRole
} from "@/components/ui/role-tag";
import AnalyticsTab from "./AnalyticsTab";

interface DashboardStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  totalReservations: number;
  pendingReservations: number;
  revenue: {
    today: number;
    thisMonth: number;
    lastMonth: number;
  };
  occupancyRate: number;
}

interface ReservationData {
  id: string;
  guestName: string;
  roomNumber: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  email: string;
  phone: string;
}

interface DashboardReservations {
  date: string;
  checkIns: ReservationData[];
  checkOuts: ReservationData[];
  stayingGuests: ReservationData[];
  summary: {
    totalCheckIns: number;
    totalCheckOuts: number;
    totalStaying: number;
    totalReservations: number;
  };
}

interface ActivityData {
  id: string;
  type: "sale" | "cancellation" | "overbooking";
  guestName: string;
  roomNumber: string;
  roomType: string;
  amount: number;
  checkIn: string;
  checkOut: string;
  status: string;
  createdAt: string;
  description: string;
}

interface DashboardActivities {
  type: string;
  date: string;
  activities: ActivityData[];
  stats: {
    count: number;
    totalAmount: number;
    averageAmount: number;
  };
  summary: {
    totalActivities: number;
    hasActivities: boolean;
  };
}

interface PropertyInfo {
  id: string;
  name: string;
  suite?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  address?: string | null; // Legacy field
}

export function PropertyDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // New state for reservations and activities
  const [reservations, setReservations] =
    useState<DashboardReservations | null>(null);
  const [tomorrowReservations, setTomorrowReservations] =
    useState<DashboardReservations | null>(null);
  const [activities, setActivities] = useState<DashboardActivities | null>(
    null
  );
  const [selectedReservationDay, setSelectedReservationDay] = useState<
    "today" | "tomorrow"
  >("today");
  const [selectedActivityType, setSelectedActivityType] = useState<
    "sales" | "cancellations" | "overbookings"
  >("sales");

  // Check if user has access to analytics (ORG_ADMIN or PROPERTY_MGR only)
  const canViewAnalytics = useMemo(() => {
    if (!session?.user?.role) return false;

    // Check organization-level role first
    const orgRole = session.user.role;
    if (orgRole === "ORG_ADMIN" || orgRole === "PROPERTY_MGR") {
      return true;
    }

    // For property-specific roles, check current property role
    if (session.user.currentPropertyId && session.user.availableProperties) {
      const currentProperty = session.user.availableProperties.find(
        (p) => p.id === session.user.currentPropertyId
      );
      const propertyRole = currentProperty?.role;
      return propertyRole === "PROPERTY_MGR";
    }

    return false;
  }, [
    session?.user?.role,
    session?.user?.currentPropertyId,
    session?.user?.availableProperties
  ]);

  // Memoize property ID to prevent unnecessary re-calculations
  const currentPropertyId = useMemo(() => {
    // First try session
    if (session?.user?.currentPropertyId) {
      return session.user.currentPropertyId;
    }

    // Fallback to cookie
    const propertyIdFromCookie =
      typeof window !== "undefined"
        ? document.cookie
            .split("; ")
            .find((row) => row.startsWith("propertyId="))
            ?.split("=")[1]
        : null;

    return propertyIdFromCookie;
  }, [session?.user?.currentPropertyId]);

  const currentProperty = useMemo(() => {
    return session?.user?.availableProperties?.find(
      (p) => p.id === currentPropertyId
    );
  }, [session?.user?.availableProperties, currentPropertyId]);

  // OPTIMIZATION: Load only essential data on initial load
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load only essential data: property info and stats
      // Defer tomorrow reservations and activities to lazy loading
      const [propertyResponse, statsResponse, reservationsResponse] =
        await Promise.all([
          fetch(`/api/properties/${currentPropertyId}`),
          fetch(`/api/dashboard/stats?propertyId=${currentPropertyId}`),
          fetch(
            `/api/dashboard/reservations?propertyId=${currentPropertyId}&day=today`
          )
        ]);

      if (!propertyResponse.ok || !statsResponse.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const [propertyData, statsData] = await Promise.all([
        propertyResponse.json(),
        statsResponse.json()
      ]);

      setPropertyInfo(propertyData);
      setStats(statsData);

      // Load today's reservations (essential data)
      try {
        if (reservationsResponse.ok) {
          const reservationsData = await reservationsResponse.json();
          setReservations(reservationsData);
        }
      } catch (error) {
        console.warn("Failed to load today's reservations:", error);
      }

      // OPTIMIZATION: Load tomorrow reservations and activities lazily (on demand)
      // This defers non-essential data loading to improve initial load time
      // Schedule these as background tasks after initial load completes
      setTimeout(() => {
        // Load tomorrow reservations in background
        fetch(
          `/api/dashboard/reservations?propertyId=${currentPropertyId}&day=tomorrow`
        )
          .then((res) => res.json())
          .then((data) => setTomorrowReservations(data))
          .catch((err) =>
            console.warn("Failed to load tomorrow's reservations:", err)
          );

        // Load activities in background
        fetch(
          `/api/dashboard/activities?propertyId=${currentPropertyId}&type=${selectedActivityType}`
        )
          .then((res) => res.json())
          .then((data) => setActivities(data))
          .catch((err) => console.warn("Failed to load activities:", err));
      }, 100); // Small delay to prioritize initial render
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [currentPropertyId, selectedActivityType]);

  useEffect(() => {
    if (currentPropertyId) {
      loadDashboardData();
    }
  }, [currentPropertyId, loadDashboardData]);

  // Helper function to load activities when type changes
  const loadActivities = useCallback(
    async (type: "sales" | "cancellations" | "overbookings") => {
      try {
        const response = await fetch(
          `/api/dashboard/activities?propertyId=${currentPropertyId}&type=${type}`
        );
        if (response.ok) {
          const activitiesData = await response.json();
          setActivities(activitiesData);
        }
      } catch (error) {
        console.warn("Failed to load activities:", error);
      }
    },
    [currentPropertyId]
  );

  // Refresh handler for the refresh button - refreshes data without showing loading skeleton
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setError(null);

      // Load fresh data without triggering the full loading skeleton
      const [propertyResponse, statsResponse, reservationsResponse] =
        await Promise.all([
          fetch(`/api/properties/${currentPropertyId}`),
          fetch(`/api/dashboard/stats?propertyId=${currentPropertyId}`),
          fetch(
            `/api/dashboard/reservations?propertyId=${currentPropertyId}&day=today`
          )
        ]);

      if (!propertyResponse.ok || !statsResponse.ok) {
        throw new Error("Failed to refresh dashboard data");
      }

      const [propertyData, statsData] = await Promise.all([
        propertyResponse.json(),
        statsResponse.json()
      ]);

      setPropertyInfo(propertyData);
      setStats(statsData);

      // Load today's reservations
      try {
        if (reservationsResponse.ok) {
          const reservationsData = await reservationsResponse.json();
          setReservations(reservationsData);
        }
      } catch (error) {
        console.warn("Failed to load today's reservations:", error);
      }

      // Refresh tomorrow reservations and activities - wait for these to complete
      await Promise.all([
        fetch(
          `/api/dashboard/reservations?propertyId=${currentPropertyId}&day=tomorrow`
        )
          .then((res) => res.json())
          .then((data) => {
            setTomorrowReservations(data);
          })
          .catch((err) => {
            console.warn("Failed to load tomorrow's reservations:", err);
          }),
        fetch(
          `/api/dashboard/activities?propertyId=${currentPropertyId}&type=${selectedActivityType}`
        )
          .then((res) => res.json())
          .then((data) => {
            setActivities(data);
          })
          .catch((err) => {
            console.warn("Failed to load activities:", err);
          })
      ]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsRefreshing(false);
    }
  }, [currentPropertyId, selectedActivityType]);

  // Handle activity type change
  const handleActivityTypeChange = useCallback(
    (type: "sales" | "cancellations" | "overbookings") => {
      setSelectedActivityType(type);
      loadActivities(type);
    },
    [loadActivities]
  );

  // Handle reservation day change
  const handleReservationDayChange = useCallback(
    (day: "today" | "tomorrow") => {
      setSelectedReservationDay(day);
    },
    []
  );

  // Get current reservations based on selected day
  const currentReservations =
    selectedReservationDay === "today" ? reservations : tomorrowReservations;

  if (!currentPropertyId || !currentProperty) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No Property Selected
            </h3>
            <p className="text-muted-foreground">
              Please select a property to view the dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Error Loading Dashboard
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              type="button"
              onClick={loadDashboardData}
              className="btn-purple-primary px-4 py-2 rounded"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const revenueGrowth =
    stats?.revenue.thisMonth && stats?.revenue.lastMonth
      ? ((stats.revenue.thisMonth - stats.revenue.lastMonth) /
          stats.revenue.lastMonth) *
        100
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Modern Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg">
                  <Building2 className="h-6 w-6 text-purple-500 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {currentProperty.name}
                  </h1>
                  {propertyInfo && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {(() => {
                        // Try to use new separate fields first
                        const addressFields = [
                          propertyInfo.suite,
                          propertyInfo.street,
                          propertyInfo.city,
                          propertyInfo.state,
                          propertyInfo.zipCode,
                          propertyInfo.country
                        ];

                        const newFormatAddress = addressFields
                          .filter((field) => field && field.trim() !== "") // Filter out null, undefined, and empty strings
                          .join(", ");

                        // Fall back to legacy address field if new fields are empty
                        return newFormatAddress || propertyInfo.address || "";
                      })()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {currentProperty.role && (
                  <RoleTag role={currentProperty.role as OrganizationRole} />
                )}
                {currentProperty.isDefault && (
                  <PropertyStatusTag status="DEFAULT" />
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                title="Refresh Dashboard"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-lg ${
                  isRefreshing
                    ? "text-slate-600 dark:text-slate-400 cursor-not-allowed bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 transition-colors"
                }`}
              >
                <RefreshCw
                  className={`h-6 w-6 ${
                    isRefreshing ? "refresh-spinning" : ""
                  }`}
                />
              </button>
              <button
                type="button"
                title="Settings"
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 transition-colors"
              >
                <Settings className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Reservation</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Date Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </h2>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Arrivals */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                  <ArrowDownRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  ARRIVALS
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {stats?.todayCheckIns || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Expected today
            </div>
          </div>

          {/* Departures */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-500/10 rounded-lg">
                  <ArrowUpRight className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  DEPARTURES
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {stats?.todayCheckOuts || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Expected today
            </div>
          </div>

          {/* Occupancy */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  OCCUPANCY
                </span>
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {stats?.occupancyRate || 0}%
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {stats?.occupiedRooms || 0}/{stats?.totalRooms || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Rooms occupied
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              style={{
                backgroundColor:
                  activeTab === "overview"
                    ? document.documentElement.classList.contains("dark")
                      ? "#8b4aff"
                      : "#7210a2"
                    : "transparent"
              }}
              onMouseEnter={(e) => {
                if (activeTab === "overview") {
                  e.currentTarget.style.backgroundColor = "#8b5cf6";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab === "overview") {
                  e.currentTarget.style.backgroundColor =
                    document.documentElement.classList.contains("dark")
                      ? "#8b4aff"
                      : "#7210a2";
                }
              }}
            >
              Overview
            </TabsTrigger>
            {canViewAnalytics && (
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                style={{
                  backgroundColor:
                    activeTab === "analytics"
                      ? document.documentElement.classList.contains("dark")
                        ? "#8b4aff"
                        : "#7210a2"
                      : "transparent"
                }}
                onMouseEnter={(e) => {
                  if (activeTab === "analytics") {
                    e.currentTarget.style.backgroundColor = "#8b5cf6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab === "analytics") {
                    e.currentTarget.style.backgroundColor =
                      document.documentElement.classList.contains("dark")
                        ? "#8b4aff"
                        : "#7210a2";
                  }
                }}
              >
                Analytics & Reports
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Reservations Panel */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Reservations
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={loadDashboardData}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        title="Refresh Reservations"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reservation Tabs */}
                  <div className="flex space-x-6 mt-4">
                    <button
                      type="button"
                      onClick={() => handleReservationDayChange("today")}
                      className={`text-sm font-medium pb-2 ${
                        selectedReservationDay === "today"
                          ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Today ({reservations?.summary.totalReservations || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReservationDayChange("tomorrow")}
                      className={`text-sm font-medium pb-2 ${
                        selectedReservationDay === "tomorrow"
                          ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Tomorrow (
                      {tomorrowReservations?.summary.totalReservations || 0})
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    {currentReservations &&
                    currentReservations.summary.totalReservations > 0 ? (
                      <div className="space-y-3">
                        {/* Check-ins */}
                        {currentReservations.checkIns.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                              Check-ins ({currentReservations.checkIns.length})
                            </h4>
                            {currentReservations.checkIns
                              .slice(0, 3)
                              .map((reservation) => (
                                <div
                                  key={reservation.id}
                                  className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg mb-2"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium text-slate-900 dark:text-white text-sm">
                                      {reservation.guestName}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      Room {reservation.roomNumber} •{" "}
                                      {reservation.roomType}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                                      $
                                      {reservation.totalAmount?.toLocaleString() ||
                                        0}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      {new Date(
                                        reservation.checkIn
                                      ).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            {currentReservations.checkIns.length > 3 && (
                              <div className="text-center">
                                <button
                                  type="button"
                                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                  View {currentReservations.checkIns.length - 3}{" "}
                                  more
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Check-outs */}
                        {currentReservations.checkOuts.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                              Check-outs ({currentReservations.checkOuts.length}
                              )
                            </h4>
                            {currentReservations.checkOuts
                              .slice(0, 2)
                              .map((reservation) => (
                                <div
                                  key={reservation.id}
                                  className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg mb-2"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium text-slate-900 dark:text-white text-sm">
                                      {reservation.guestName}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      Room {reservation.roomNumber} •{" "}
                                      {reservation.roomType}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      {new Date(
                                        reservation.checkOut
                                      ).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-slate-400 dark:text-slate-500 mb-2">
                          <Calendar className="h-12 w-12 mx-auto" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">
                          No reservations for {selectedReservationDay}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Today's Activity Panel */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Today&apos;s Activity
                    </h3>
                    <button
                      type="button"
                      onClick={() => loadActivities(selectedActivityType)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      title="Refresh Activities"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Activity Tabs */}
                  <div className="flex space-x-6 mt-4">
                    <button
                      type="button"
                      onClick={() => handleActivityTypeChange("sales")}
                      className={`text-sm font-medium pb-2 ${
                        selectedActivityType === "sales"
                          ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Sales (
                      {activities?.type === "sales"
                        ? activities.stats.count
                        : 0}
                      )
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActivityTypeChange("cancellations")}
                      className={`text-sm font-medium pb-2 ${
                        selectedActivityType === "cancellations"
                          ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Cancellations (
                      {activities?.type === "cancellations"
                        ? activities.stats.count
                        : 0}
                      )
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActivityTypeChange("overbookings")}
                      className={`text-sm font-medium pb-2 ${
                        selectedActivityType === "overbookings"
                          ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Overbookings (
                      {activities?.type === "overbookings"
                        ? activities.stats.count
                        : 0}
                      )
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Activity Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {activities?.stats.count || 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {selectedActivityType === "sales"
                          ? "NEW BOOKINGS"
                          : selectedActivityType === "cancellations"
                          ? "CANCELLED"
                          : "RISKS"}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {stats?.occupiedRooms || 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        ROOM NIGHTS
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-2xl font-bold ${
                          selectedActivityType === "cancellations" &&
                          (activities?.stats.totalAmount || 0) < 0
                            ? "text-red-500"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        $
                        {Math.abs(
                          activities?.stats.totalAmount || 0
                        ).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {selectedActivityType === "sales"
                          ? "REVENUE"
                          : selectedActivityType === "cancellations"
                          ? "LOST REVENUE"
                          : "AT RISK"}
                      </div>
                    </div>
                  </div>

                  {/* Activity List */}
                  {activities && activities.summary.hasActivities ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Recent {selectedActivityType}
                      </h4>
                      {activities.activities.slice(0, 4).map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-slate-900 dark:text-white text-sm">
                              {activity.guestName}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {activity.description}
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-sm font-medium ${
                                activity.type === "cancellation"
                                  ? "text-red-500"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {activity.type === "cancellation" ? "-" : ""}$
                              {Math.abs(activity.amount).toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(
                                activity.createdAt
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                      {activities.activities.length > 4 && (
                        <div className="text-center">
                          <button
                            type="button"
                            className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            View {activities.activities.length - 4} more
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        No {selectedActivityType} today
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Total Rooms
                  </span>
                  <Bed className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats?.totalRooms || 0}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Available: {stats?.availableRooms || 0}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Revenue
                  </span>
                  <DollarSign className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  ${stats?.revenue.thisMonth?.toLocaleString() || "0"}
                </div>
                <div className="flex items-center space-x-1 text-xs mt-1">
                  {revenueGrowth > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />
                  )}
                  <span
                    className={
                      revenueGrowth > 0 ? "text-green-500" : "text-red-500"
                    }
                  >
                    {Math.abs(revenueGrowth).toFixed(1)}%
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    vs last month
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Reservations
                  </span>
                  <Calendar className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats?.totalReservations || 0}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Pending: {stats?.pendingReservations || 0}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Check-ins
                  </span>
                  <Clock className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats?.todayCheckIns || 0}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Check-outs: {stats?.todayCheckOuts || 0}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          {canViewAnalytics && (
            <TabsContent value="analytics" className="space-y-6 mt-6">
              <AnalyticsTab
                propertyId={currentPropertyId}
                isActive={activeTab === "analytics"}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default PropertyDashboard;
