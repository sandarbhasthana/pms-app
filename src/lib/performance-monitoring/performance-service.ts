import { prisma } from "@/lib/prisma";
import {
  PerformanceMetricData,
  QueueMetricData,
  SystemHealthData,
  PerformanceDashboardData,
  PerformanceAlert,
  PerformanceMetricType
} from "@/types/performance-monitoring";

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metricsBuffer: PerformanceMetricData[] = [];
  private bufferSize = 100;
  private flushInterval = 30000; // 30 seconds

  constructor() {
    // Start periodic buffer flush
    setInterval(() => this.flushMetricsBuffer(), this.flushInterval);
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance =
        new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Record a performance metric
   */
  async recordMetric(metric: PerformanceMetricData): Promise<void> {
    try {
      // Add to buffer for batch processing
      this.metricsBuffer.push(metric);

      // Flush buffer if it's full
      if (this.metricsBuffer.length >= this.bufferSize) {
        await this.flushMetricsBuffer();
      }
    } catch (error) {
      console.error("Failed to record performance metric:", error);
    }
  }

  /**
   * Record queue job metrics
   */
  async recordQueueMetric(metric: QueueMetricData): Promise<void> {
    try {
      await prisma.queueMetric.create({
        data: {
          queueName: metric.queueName,
          jobId: metric.jobId,
          jobType: metric.jobType,
          status: metric.status,
          startedAt: metric.startedAt,
          completedAt: metric.completedAt,
          failedAt: metric.failedAt,
          duration: metric.duration,
          waitTime: metric.waitTime,
          attempts: metric.attempts || 1,
          maxAttempts: metric.maxAttempts || 3,
          priority: metric.priority || 0,
          delay: metric.delay,
          errorMessage: metric.errorMessage,
          stackTrace: metric.stackTrace,
          data: metric.data,
          result: metric.result,
          organizationId: metric.organizationId,
          propertyId: metric.propertyId
        }
      });
    } catch (error) {
      console.error("Failed to record queue metric:", error);
    }
  }

  /**
   * Record system health metrics
   */
  async recordSystemHealth(health: SystemHealthData): Promise<void> {
    try {
      await prisma.systemHealth.create({
        data: {
          timestamp: health.timestamp,
          avgResponseTime: health.avgResponseTime,
          errorRate: health.errorRate,
          uptime: health.uptime,
          dbConnections: health.dbConnections,
          dbQueryTime: health.dbQueryTime,
          memoryUsage: health.memoryUsage,
          cpuUsage: health.cpuUsage,
          activeUsers: health.activeUsers,
          ongoingReservations: health.ongoingReservations
        }
      });
    } catch (error) {
      console.error("Failed to record system health:", error);
    }
  }

  /**
   * Get dashboard data for performance monitoring
   */
  async getDashboardData(
    organizationId?: string,
    propertyId?: string
  ): Promise<PerformanceDashboardData> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // API Metrics
      const apiMetrics = await this.getApiMetrics(
        oneDayAgo,
        organizationId,
        propertyId
      );

      // Database Metrics
      const dbMetrics = await this.getDatabaseMetrics(
        oneDayAgo,
        organizationId,
        propertyId
      );

      // Queue Metrics
      const queueMetrics = await this.getQueueMetrics(
        oneDayAgo,
        organizationId,
        propertyId
      );

      // System Health
      const systemHealth = await this.getSystemHealth();

      // Trends
      const trends = await this.getTrends(
        oneDayAgo,
        organizationId,
        propertyId
      );

      return {
        apiMetrics,
        dbMetrics,
        queueMetrics,
        systemHealth,
        trends
      };
    } catch (error) {
      console.error("Failed to get dashboard data:", error);
      throw error;
    }
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(
    organizationId?: string
  ): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    try {
      const whereClause = {
        timestamp: { gte: fifteenMinutesAgo },
        ...(organizationId && { organizationId })
      };

      // Check API response time alerts
      const responseTimeMetrics = await prisma.performanceMetric.findMany({
        where: {
          ...whereClause,
          metricType: PerformanceMetricType.API_RESPONSE_TIME
        },
        orderBy: { timestamp: "desc" },
        take: 50
      });

      if (responseTimeMetrics.length > 0) {
        const avgResponseTime =
          responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) /
          responseTimeMetrics.length;
        const recentAvg =
          responseTimeMetrics
            .slice(0, 10)
            .reduce((sum, m) => sum + m.value, 0) /
          Math.min(10, responseTimeMetrics.length);

        if (avgResponseTime > 2000) {
          alerts.push({
            id: `response-time-${Date.now()}`,
            type: "response_time",
            severity: avgResponseTime > 5000 ? "critical" : "high",
            message: `High API response time: ${avgResponseTime.toFixed(
              0
            )}ms (threshold: 2000ms)`,
            threshold: 2000,
            currentValue: avgResponseTime,
            timestamp: now,
            resolved: false,
            organizationId
          });
        }

        // Check for response time spike (recent avg much higher than overall avg)
        if (recentAvg > avgResponseTime * 1.5 && recentAvg > 1000) {
          alerts.push({
            id: `response-spike-${Date.now()}`,
            type: "response_time_spike",
            severity: "medium",
            message: `Response time spike detected: ${recentAvg.toFixed(
              0
            )}ms (recent) vs ${avgResponseTime.toFixed(0)}ms (average)`,
            threshold: avgResponseTime * 1.5,
            currentValue: recentAvg,
            timestamp: now,
            resolved: false,
            organizationId
          });
        }
      }

      // Check error rate alerts
      const errorRateMetrics = await prisma.performanceMetric.findMany({
        where: {
          ...whereClause,
          metricType: PerformanceMetricType.ERROR_RATE
        },
        orderBy: { timestamp: "desc" },
        take: 20
      });

      if (errorRateMetrics.length > 0) {
        const currentErrorRate = errorRateMetrics[0].value;
        const avgErrorRate =
          errorRateMetrics.reduce((sum, m) => sum + m.value, 0) /
          errorRateMetrics.length;

        if (currentErrorRate > 5) {
          alerts.push({
            id: `error-rate-${Date.now()}`,
            type: "error_rate",
            severity:
              currentErrorRate > 15
                ? "critical"
                : currentErrorRate > 10
                ? "high"
                : "medium",
            message: `High error rate: ${currentErrorRate.toFixed(
              1
            )}% (threshold: 5%)`,
            threshold: 5,
            currentValue: currentErrorRate,
            timestamp: now,
            resolved: false,
            organizationId
          });
        }

        // Check for error rate increase
        if (
          avgErrorRate > 0 &&
          currentErrorRate > avgErrorRate * 2 &&
          currentErrorRate > 2
        ) {
          alerts.push({
            id: `error-increase-${Date.now()}`,
            type: "error_rate_increase",
            severity: "medium",
            message: `Error rate increased: ${currentErrorRate.toFixed(
              1
            )}% (current) vs ${avgErrorRate.toFixed(1)}% (average)`,
            threshold: avgErrorRate * 2,
            currentValue: currentErrorRate,
            timestamp: now,
            resolved: false,
            organizationId
          });
        }
      }

      // Check database performance alerts
      const dbQueryMetrics = await prisma.performanceMetric.findMany({
        where: {
          ...whereClause,
          metricType: PerformanceMetricType.DB_QUERY_TIME
        },
        orderBy: { timestamp: "desc" },
        take: 30
      });

      if (dbQueryMetrics.length > 0) {
        const avgQueryTime =
          dbQueryMetrics.reduce((sum, m) => sum + m.value, 0) /
          dbQueryMetrics.length;
        const slowQueries = dbQueryMetrics.filter((m) => m.value > 1000).length;
        const slowQueryPercentage = (slowQueries / dbQueryMetrics.length) * 100;

        if (avgQueryTime > 500) {
          alerts.push({
            id: `db-slow-${Date.now()}`,
            type: "database_slow",
            severity:
              avgQueryTime > 2000
                ? "critical"
                : avgQueryTime > 1000
                ? "high"
                : "medium",
            message: `Slow database queries: ${avgQueryTime.toFixed(
              0
            )}ms average (threshold: 500ms)`,
            threshold: 500,
            currentValue: avgQueryTime,
            timestamp: now,
            resolved: false,
            organizationId
          });
        }

        if (slowQueryPercentage > 20) {
          alerts.push({
            id: `db-slow-queries-${Date.now()}`,
            type: "database_slow_queries",
            severity: slowQueryPercentage > 50 ? "high" : "medium",
            message: `High percentage of slow queries: ${slowQueryPercentage.toFixed(
              1
            )}% (threshold: 20%)`,
            threshold: 20,
            currentValue: slowQueryPercentage,
            timestamp: now,
            resolved: false,
            organizationId
          });
        }
      }

      // Check queue depth alerts
      const queueDepth = await prisma.queueMetric.count({
        where: {
          status: { in: ["waiting", "delayed"] },
          createdAt: { gte: fiveMinutesAgo },
          ...(organizationId && { organizationId })
        }
      });

      if (queueDepth > 50) {
        alerts.push({
          id: `queue-depth-${Date.now()}`,
          type: "queue_depth",
          severity:
            queueDepth > 200
              ? "critical"
              : queueDepth > 100
              ? "high"
              : "medium",
          message: `High queue depth: ${queueDepth} pending jobs (threshold: 50)`,
          threshold: 50,
          currentValue: queueDepth,
          timestamp: now,
          resolved: false,
          organizationId
        });
      }

      // Check failed job rate
      const recentJobs = await prisma.queueMetric.findMany({
        where: {
          createdAt: { gte: fifteenMinutesAgo },
          ...(organizationId && { organizationId })
        }
      });

      if (recentJobs.length > 10) {
        const failedJobs = recentJobs.filter(
          (job) => job.status === "failed"
        ).length;
        const failureRate = (failedJobs / recentJobs.length) * 100;

        if (failureRate > 10) {
          alerts.push({
            id: `job-failure-${Date.now()}`,
            type: "job_failure_rate",
            severity:
              failureRate > 25
                ? "critical"
                : failureRate > 15
                ? "high"
                : "medium",
            message: `High job failure rate: ${failureRate.toFixed(
              1
            )}% (${failedJobs}/${recentJobs.length}) (threshold: 10%)`,
            threshold: 10,
            currentValue: failureRate,
            timestamp: now,
            resolved: false,
            organizationId
          });
        }
      }

      // Check system resource alerts
      const systemMetrics = await prisma.performanceMetric.findMany({
        where: {
          timestamp: { gte: fiveMinutesAgo },
          metricType: {
            in: [
              PerformanceMetricType.CPU_USAGE,
              PerformanceMetricType.MEMORY_USAGE
            ]
          }
        },
        orderBy: { timestamp: "desc" },
        take: 20
      });

      const cpuMetrics = systemMetrics.filter(
        (m) => m.metricType === PerformanceMetricType.CPU_USAGE
      );
      const memoryMetrics = systemMetrics.filter(
        (m) => m.metricType === PerformanceMetricType.MEMORY_USAGE
      );

      if (cpuMetrics.length > 0) {
        const avgCpuUsage =
          cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length;
        if (avgCpuUsage > 80) {
          alerts.push({
            id: `cpu-high-${Date.now()}`,
            type: "cpu_usage",
            severity: avgCpuUsage > 95 ? "critical" : "high",
            message: `High CPU usage: ${avgCpuUsage.toFixed(
              1
            )}% (threshold: 80%)`,
            threshold: 80,
            currentValue: avgCpuUsage,
            timestamp: now,
            resolved: false
          });
        }
      }

      if (memoryMetrics.length > 0) {
        const avgMemoryUsage =
          memoryMetrics.reduce((sum, m) => sum + m.value, 0) /
          memoryMetrics.length;
        if (avgMemoryUsage > 85) {
          alerts.push({
            id: `memory-high-${Date.now()}`,
            type: "memory_usage",
            severity: avgMemoryUsage > 95 ? "critical" : "high",
            message: `High memory usage: ${avgMemoryUsage.toFixed(
              1
            )}% (threshold: 85%)`,
            threshold: 85,
            currentValue: avgMemoryUsage,
            timestamp: now,
            resolved: false
          });
        }
      }

      return alerts;
    } catch (error) {
      console.error("Failed to get performance alerts:", error);
      return [];
    }
  }

  /**
   * Check performance thresholds and generate alerts
   */
  async checkThresholds(): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    try {
      // Check API response time
      const avgResponseTime = await this.getAverageResponseTime(fiveMinutesAgo);
      if (avgResponseTime > 2000) {
        // 2 seconds threshold
        alerts.push({
          id: `response-time-${Date.now()}`,
          type: "response_time",
          severity: avgResponseTime > 5000 ? "critical" : "high",
          message: `High API response time: ${avgResponseTime.toFixed(0)}ms`,
          threshold: 2000,
          currentValue: avgResponseTime,
          timestamp: now,
          resolved: false
        });
      }

      // Check error rate
      const errorRate = await this.getErrorRate(fiveMinutesAgo);
      if (errorRate > 5) {
        // 5% threshold
        alerts.push({
          id: `error-rate-${Date.now()}`,
          type: "error_rate",
          severity: errorRate > 10 ? "critical" : "high",
          message: `High error rate: ${errorRate.toFixed(1)}%`,
          threshold: 5,
          currentValue: errorRate,
          timestamp: now,
          resolved: false
        });
      }

      // Check queue depth
      const queueDepth = await this.getQueueDepth();
      if (queueDepth > 100) {
        // 100 jobs threshold
        alerts.push({
          id: `queue-depth-${Date.now()}`,
          type: "queue_depth",
          severity: queueDepth > 500 ? "critical" : "high",
          message: `High queue depth: ${queueDepth} jobs`,
          threshold: 100,
          currentValue: queueDepth,
          timestamp: now,
          resolved: false
        });
      }

      return alerts;
    } catch (error) {
      console.error("Failed to check thresholds:", error);
      return [];
    }
  }

  /**
   * Cleanup old metrics data
   */
  async cleanup(retentionDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      await Promise.all([
        prisma.performanceMetric.deleteMany({
          where: { timestamp: { lt: cutoffDate } }
        }),
        prisma.queueMetric.deleteMany({
          where: { createdAt: { lt: cutoffDate } }
        }),
        prisma.systemHealth.deleteMany({
          where: { timestamp: { lt: cutoffDate } }
        })
      ]);

      console.log(
        `Cleaned up performance metrics older than ${retentionDays} days`
      );
    } catch (error) {
      console.error("Failed to cleanup old metrics:", error);
    }
  }

  // Private helper methods
  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      await prisma.performanceMetric.createMany({
        data: metricsToFlush.map((metric) => ({
          metricType: metric.metricType,
          name: metric.name,
          value: metric.value,
          unit: metric.unit,
          tags: metric.tags,
          service: metric.service,
          endpoint: metric.endpoint,
          operation: metric.operation,
          duration: metric.duration,
          timestamp: metric.timestamp,
          organizationId: metric.organizationId,
          propertyId: metric.propertyId,
          userId: metric.userId
        }))
      });
    } catch (error) {
      console.error("Failed to flush metrics buffer:", error);
      // Re-add failed metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  private async getApiMetrics(
    since: Date,
    organizationId?: string,
    propertyId?: string
  ) {
    const whereClause = {
      timestamp: { gte: since },
      metricType: PerformanceMetricType.API_RESPONSE_TIME,
      ...(organizationId && { organizationId }),
      ...(propertyId && { propertyId })
    };

    if (organizationId) whereClause.organizationId = organizationId;
    if (propertyId) whereClause.propertyId = propertyId;

    const metrics = await prisma.performanceMetric.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" }
    });

    const avgResponseTime =
      metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length
        : 0;

    const requestsPerMinute = Math.round(metrics.length / (24 * 60)); // Rough estimate

    const errorMetrics = await prisma.performanceMetric.findMany({
      where: {
        ...whereClause,
        metricType: PerformanceMetricType.ERROR_RATE
      }
    });

    const errorRate =
      errorMetrics.length > 0 ? errorMetrics[errorMetrics.length - 1].value : 0;

    // Get slowest endpoints
    const endpointMetrics = await prisma.performanceMetric.groupBy({
      by: ["endpoint"],
      where: whereClause,
      _avg: { value: true },
      _count: { id: true },
      orderBy: { _avg: { value: "desc" } },
      take: 5
    });

    const slowestEndpoints = endpointMetrics.map((em) => ({
      endpoint: em.endpoint || "unknown",
      avgTime: em._avg.value || 0,
      requestCount: em._count.id
    }));

    return {
      avgResponseTime,
      requestsPerMinute,
      errorRate,
      slowestEndpoints
    };
  }

  private async getDatabaseMetrics(
    since: Date,
    organizationId?: string,
    propertyId?: string
  ) {
    const whereClause = {
      timestamp: { gte: since },
      metricType: PerformanceMetricType.DB_QUERY_TIME,
      ...(organizationId && { organizationId }),
      ...(propertyId && { propertyId })
    };

    const queryMetrics = await prisma.performanceMetric.findMany({
      where: whereClause
    });

    const avgQueryTime =
      queryMetrics.length > 0
        ? queryMetrics.reduce((sum, m) => sum + m.value, 0) /
          queryMetrics.length
        : 0;

    const connectionMetrics = await prisma.performanceMetric.findMany({
      where: {
        ...whereClause,
        metricType: PerformanceMetricType.DB_CONNECTION_COUNT
      },
      orderBy: { timestamp: "desc" },
      take: 1
    });

    const activeConnections =
      connectionMetrics.length > 0 ? connectionMetrics[0].value : 0;

    return {
      avgQueryTime,
      activeConnections,
      slowQueries: queryMetrics.filter((m) => m.value > 1000).length, // > 1 second
      connectionPoolUsage: Math.min((activeConnections / 20) * 100, 100) // Assuming max 20 connections
    };
  }

  private async getQueueMetrics(
    since: Date,
    organizationId?: string,
    propertyId?: string
  ) {
    const whereClause = {
      createdAt: { gte: since },
      ...(organizationId && { organizationId }),
      ...(propertyId && { propertyId })
    };

    const queueStats = await prisma.queueMetric.groupBy({
      by: ["status"],
      where: whereClause,
      _count: { id: true }
    });

    const totalJobs = queueStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const completedJobs =
      queueStats.find((s) => s.status === "completed")?._count.id || 0;
    const failedJobs =
      queueStats.find((s) => s.status === "failed")?._count.id || 0;

    const completedMetrics = await prisma.queueMetric.findMany({
      where: {
        ...whereClause,
        status: "completed",
        duration: { not: null }
      }
    });

    const avgProcessingTime =
      completedMetrics.length > 0
        ? completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) /
          completedMetrics.length
        : 0;

    const currentQueueDepth = await prisma.queueMetric.count({
      where: {
        status: { in: ["waiting", "delayed"] },
        organizationId,
        propertyId
      }
    });

    const queueBreakdown = await prisma.queueMetric.groupBy({
      by: ["queueName", "status"],
      where: whereClause,
      _count: { id: true }
    });

    const queues = Array.from(
      new Set(queueBreakdown.map((q) => q.queueName))
    ).map((name) => {
      const queueStats = queueBreakdown.filter((q) => q.queueName === name);
      return {
        name,
        waiting: queueStats.find((q) => q.status === "waiting")?._count.id || 0,
        active: queueStats.find((q) => q.status === "active")?._count.id || 0,
        completed:
          queueStats.find((q) => q.status === "completed")?._count.id || 0,
        failed: queueStats.find((q) => q.status === "failed")?._count.id || 0
      };
    });

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      avgProcessingTime,
      queueDepth: currentQueueDepth,
      queues
    };
  }

  private async getSystemHealth() {
    const latestHealth = await prisma.systemHealth.findFirst({
      orderBy: { timestamp: "desc" }
    });

    return {
      cpuUsage: latestHealth?.cpuUsage || 0,
      memoryUsage: latestHealth?.memoryUsage || 0,
      diskUsage: 0, // Not tracked in current schema
      uptime: latestHealth?.uptime || 0
    };
  }

  private async getTrends(
    since: Date,
    organizationId?: string,
    propertyId?: string
  ) {
    const whereClause = {
      timestamp: { gte: since },
      ...(organizationId && { organizationId }),
      ...(propertyId && { propertyId })
    };

    // Response time trend
    const responseTimeTrend = await prisma.performanceMetric.findMany({
      where: {
        ...whereClause,
        metricType: PerformanceMetricType.API_RESPONSE_TIME
      },
      select: { timestamp: true, value: true },
      orderBy: { timestamp: "asc" }
    });

    // Error rate trend
    const errorRateTrend = await prisma.performanceMetric.findMany({
      where: {
        ...whereClause,
        metricType: PerformanceMetricType.ERROR_RATE
      },
      select: { timestamp: true, value: true },
      orderBy: { timestamp: "asc" }
    });

    // Queue depth trend (approximate from queue metrics)
    const queueDepthTrend = await prisma.queueMetric.groupBy({
      by: ["createdAt"],
      where: {
        createdAt: { gte: since },
        status: { in: ["waiting", "delayed"] },
        organizationId,
        propertyId
      },
      _count: { id: true },
      orderBy: { createdAt: "asc" }
    });

    return {
      responseTimeTrend: responseTimeTrend.map((rt) => ({
        timestamp: rt.timestamp,
        value: rt.value
      })),
      errorRateTrend: errorRateTrend.map((er) => ({
        timestamp: er.timestamp,
        value: er.value
      })),
      queueDepthTrend: queueDepthTrend.map((qd) => ({
        timestamp: qd.createdAt,
        value: qd._count.id
      }))
    };
  }

  private async getAverageResponseTime(since: Date): Promise<number> {
    const metrics = await prisma.performanceMetric.findMany({
      where: {
        timestamp: { gte: since },
        metricType: PerformanceMetricType.API_RESPONSE_TIME
      }
    });

    return metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length
      : 0;
  }

  private async getErrorRate(since: Date): Promise<number> {
    const errorMetrics = await prisma.performanceMetric.findMany({
      where: {
        timestamp: { gte: since },
        metricType: PerformanceMetricType.ERROR_RATE
      },
      orderBy: { timestamp: "desc" },
      take: 1
    });

    return errorMetrics.length > 0 ? errorMetrics[0].value : 0;
  }

  private async getQueueDepth(): Promise<number> {
    return await prisma.queueMetric.count({
      where: {
        status: { in: ["waiting", "delayed"] }
      }
    });
  }
}

