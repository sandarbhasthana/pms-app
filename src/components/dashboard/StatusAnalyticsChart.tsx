// File: src/components/dashboard/StatusAnalyticsChart.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { ReservationStatus } from "@prisma/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/reservation-status";
import { getStatusConfig } from "@/lib/reservation-status/utils";

interface StatusAnalyticsData {
  statusDistribution: Array<{
    status: ReservationStatus;
    count: number;
    percentage: number;
  }>;
  dailyTrends: Array<{
    date: string;
    [key: string]: number | string;
  }>;
  conversionRates: {
    pendingToConfirmed: number;
    confirmedToCheckedIn: number;
    checkedInToCheckedOut: number;
    noShowRate: number;
    cancellationRate: number;
  };
  averageTimeInStatus: Array<{
    status: ReservationStatus;
    averageHours: number;
  }>;
}

interface StatusAnalyticsChartProps {
  propertyId: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  refreshInterval?: number;
  // ✅ PERFORMANCE OPTIMIZATION: Accept data as prop to avoid redundant API calls
  data?: StatusAnalyticsData | null;
  isLoading?: boolean;
  error?: string | null;
}

// Status colors for charts - moved outside component to prevent recreation
const STATUS_COLORS = {
  [ReservationStatus.CONFIRMATION_PENDING]: "#ec4899", // pink
  [ReservationStatus.CONFIRMED]: "#6c956e", // green
  [ReservationStatus.CHECKIN_DUE]: "#0ea5e9", // sky blue
  [ReservationStatus.IN_HOUSE]: "#22c55e", // green
  [ReservationStatus.CHECKOUT_DUE]: "#f59e0b", // amber
  [ReservationStatus.CHECKED_OUT]: "#8b5cf6", // purple
  [ReservationStatus.NO_SHOW]: "#f97316", // orange
  [ReservationStatus.CANCELLED]: "#6b7280" // gray
};

