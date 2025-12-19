// File: src/components/dashboard/AnalyticsTab.tsx
"use client";

import { useSession } from "next-auth/react";
import { BarChart3 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAnalyticsData } from "@/lib/hooks/useAnalyticsData";

// Lazy load analytics components for better performance
const StatusOverviewCards = lazy(() => import("./StatusOverviewCards"));
const StatusAnalyticsChart = lazy(() => import("./StatusAnalyticsChart"));
const RecentStatusActivity = lazy(() => import("./RecentStatusActivity"));
const StatusPerformanceMetrics = lazy(
  () => import("./StatusPerformanceMetrics")
);
const OrganizationStatusOverview = lazy(
  () => import("./OrganizationStatusOverview")
);

interface AnalyticsTabProps {
  propertyId: string;
  isActive: boolean;
}

// Loading skeleton component
const LoadingSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    </CardContent>
  </Card>
);

export default function AnalyticsTab({
  propertyId,
  isActive
}: AnalyticsTabProps) {
  const { data: session } = useSession();

  // ✅ PERFORMANCE OPTIMIZATION: Fetch analytics data once and pass to child components
  // Reduces API calls from 2-4 to 1
  const {
    data: analyticsData,
    isLoading,
    error
  } = useAnalyticsData(
    isActive ? propertyId : null,
    true,
    300000 // 5 minutes
  );

  // Only render content when tab is active to improve performance
  if (!isActive) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <span>Analytics & Reports</span>
        </h2>
        <div className="text-sm text-muted-foreground">
          Reservation Status Management
        </div>
      </div>

      {/* Organization Overview - Only for ORG_ADMIN */}
      {session?.user?.role === "ORG_ADMIN" && (
        <Suspense fallback={<LoadingSkeleton />}>
          <OrganizationStatusOverview
            organizationId={session.user.orgId}
            userRole={session.user.role}
            refreshInterval={300000}
          />
        </Suspense>
      )}

      {/* Property-Level Status Overview Cards */}
      <Suspense fallback={<LoadingSkeleton />}>
        <StatusOverviewCards
          propertyId={propertyId}
          refreshInterval={300000}
          showRecentActivity={true}
          data={analyticsData?.statusOverview}
          isLoading={isLoading}
          error={error}
        />
      </Suspense>

      {/* Analytics and Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Analytics Chart */}
        <Suspense fallback={<LoadingSkeleton />}>
          <StatusAnalyticsChart
            propertyId={propertyId}
            refreshInterval={900000}
            data={analyticsData?.chartData}
            isLoading={isLoading}
            error={error}
          />
        </Suspense>

        {/* Recent Activity Feed - Disabled auto-refresh to prevent duplicate API calls */}
        <Suspense fallback={<LoadingSkeleton />}>
          <RecentStatusActivity
            propertyId={propertyId}
            limit={15}
            refreshInterval={0}
            showFilters={true}
          />
        </Suspense>
      </div>

      {/* Performance Metrics */}
      <Suspense fallback={<LoadingSkeleton />}>
        <StatusPerformanceMetrics
          propertyId={propertyId}
          refreshInterval={900000}
          comparisonPeriod="month"
        />
      </Suspense>
    </div>
  );
}