// Export singleton instance
export const performanceMonitoringService =
  PerformanceMonitoringService.getInstance();

// Performance tracking middleware
export function withPerformanceTracking<
  T extends (...args: unknown[]) => Promise<unknown>
>(
  fn: T,
  options: {
    name: string;
    service?: string;
    operation?: string;
    organizationId?: string;
    propertyId?: string;
    userId?: string;
  }
): T {
  return (async (...args: unknown[]) => {
    const startTime = Date.now();
    let error: Error | null = null;

    try {
      const result = await fn(...args);
      return result;
    } catch (err) {
      error = err as Error;
      throw err;
    } finally {
      const duration = Date.now() - startTime;

      // Record performance metric
      await performanceMonitoringService.recordMetric({
        metricType: PerformanceMetricType.API_RESPONSE_TIME,
        name: options.name,
        value: duration,
        unit: "ms",
        service: options.service || "api",
        operation: options.operation,
        duration,
        organizationId: options.organizationId,
        propertyId: options.propertyId,
        userId: options.userId,
        tags: {
          success: !error,
          error: error?.message || "none"
        }
      });

      // Record error rate if there was an error
      if (error) {
        await performanceMonitoringService.recordMetric({
          metricType: PerformanceMetricType.ERROR_RATE,
          name: `${options.name}_error`,
          value: 1,
          unit: "count",
          service: options.service || "api",
          operation: options.operation,
          organizationId: options.organizationId,
          propertyId: options.propertyId,
          userId: options.userId,
          tags: {
            errorType: error.constructor.name,
            errorMessage: error.message
          }
        });
      }
    }
  }) as T;
}
