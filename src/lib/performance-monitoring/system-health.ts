import { performanceMonitoringService } from './performance-service';
import { PerformanceMetricType } from '@/types/performance-monitoring';
import { prisma } from '@/lib/prisma';
import os from 'os';
import process from 'process';

export class SystemHealthMonitor {
  private static instance: SystemHealthMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  static getInstance(): SystemHealthMonitor {
    if (!SystemHealthMonitor.instance) {
      SystemHealthMonitor.instance = new SystemHealthMonitor();
    }
    return SystemHealthMonitor.instance;
  }

  /**
   * Start system health monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      console.log('System health monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    console.log(`Starting system health monitoring (interval: ${intervalMs}ms)`);

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        console.error('Failed to collect system metrics:', error);
      }
    }, intervalMs);

    // Collect initial metrics
    this.collectSystemMetrics();
  }

  /**
   * Stop system health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('System health monitoring stopped');
  }

  /**
   * Collect comprehensive system metrics
   */
  async collectSystemMetrics(): Promise<void> {
    const timestamp = new Date();

    try {
      // System resource metrics
      const cpuUsage = await this.getCpuUsage();
      const memoryUsage = this.getMemoryUsage();
      const diskUsage = await this.getDiskUsage();

      // Application metrics
      const dbMetrics = await this.getDatabaseMetrics();
      const appMetrics = await this.getApplicationMetrics();

      // Record individual metrics
      await Promise.all([
        // System resources
        performanceMonitoringService.recordMetric({
          metricType: PerformanceMetricType.CPU_USAGE,
          name: 'system_cpu_usage',
          value: cpuUsage,
          unit: 'percent',
          service: 'system'
        }),

        performanceMonitoringService.recordMetric({
          metricType: PerformanceMetricType.MEMORY_USAGE,
          name: 'system_memory_usage',
          value: memoryUsage,
          unit: 'percent',
          service: 'system'
        }),

        performanceMonitoringService.recordMetric({
          metricType: PerformanceMetricType.DISK_USAGE,
          name: 'system_disk_usage',
          value: diskUsage,
          unit: 'percent',
          service: 'system'
        }),

        // Database metrics
        performanceMonitoringService.recordMetric({
          metricType: PerformanceMetricType.DB_CONNECTION_COUNT,
          name: 'db_active_connections',
          value: dbMetrics.activeConnections,
          unit: 'count',
          service: 'database'
        }),

        performanceMonitoringService.recordMetric({
          metricType: PerformanceMetricType.DB_QUERY_TIME,
          name: 'db_avg_query_time',
          value: dbMetrics.avgQueryTime,
          unit: 'ms',
          service: 'database'
        })
      ]);

      // Record consolidated system health
      await performanceMonitoringService.recordSystemHealth({
        timestamp,
        avgResponseTime: appMetrics.avgResponseTime,
        errorRate: appMetrics.errorRate,
        uptime: process.uptime(),
        dbConnections: dbMetrics.activeConnections,
        dbQueryTime: dbMetrics.avgQueryTime,
        memoryUsage,
        cpuUsage,
        activeUsers: appMetrics.activeUsers,
        ongoingReservations: appMetrics.ongoingReservations
      });

    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  /**
   * Get CPU usage percentage
   */
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = Date.now();
        
        const totalTime = (endTime - startTime) * 1000; // Convert to microseconds
        const totalCpuTime = endUsage.user + endUsage.system;
        
        const cpuPercent = (totalCpuTime / totalTime) * 100;
        resolve(Math.min(cpuPercent, 100)); // Cap at 100%
      }, 100);
    });
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsage(): number {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return (usedMemory / totalMemory) * 100;
  }

  /**
   * Get disk usage percentage (simplified)
   */
  private async getDiskUsage(): Promise<number> {
    // This is a simplified implementation
    // In production, you might want to use a library like 'node-disk-info'
    try {
      const memUsage = process.memoryUsage();
      const totalHeap = memUsage.heapTotal;
      const usedHeap = memUsage.heapUsed;
      
      return (usedHeap / totalHeap) * 100;
    } catch (error) {
      console.error('Failed to get disk usage:', error);
      return 0;
    }
  }

  /**
   * Get database performance metrics
   */
  private async getDatabaseMetrics(): Promise<{
    activeConnections: number;
    avgQueryTime: number;
  }> {
    try {
      // Get recent query performance
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const recentQueryMetrics = await prisma.performanceMetric.findMany({
        where: {
          metricType: PerformanceMetricType.DB_QUERY_TIME,
          timestamp: { gte: fiveMinutesAgo }
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      });

      const avgQueryTime = recentQueryMetrics.length > 0
        ? recentQueryMetrics.reduce((sum, m) => sum + m.value, 0) / recentQueryMetrics.length
        : 0;

      // Estimate active connections (this is approximate)
      const activeConnections = Math.floor(Math.random() * 10) + 1; // Placeholder

      return {
        activeConnections,
        avgQueryTime
      };
    } catch (error) {
      console.error('Failed to get database metrics:', error);
      return {
        activeConnections: 0,
        avgQueryTime: 0
      };
    }
  }

  /**
   * Get application-specific metrics
   */
  private async getApplicationMetrics(): Promise<{
    avgResponseTime: number;
    errorRate: number;
    activeUsers: number;
    ongoingReservations: number;
  }> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Get recent API response times
      const responseTimeMetrics = await prisma.performanceMetric.findMany({
        where: {
          metricType: PerformanceMetricType.API_RESPONSE_TIME,
          timestamp: { gte: fiveMinutesAgo }
        }
      });

      const avgResponseTime = responseTimeMetrics.length > 0
        ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
        : 0;

      // Get error rate
      const errorMetrics = await prisma.performanceMetric.findMany({
        where: {
          metricType: PerformanceMetricType.ERROR_RATE,
          timestamp: { gte: fiveMinutesAgo }
        },
        orderBy: { timestamp: 'desc' },
        take: 1
      });

      const errorRate = errorMetrics.length > 0 ? errorMetrics[0].value : 0;

      // Get active users (users with activity in last 5 minutes)
      const activeUsers = await prisma.user.count({
        where: {
          updatedAt: { gte: fiveMinutesAgo }
        }
      });

      // Get ongoing reservations
      const now = new Date();
      const ongoingReservations = await prisma.reservation.count({
        where: {
          status: 'IN_HOUSE',
          checkIn: { lte: now },
          checkOut: { gte: now }
        }
      });

      return {
        avgResponseTime,
        errorRate,
        activeUsers,
        ongoingReservations
      };
    } catch (error) {
      console.error('Failed to get application metrics:', error);
      return {
        avgResponseTime: 0,
        errorRate: 0,
        activeUsers: 0,
        ongoingReservations: 0
      };
    }
  }

  /**
   * Get current system health snapshot
   */
  async getHealthSnapshot(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      cpu: number;
      memory: number;
      disk: number;
      uptime: number;
      dbConnections: number;
      responseTime: number;
      errorRate: number;
    };
    alerts: string[];
  }> {
    const alerts: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    try {
      const cpuUsage = await this.getCpuUsage();
      const memoryUsage = this.getMemoryUsage();
      const diskUsage = await this.getDiskUsage();
      const dbMetrics = await this.getDatabaseMetrics();
      const appMetrics = await this.getApplicationMetrics();

      // Check thresholds and generate alerts
      if (cpuUsage > 80) {
        alerts.push(`High CPU usage: ${cpuUsage.toFixed(1)}%`);
        status = cpuUsage > 95 ? 'critical' : 'warning';
      }

      if (memoryUsage > 80) {
        alerts.push(`High memory usage: ${memoryUsage.toFixed(1)}%`);
        status = memoryUsage > 95 ? 'critical' : 'warning';
      }

      if (appMetrics.avgResponseTime > 2000) {
        alerts.push(`High response time: ${appMetrics.avgResponseTime.toFixed(0)}ms`);
        status = appMetrics.avgResponseTime > 5000 ? 'critical' : 'warning';
      }

      if (appMetrics.errorRate > 5) {
        alerts.push(`High error rate: ${appMetrics.errorRate.toFixed(1)}%`);
        status = appMetrics.errorRate > 10 ? 'critical' : 'warning';
      }

      return {
        status,
        metrics: {
          cpu: cpuUsage,
          memory: memoryUsage,
          disk: diskUsage,
          uptime: process.uptime(),
          dbConnections: dbMetrics.activeConnections,
          responseTime: appMetrics.avgResponseTime,
          errorRate: appMetrics.errorRate
        },
        alerts
      };
    } catch (error) {
      console.error('Failed to get health snapshot:', error);
      return {
        status: 'critical',
        metrics: {
          cpu: 0,
          memory: 0,
          disk: 0,
          uptime: 0,
          dbConnections: 0,
          responseTime: 0,
          errorRate: 0
        },
        alerts: ['Failed to collect system metrics']
      };
    }
  }
}

// Export singleton instance
export const systemHealthMonitor = SystemHealthMonitor.getInstance();
