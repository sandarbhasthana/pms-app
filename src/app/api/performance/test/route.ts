import { NextRequest, NextResponse } from "next/server";
import { performanceMonitoringService } from "@/lib/performance-monitoring/performance-service";
import { systemHealthMonitor } from "@/lib/performance-monitoring/system-health";
import {
  PerformanceMetricType,
  QueueJobStatus
} from "@/types/performance-monitoring";

// Test organization and property IDs
const TEST_ORG_ID = "cmgcitcig0000njowznpnhzp8";
const TEST_PROPERTY_ID = "cmgcitcij0002njowu85dqocx";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "setup":
        return await setupPerformanceMonitoring();
      case "test-metrics":
        return await testMetricsCollection();
      case "test-queue":
        return await testQueueMetrics();
      case "health":
        return await getSystemHealth();
      case "dashboard":
        return await getDashboardData();
      case "start-monitoring":
        return await startSystemMonitoring();
      case "stop-monitoring":
        return await stopSystemMonitoring();
      case "cleanup":
        return await cleanupOldMetrics();
      default:
        return NextResponse.json({
          message: "Performance Monitoring Test API",
          actions: [
            "setup - Initialize performance monitoring",
            "test-metrics - Generate test performance metrics",
            "test-queue - Generate test queue metrics",
            "health - Get current system health",
            "dashboard - Get performance dashboard data",
            "start-monitoring - Start system health monitoring",
            "stop-monitoring - Stop system health monitoring",
            "cleanup - Clean up old metrics data"
          ]
        });
    }
  } catch (error) {
    console.error("Performance monitoring test failed:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Setup performance monitoring
 */
async function setupPerformanceMonitoring() {
  console.log("Setting up performance monitoring...");

  // Start system health monitoring
  systemHealthMonitor.startMonitoring(30000); // Every 30 seconds

  // Generate some initial test data
  await generateTestMetrics();

  return NextResponse.json({
    message: "Performance monitoring setup completed",
    features: [
      "System health monitoring started",
      "Test metrics generated",
      "Performance tracking enabled"
    ]
  });
}

/**
 * Test metrics collection
 */
async function testMetricsCollection() {
  console.log("Testing metrics collection...");

  const testMetrics = [
    {
      metricType: PerformanceMetricType.API_RESPONSE_TIME,
      name: "test_api_endpoint",
      value: Math.random() * 1000 + 100, // 100-1100ms
      unit: "ms",
      service: "api",
      endpoint: "/api/test",
      operation: "GET",
      organizationId: TEST_ORG_ID,
      propertyId: TEST_PROPERTY_ID
    },
    {
      metricType: PerformanceMetricType.DB_QUERY_TIME,
      name: "test_db_query",
      value: Math.random() * 500 + 10, // 10-510ms
      unit: "ms",
      service: "database",
      operation: "SELECT",
      organizationId: TEST_ORG_ID
    },
    {
      metricType: PerformanceMetricType.MEMORY_USAGE,
      name: "system_memory",
      value: Math.random() * 30 + 40, // 40-70%
      unit: "percent",
      service: "system"
    },
    {
      metricType: PerformanceMetricType.CPU_USAGE,
      name: "system_cpu",
      value: Math.random() * 40 + 20, // 20-60%
      unit: "percent",
      service: "system"
    },
    {
      metricType: PerformanceMetricType.ERROR_RATE,
      name: "api_error_rate",
      value: Math.random() * 5, // 0-5%
      unit: "percent",
      service: "api",
      organizationId: TEST_ORG_ID
    }
  ];

  // Record all test metrics
  for (const metric of testMetrics) {
    await performanceMonitoringService.recordMetric(metric);
  }

  return NextResponse.json({
    message: "Test metrics recorded successfully",
    metricsRecorded: testMetrics.length,
    metrics: testMetrics.map((m) => ({
      type: m.metricType,
      name: m.name,
      value: `${m.value.toFixed(2)} ${m.unit}`,
      service: m.service
    }))
  });
}

/**
 * Test queue metrics
 */
async function testQueueMetrics() {
  console.log("Testing queue metrics...");

  const queueNames = [
    "reservation-status",
    "notifications",
    "email-queue",
    "payment-processing"
  ];
  const jobTypes = [
    "status-update",
    "send-notification",
    "send-email",
    "process-payment"
  ];
  const statuses = [
    QueueJobStatus.COMPLETED,
    QueueJobStatus.FAILED,
    QueueJobStatus.WAITING,
    QueueJobStatus.ACTIVE
  ];

  const testQueueMetrics = [];

  for (let i = 0; i < 20; i++) {
    const queueName = queueNames[Math.floor(Math.random() * queueNames.length)];
    const jobType = jobTypes[Math.floor(Math.random() * jobTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const createdAt = new Date(
      Date.now() - Math.random() * 24 * 60 * 60 * 1000
    ); // Last 24 hours
    const processingTime = Math.random() * 5000 + 100; // 100-5100ms
    const waitTime = Math.random() * 10000 + 500; // 500-10500ms

    const queueMetric = {
      queueName,
      jobId: `job_${Date.now()}_${i}`,
      jobType,
      status,
      startedAt:
        status !== QueueJobStatus.WAITING
          ? new Date(createdAt.getTime() + waitTime)
          : undefined,
      completedAt:
        status === QueueJobStatus.COMPLETED
          ? new Date(createdAt.getTime() + waitTime + processingTime)
          : undefined,
      failedAt:
        status === QueueJobStatus.FAILED
          ? new Date(createdAt.getTime() + waitTime + processingTime)
          : undefined,
      duration:
        status === QueueJobStatus.COMPLETED || status === QueueJobStatus.FAILED
          ? processingTime
          : undefined,
      waitTime: status !== QueueJobStatus.WAITING ? waitTime : undefined,
      attempts:
        status === QueueJobStatus.FAILED
          ? Math.floor(Math.random() * 3) + 1
          : 1,
      maxAttempts: 3,
      priority: Math.floor(Math.random() * 10),
      errorMessage:
        status === QueueJobStatus.FAILED ? "Test error message" : undefined,
      organizationId: TEST_ORG_ID,
      propertyId: Math.random() > 0.5 ? TEST_PROPERTY_ID : undefined
    };

    await performanceMonitoringService.recordQueueMetric(queueMetric);
    testQueueMetrics.push(queueMetric);
  }

  return NextResponse.json({
    message: "Test queue metrics recorded successfully",
    metricsRecorded: testQueueMetrics.length,
    summary: {
      queues: [...new Set(testQueueMetrics.map((m) => m.queueName))],
      statuses: testQueueMetrics.reduce((acc, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    }
  });
}

/**
 * Get system health
 */
async function getSystemHealth() {
  const healthSnapshot = await systemHealthMonitor.getHealthSnapshot();

  return NextResponse.json({
    message: "System health retrieved successfully",
    health: healthSnapshot
  });
}

/**
 * Get dashboard data
 */
async function getDashboardData() {
  const dashboardData = await performanceMonitoringService.getDashboardData(
    TEST_ORG_ID,
    TEST_PROPERTY_ID
  );

  return NextResponse.json({
    message: "Dashboard data retrieved successfully",
    data: dashboardData
  });
}

/**
 * Start system monitoring
 */
async function startSystemMonitoring() {
  systemHealthMonitor.startMonitoring(60000); // Every minute

  return NextResponse.json({
    message: "System monitoring started",
    interval: "60 seconds"
  });
}

/**
 * Stop system monitoring
 */
async function stopSystemMonitoring() {
  systemHealthMonitor.stopMonitoring();

  return NextResponse.json({
    message: "System monitoring stopped"
  });
}

/**
 * Clean up old metrics
 */
async function cleanupOldMetrics() {
  await performanceMonitoringService.cleanup(7); // Keep last 7 days

  return NextResponse.json({
    message: "Old metrics cleaned up",
    retentionDays: 7
  });
}

/**
 * Generate test metrics for demonstration
 */
async function generateTestMetrics() {
  const now = new Date();
  const metrics = [];

  // Generate metrics for the last 24 hours
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);

    // API response time metrics
    metrics.push({
      metricType: PerformanceMetricType.API_RESPONSE_TIME,
      name: "api_response_time",
      value: Math.random() * 800 + 200, // 200-1000ms
      unit: "ms",
      service: "api",
      timestamp: timestamp,
      organizationId: TEST_ORG_ID
    });

    // Database query time metrics
    metrics.push({
      metricType: PerformanceMetricType.DB_QUERY_TIME,
      name: "db_query_time",
      value: Math.random() * 300 + 50, // 50-350ms
      unit: "ms",
      service: "database",
      timestamp: timestamp,
      organizationId: TEST_ORG_ID
    });

    // System resource metrics
    metrics.push({
      metricType: PerformanceMetricType.CPU_USAGE,
      name: "cpu_usage",
      value: Math.random() * 50 + 25, // 25-75%
      unit: "percent",
      service: "system",
      timestamp: timestamp
    });

    metrics.push({
      metricType: PerformanceMetricType.MEMORY_USAGE,
      name: "memory_usage",
      value: Math.random() * 40 + 30, // 30-70%
      unit: "percent",
      service: "system",
      timestamp: timestamp
    });

    // Error rate metrics
    metrics.push({
      metricType: PerformanceMetricType.ERROR_RATE,
      name: "error_rate",
      value: Math.random() * 3, // 0-3%
      unit: "percent",
      service: "api",
      timestamp: timestamp,
      organizationId: TEST_ORG_ID
    });
  }

  // Record all metrics
  for (const metric of metrics) {
    await performanceMonitoringService.recordMetric(metric);
  }

  console.log(`Generated ${metrics.length} test metrics`);
}
