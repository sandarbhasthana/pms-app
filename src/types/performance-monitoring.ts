// Performance Monitoring Types

export enum PerformanceMetricType {
  API_RESPONSE_TIME = "api_response_time",
  API_THROUGHPUT = "api_throughput",
  DB_QUERY_TIME = "db_query_time",
  DB_CONNECTION_COUNT = "db_connection_count",
  QUEUE_PROCESSING_TIME = "queue_processing_time",
  QUEUE_WAIT_TIME = "queue_wait_time",
  MEMORY_USAGE = "memory_usage",
  CPU_USAGE = "cpu_usage",
  DISK_USAGE = "disk_usage",
  ERROR_RATE = "error_rate",
  CACHE_HIT_RATE = "cache_hit_rate",
  CUSTOM = "custom"
}

export enum QueueJobStatus {
  WAITING = "waiting",
  ACTIVE = "active",
  COMPLETED = "completed",
  FAILED = "failed",
  DELAYED = "delayed",
  PAUSED = "paused",
  STUCK = "stuck"
}

export interface PerformanceMetricData {
  metricType: PerformanceMetricType;
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string | number | boolean>;
  service?: string;
  endpoint?: string;
  operation?: string;
  duration?: number;
  timestamp?: Date;
  organizationId?: string;
  propertyId?: string;
  userId?: string;
}

export interface QueueMetricData {
  queueName: string;
  jobId?: string;
  jobType: string;
  status: QueueJobStatus;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  duration?: number;
  waitTime?: number;
  attempts?: number;
  maxAttempts?: number;
  priority?: number;
  delay?: number;
  errorMessage?: string;
  stackTrace?: string;
  data?: Record<string, string | number | boolean>;
  result?: Record<string, string | number | boolean>;
  organizationId?: string;
  propertyId?: string;
}

export interface SystemHealthData {
  timestamp: Date;
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
  dbConnections: number;
  dbQueryTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeUsers: number;
  ongoingReservations: number;
}

export interface PerformanceDashboardData {
  // API Performance
  apiMetrics: {
    avgResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
    slowestEndpoints: Array<{
      endpoint: string;
      avgTime: number;
      requestCount: number;
    }>;
  };

  // Database Performance
  dbMetrics: {
    avgQueryTime: number;
    activeConnections: number;
    slowQueries: number;
    connectionPoolUsage: number;
  };

  // Queue Performance
  queueMetrics: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    avgProcessingTime: number;
    queueDepth: number;
    queues: Array<{
      name: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    }>;
  };

  // System Health
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
  };

  // Trends (last 24 hours)
  trends: {
    responseTimeTrend: Array<{ timestamp: Date; value: number }>;
    errorRateTrend: Array<{ timestamp: Date; value: number }>;
    queueDepthTrend: Array<{ timestamp: Date; value: number }>;
  };
}

export interface PerformanceAlert {
  id: string;
  type:
    | "response_time"
    | "response_time_spike"
    | "error_rate"
    | "error_rate_increase"
    | "queue_depth"
    | "job_failure_rate"
    | "database_slow"
    | "database_slow_queries"
    | "cpu_usage"
    | "memory_usage"
    | "system_resource";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
  organizationId?: string;
}

export interface PerformanceThresholds {
  responseTime: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
  queueDepth: {
    warning: number;
    critical: number;
  };
  systemResources: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    disk: { warning: number; critical: number };
  };
}

export interface PerformanceConfig {
  metricsRetentionDays: number;
  alertThresholds: PerformanceThresholds;
  monitoringInterval: number; // seconds
  enableRealTimeMonitoring: boolean;
  enableSlowQueryLogging: boolean;
  slowQueryThreshold: number; // milliseconds
}

// Middleware types for performance tracking
export interface RequestMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  method: string;
  url: string;
  statusCode?: number;
  userAgent?: string;
  userId?: string;
  organizationId?: string;
  propertyId?: string;
}

export interface DatabaseMetrics {
  queryStartTime: number;
  queryEndTime?: number;
  duration?: number;
  query: string;
  operation: string;
  table?: string;
  rowsAffected?: number;
  error?: string;
}

// Queue monitoring types
export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  stuck: number;
  totalProcessed: number;
  avgProcessingTime: number;
  throughput: number; // jobs per minute
}

export interface JobMetrics {
  jobId: string;
  queueName: string;
  jobType: string;
  status: QueueJobStatus;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  waitTime: number;
  processingTime?: number;
  attempts: number;
  failedReason?: string;
  progress?: number;
}

// Performance monitoring events
export type PerformanceEvent =
  | { type: "api_request"; data: RequestMetrics }
  | { type: "db_query"; data: DatabaseMetrics }
  | { type: "queue_job"; data: JobMetrics }
  | { type: "system_health"; data: SystemHealthData }
  | { type: "performance_alert"; data: PerformanceAlert };

export interface PerformanceMonitoringService {
  recordMetric(metric: PerformanceMetricData): Promise<void>;
  recordQueueMetric(metric: QueueMetricData): Promise<void>;
  recordSystemHealth(health: SystemHealthData): Promise<void>;
  getDashboardData(
    organizationId?: string,
    propertyId?: string
  ): Promise<PerformanceDashboardData>;
  getPerformanceAlerts(organizationId?: string): Promise<PerformanceAlert[]>;
  checkThresholds(): Promise<PerformanceAlert[]>;
  cleanup(retentionDays: number): Promise<void>;
}
