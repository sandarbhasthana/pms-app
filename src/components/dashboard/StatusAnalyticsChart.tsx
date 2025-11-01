// File: src/components/dashboard/StatusAnalyticsChart.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
    [ReservationStatus.CONFIRMATION_PENDING]: number;
    [ReservationStatus.CONFIRMED]: number;
    [ReservationStatus.CHECKIN_DUE]: number;
    [ReservationStatus.IN_HOUSE]: number;
    [ReservationStatus.CHECKOUT_DUE]: number;
    [ReservationStatus.CHECKED_OUT]: number;
    [ReservationStatus.NO_SHOW]: number;
    [ReservationStatus.CANCELLED]: number;
  }>;
  conversionRates: {
    pendingToConfirmed: number;
    confirmedToInHouse: number;
    inHouseToCheckedOut: number;
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
}

// Status colors for charts
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

export default function StatusAnalyticsChart({
  propertyId,
  dateRange,
  refreshInterval = 300000 // 5 minutes
}: StatusAnalyticsChartProps) {
  const [data, setData] = useState<StatusAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
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
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, dateRange]);

  // Initial load and refresh interval with debouncing
  useEffect(() => {
    // Debounce the initial fetch to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      fetchAnalyticsData();
    }, 300);

    const interval = setInterval(fetchAnalyticsData, refreshInterval);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [fetchAnalyticsData, refreshInterval]);

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
        value: data.conversionRates.confirmedToInHouse,
        color: STATUS_COLORS[ReservationStatus.IN_HOUSE]
      },
      {
        stage: "Checked Out",
        value: data.conversionRates.inHouseToCheckedOut,
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

  // Custom tooltip for charts
  interface CustomTooltipPayload {
    color?: string;
    name?: string;
    value?: number;
    payload?: Record<string, unknown>;
  }

  const CustomTooltip = (props: {
    active?: boolean;
    payload?: CustomTooltipPayload[];
    label?: string;
  }) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {label}
          </p>
          {payload.map((entry, index: number) => {
            const percentage = entry.payload?.percentage as number | undefined;
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {entry.value}
                {percentage && ` (${percentage.toFixed(1)}%)`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Custom legend renderer using StatusBadge
  interface LegendPayload {
    color?: string;
  }

  const CustomLegend = (props: { payload?: LegendPayload[] }) => {
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
            <div key={`legend-${index}`} className="flex items-center gap-2">
              <StatusBadge status={status} size="sm" />
            </div>
          );
        })}
      </div>
    );
  };

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
                    label={({ name, percentage }) =>
                      `${name}: ${(percentage as number).toFixed(1)}%`
                    }
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
}