// ✅ PERFORMANCE: Memoized component to prevent unnecessary re-renders
const StatusAnalyticsChart = memo(function StatusAnalyticsChart({
  propertyId,
  dateRange,
  refreshInterval = 300000, // 5 minutes
  data: externalData,
  isLoading: externalIsLoading,
  error: externalError
}: StatusAnalyticsChartProps) {
  const [internalData, setInternalData] = useState<StatusAnalyticsData | null>(
    null
  );
  const [internalIsLoading, setInternalIsLoading] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Use external data if provided, otherwise use internal state
  const data = externalData !== undefined ? externalData : internalData;
  const isLoading =
    externalIsLoading !== undefined ? externalIsLoading : internalIsLoading;
  const error = externalError !== undefined ? externalError : internalError;

  // Fetch analytics data (only if external data not provided)
  const fetchAnalyticsData = useCallback(async () => {
    // Skip fetching if external data is provided
    if (externalData !== undefined) return;

    try {
      const params = new URLSearchParams({
        propertyId,
        ...(dateRange && {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        })
      });

      const response = await fetch(`/api/reservations/analytics?${params}`, {
        credentials: "include",
        cache: "no-cache"
      });

      if (!response.ok) {
        throw new Error("Failed to fetch analytics data");
      }

      const result = await response.json();
      setInternalData(result);
      setInternalError(null);
    } catch (err) {
      setInternalError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setInternalIsLoading(false);
    }
  }, [propertyId, dateRange, externalData]);

  // Initial load and refresh interval with debouncing (only if external data not provided)
  useEffect(() => {
    // Skip fetching if external data is provided
    if (externalData !== undefined) return;

    // Debounce the initial fetch to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      fetchAnalyticsData();
    }, 300);

    const interval = setInterval(fetchAnalyticsData, refreshInterval);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [fetchAnalyticsData, refreshInterval, externalData]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data) return null;

    // Status distribution for pie chart
    const pieData = data.statusDistribution.map((item) => ({
      name: getStatusConfig(item.status).label,
      value: item.count,
      percentage: item.percentage,
      status: item.status
    }));

    // Conversion funnel data
    const funnelData = [
      {
        stage: "Pending",
        value: 100,
        color: STATUS_COLORS[ReservationStatus.CONFIRMATION_PENDING]
      },
      {
        stage: "Confirmed",
        value: data.conversionRates.pendingToConfirmed,
        color: STATUS_COLORS[ReservationStatus.CONFIRMED]
      },
      {
        stage: "In-House",
        value: data.conversionRates.confirmedToCheckedIn,
        color: STATUS_COLORS[ReservationStatus.IN_HOUSE]
      },
      {
        stage: "Checked Out",
        value: data.conversionRates.checkedInToCheckedOut,
        color: STATUS_COLORS[ReservationStatus.CHECKED_OUT]
      }
    ];

    // Time in status data
    const timeData = data.averageTimeInStatus.map((item) => ({
      status: getStatusConfig(item.status).label,
      hours: item.averageHours,
      days: Math.round((item.averageHours / 24) * 10) / 10
    }));

    return {
      pieData,
      funnelData,
      timeData,
      dailyTrends: data.dailyTrends
    };
  }, [data]);

  // ✅ PERFORMANCE: Memoized custom tooltip to prevent re-renders
  const CustomTooltip = useMemo(
    () =>
      function CustomTooltipComponent(props: {
        active?: boolean;
        payload?: Array<{
          color?: string;
          name?: string;
          value?: number;
          payload?: Record<string, unknown>;
        }>;
        label?: string;
      }) {
        const { active, payload, label } = props;
        if (active && payload && payload.length) {
          return (
            <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {label}
              </p>
              {payload.map((entry, index: number) => {
                const percentage = entry.payload?.percentage as
                  | number
                  | undefined;
                return (
                  <p
                    key={index}
                    className="text-sm"
                    style={{ color: entry.color }}
                  >
                    {entry.name}: {entry.value}
                    {percentage && ` (${percentage.toFixed(1)}%)`}
                  </p>
                );
              })}
            </div>
          );
        }
        return null;
      },
    []
  );

  // ✅ PERFORMANCE: Memoized custom legend to prevent re-renders
  const CustomLegend = useMemo(
    () =>
      function CustomLegendComponent(props: {
        payload?: Array<{
          color?: string;
        }>;
      }) {
        const { payload } = props;
        if (!payload) return null;

        return (
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            {payload.map((entry, index: number) => {
              // Find the corresponding status from the status colors
              const status = Object.entries(STATUS_COLORS).find(
                ([, color]) => color === entry.color
              )?.[0] as ReservationStatus | undefined;

              if (!status) return null;

              return (
                <div
                  key={`legend-${index}`}
                  className="flex items-center gap-2"
                >
                  <StatusBadge status={status} size="sm" />
                </div>
              );
            })}
          </div>
        );
      },
    []
  );

  // ✅ PERFORMANCE: Memoized pie chart label function
  const pieChartLabel = useCallback(
    (props: { name?: string; percentage?: number; value?: number }) =>
      `${props.name}: ${(props.percentage ?? 0).toFixed(1)}%`,
    []
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Failed to load analytics: {error}
              </p>
              <button
                type="button"
                onClick={fetchAnalyticsData}
                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              >
                Try again
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="distribution" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="conversion">Conversion</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
          </TabsList>

          {/* Status Distribution */}
          <TabsContent value="distribution" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={pieChartLabel}
                  >
                    {chartData.pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.status as ReservationStatus]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Daily Trends */}
          <TabsContent value="trends" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                  {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <Line
                      key={status}
                      type="monotone"
                      dataKey={status}
                      stroke={color}
                      strokeWidth={2}
                      name={getStatusConfig(status as ReservationStatus).label}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Conversion Funnel */}
          <TabsContent value="conversion" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.funnelData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="stage" type="category" />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Conversion Rate"]}
                  />
                  <Bar dataKey="value" fill="#8884d8">
                    {chartData.funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Average Time in Status */}
          <TabsContent value="timing" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`${value} days`, "Average Time"]}
                  />
                  <Bar dataKey="days" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

// ✅ PERFORMANCE: Custom comparison function for memo
StatusAnalyticsChart.displayName = "StatusAnalyticsChart";

export default StatusAnalyticsChart;
