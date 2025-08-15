// File: src/components/dashboard/PropertyDashboard.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Building2,
  Bed,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface PropertyInfo {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
}

export function PropertyDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPropertyId = session?.user?.currentPropertyId;
  const currentProperty = session?.user?.availableProperties?.find(
    (p) => p.id === currentPropertyId
  );

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load property info and dashboard stats
      const [propertyResponse, statsResponse] = await Promise.all([
        fetch(`/api/properties/${currentPropertyId}`),
        fetch(`/api/dashboard/stats?propertyId=${currentPropertyId}`)
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
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [currentPropertyId]);

  useEffect(() => {
    if (currentPropertyId) {
      loadDashboardData();
    }
  }, [currentPropertyId, loadDashboardData]);

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
    <div className="p-8 space-y-6">
      {/* Property Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold">{currentProperty.name}</h1>
            {propertyInfo && (
              <p className="text-muted-foreground">
                {propertyInfo.address}, {propertyInfo.city},{" "}
                {propertyInfo.state}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            {currentProperty.role?.toLowerCase().replace("_", " ") || "No Role"}
          </Badge>
          {currentProperty.isDefault && (
            <Badge variant="outline">Default Property</Badge>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Room Stats */}
        <Card className="card-hover purple-accent-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-primary number-hover cursor-pointer">
              {stats?.totalRooms || 0}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span className="text-success">
                Available: {stats?.availableRooms || 0}
              </span>
              <span className="text-destructive">
                Occupied: {stats?.occupiedRooms || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Occupancy Rate */}
        <Card className="card-hover purple-accent-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Occupancy Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-primary number-hover cursor-pointer">
              {stats?.occupancyRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.occupiedRooms || 0} of {stats?.totalRooms || 0} rooms
              occupied
            </p>
          </CardContent>
        </Card>

        {/* Today's Check-ins */}
        <Card className="card-hover purple-accent-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Check-ins
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-primary number-hover cursor-pointer">
              {stats?.todayCheckIns || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Check-outs: {stats?.todayCheckOuts || 0}
            </p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="card-hover purple-accent-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-primary number-hover cursor-pointer">
              ${stats?.revenue.thisMonth?.toLocaleString() || "0"}
            </div>
            <p
              className={`text-xs ${
                revenueGrowth >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {revenueGrowth >= 0 ? "+" : ""}
              {revenueGrowth.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover purple-accent-hover">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Reservations</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Total Active
              </span>
              <span className="font-medium text-purple-primary">
                {stats?.totalReservations || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="font-medium text-warning">
                {stats?.pendingReservations || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover purple-accent-hover">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bed className="h-5 w-5" />
              <span>Room Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Available</span>
              <span className="font-medium text-purple-primary">
                {stats?.availableRooms || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Maintenance</span>
              <span className="font-medium text-purple-primary">
                {stats?.maintenanceRooms || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover purple-accent-hover">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Today&apos;s Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-primary number-hover cursor-pointer">
              ${stats?.revenue.today?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              From {stats?.todayCheckIns || 0} check-ins
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
