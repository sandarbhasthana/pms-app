import { NextRequest, NextResponse } from "next/server";
import { errorTrackingService } from "@/lib/error-tracking/error-service";
import { prisma } from "@/lib/prisma";
import {
  ErrorSeverity,
  ErrorCategory,
  RetryConfig
} from "@/types/error-tracking";
import {
  ErrorSeverity as PrismaErrorSeverity,
  ErrorCategory as PrismaErrorCategory
} from "@prisma/client";

// Test organization and property IDs
const TEST_ORG_ID = "cmgcitcig0000njowznpnhzp8";
const TEST_PROPERTY_ID = "cmgcitcij0002njowu85dqocx";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "setup":
        return await setupErrorAlerts();
      case "test-errors":
        return await testErrorLogging();
      case "test-circuit-breaker":
        return await testCircuitBreaker();
      case "test-retry":
        return await testRetryLogic();
      case "metrics":
        return await getErrorMetrics();
      case "logs":
        return await getErrorLogs();
      case "alerts":
        return await getErrorAlerts();
      default:
        return NextResponse.json({
          message: "Error Tracking Test API",
          actions: [
            "setup - Create default error alert rules",
            "test-errors - Test error logging with different severities",
            "test-circuit-breaker - Test circuit breaker functionality",
            "test-retry - Test retry logic with exponential backoff",
            "metrics - Get error metrics and dashboard data",
            "logs - View recent error logs",
            "alerts - View error alert rules"
          ]
        });
    }
  } catch (error) {
    console.error("Error tracking test failed:", error);
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
 * Setup default error alert rules
 */
async function setupErrorAlerts() {
  // Get admin user for the organization
  const adminUser = await prisma.user.findFirst({
    where: {
      memberships: {
        some: {
          organizationId: TEST_ORG_ID,
          role: "ORG_ADMIN"
        }
      }
    }
  });

  if (!adminUser) {
    throw new Error("No admin user found for organization");
  }

  const defaultAlerts = [
    {
      name: "Critical Error Alert",
      description: "Immediate notification for critical errors",
      severity: ["critical"],
      category: ["system", "database", "payment"],
      threshold: 1,
      timeWindow: 300, // 5 minutes
      cooldown: 900, // 15 minutes
      channels: ["in_app", "email"],
      recipients: [adminUser.id],
      isActive: true,
      organizationId: TEST_ORG_ID,
      createdBy: adminUser.id,
      services: []
    },
    {
      name: "High Error Rate Alert",
      description: "Alert when error rate exceeds threshold",
      severity: ["high", "critical"],
      category: ["api", "system"],
      threshold: 5,
      timeWindow: 600, // 10 minutes
      cooldown: 1800, // 30 minutes
      channels: ["in_app", "email"],
      recipients: [adminUser.id],
      isActive: true,
      organizationId: TEST_ORG_ID,
      createdBy: adminUser.id,
      services: []
    },
    {
      name: "Payment Error Alert",
      description: "Alert for payment processing errors",
      severity: ["high", "critical"],
      category: ["payment"],
      threshold: 3,
      timeWindow: 900, // 15 minutes
      cooldown: 3600, // 1 hour
      channels: ["in_app", "email"],
      recipients: [adminUser.id],
      isActive: true,
      organizationId: TEST_ORG_ID,
      createdBy: adminUser.id,
      services: []
    }
  ];

  const createdAlerts = [];
  for (const alert of defaultAlerts) {
    // Check if alert already exists
    const existing = await prisma.errorAlert.findFirst({
      where: {
        name: alert.name,
        organizationId: TEST_ORG_ID
      }
    });

    if (!existing) {
      const created = await prisma.errorAlert.create({
        data: {
          name: alert.name,
          description: alert.description,
          severity: alert.severity as PrismaErrorSeverity[],
          category: alert.category as PrismaErrorCategory[],
          services: alert.services,
          threshold: alert.threshold,
          timeWindow: alert.timeWindow,
          cooldown: alert.cooldown,
          channels: alert.channels,
          recipients: alert.recipients,
          isActive: alert.isActive,
          organizationId: alert.organizationId,
          createdBy: alert.createdBy
        }
      });
      createdAlerts.push(created);
    }
  }

  return NextResponse.json({
    message: "Error alert setup completed",
    alertsCreated: createdAlerts.length,
    totalAlerts: await prisma.errorAlert.count({
      where: { organizationId: TEST_ORG_ID }
    })
  });
}

/**
 * Test error logging with different severities
 */
async function testErrorLogging() {
  const testErrors = [
    {
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.DATABASE,
      title: "Database Connection Failed",
      message: "Unable to connect to PostgreSQL database after 3 attempts",
      service: "database",
      endpoint: "/api/reservations",
      stackTrace:
        "Error: Connection timeout\n    at Database.connect (db.js:45)\n    at async handler (api.js:12)"
    },
    {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.PAYMENT,
      title: "Payment Processing Error",
      message: "Stripe webhook validation failed for payment intent",
      service: "payment",
      endpoint: "/api/webhooks/stripe",
      context: {
        paymentIntentId: "pi_test_123456",
        customerId: "cus_test_789",
        amount: 15000
      }
    },
    {
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.API,
      title: "Rate Limit Exceeded",
      message: "API rate limit exceeded for user requests",
      service: "api",
      endpoint: "/api/rooms/availability",
      context: {
        userId: "user_123",
        requestCount: 105,
        timeWindow: "1 minute"
      }
    },
    {
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.VALIDATION,
      title: "Invalid Input Data",
      message: "Guest phone number format validation failed",
      service: "validation",
      endpoint: "/api/guests",
      context: {
        field: "phoneNumber",
        value: "invalid-phone",
        expectedFormat: "+1234567890"
      }
    },
    {
      severity: ErrorSeverity.INFO,
      category: ErrorCategory.USER_ACTION,
      title: "User Login Attempt",
      message: "Failed login attempt with incorrect password",
      service: "auth",
      endpoint: "/api/auth/signin",
      context: {
        email: "user@example.com",
        attemptCount: 2
      }
    }
  ];

  const loggedErrors = [];
  for (const errorData of testErrors) {
    const errorId = await errorTrackingService.logError({
      ...errorData,
      organizationId: TEST_ORG_ID,
      propertyId: TEST_PROPERTY_ID
    });
    loggedErrors.push({ id: errorId, ...errorData });
  }

  return NextResponse.json({
    message: "Error logging test completed",
    errorsLogged: loggedErrors.length,
    errors: loggedErrors.map((e) => ({
      id: e.id,
      severity: e.severity,
      category: e.category,
      title: e.title
    }))
  });
}

/**
 * Test circuit breaker functionality
 */
async function testCircuitBreaker() {
  const results = [];

  // Simulate a failing service
  const failingOperation = async () => {
    throw new Error("Service unavailable");
  };

  const fallbackOperation = async () => {
    return "Fallback response";
  };

  // Test circuit breaker with multiple failures
  for (let i = 0; i < 7; i++) {
    try {
      const result = await errorTrackingService.executeWithCircuitBreaker(
        "test-service",
        failingOperation,
        fallbackOperation
      );
      results.push({ attempt: i + 1, result, status: "success" });
    } catch (error) {
      results.push({
        attempt: i + 1,
        error: error instanceof Error ? error.message : String(error),
        status: "failed"
      });
    }
  }

  return NextResponse.json({
    message: "Circuit breaker test completed",
    results
  });
}

/**
 * Test retry logic with exponential backoff
 */
async function testRetryLogic() {
  let attemptCount = 0;

  // Simulate an operation that fails 3 times then succeeds
  const flakyOperation = async () => {
    attemptCount++;
    if (attemptCount <= 3) {
      throw new Error(`Attempt ${attemptCount} failed`);
    }
    return `Success on attempt ${attemptCount}`;
  };

  const retryConfig: RetryConfig = {
    maxRetries: 5,
    baseDelay: 100,
    maxDelay: 2000,
    backoffMultiplier: 2,
    jitter: true
  };

  const startTime = Date.now();
  try {
    const result = await errorTrackingService.executeWithRetry(
      flakyOperation,
      retryConfig,
      { testId: "retry-test-001" }
    );

    const endTime = Date.now();

    return NextResponse.json({
      message: "Retry logic test completed",
      result,
      totalAttempts: attemptCount,
      duration: endTime - startTime,
      config: retryConfig
    });
  } catch (error) {
    const endTime = Date.now();

    return NextResponse.json({
      message: "Retry logic test failed",
      error: error instanceof Error ? error.message : String(error),
      totalAttempts: attemptCount,
      duration: endTime - startTime,
      config: retryConfig
    });
  }
}

/**
 * Get error metrics for dashboard
 */
async function getErrorMetrics() {
  const timeRange = {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    end: new Date()
  };

  const metrics = await errorTrackingService.getErrorMetrics(
    TEST_ORG_ID,
    TEST_PROPERTY_ID,
    timeRange
  );

  return NextResponse.json({
    message: "Error metrics retrieved",
    timeRange,
    metrics
  });
}

/**
 * Get recent error logs
 */
async function getErrorLogs() {
  const logs = await prisma.errorLog.findMany({
    where: {
      organizationId: TEST_ORG_ID,
      propertyId: TEST_PROPERTY_ID
    },
    include: {
      occurrences: {
        orderBy: { occurredAt: "desc" },
        take: 3
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return NextResponse.json({
    message: "Error logs retrieved",
    count: logs.length,
    logs: logs.map((log) => ({
      id: log.id,
      severity: log.severity,
      category: log.category,
      title: log.title,
      message: log.message,
      service: log.service,
      status: log.status,
      occurrenceCount: log.occurrences.length,
      createdAt: log.createdAt,
      lastOccurrence: log.occurrences[0]?.occurredAt || log.createdAt
    }))
  });
}

/**
 * Get error alert rules
 */
async function getErrorAlerts() {
  const alerts = await prisma.errorAlert.findMany({
    where: { organizationId: TEST_ORG_ID },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    message: "Error alerts retrieved",
    count: alerts.length,
    alerts: alerts.map((alert) => ({
      id: alert.id,
      name: alert.name,
      description: alert.description,
      severity: alert.severity,
      category: alert.category,
      threshold: alert.threshold,
      timeWindow: alert.timeWindow,
      cooldown: alert.cooldown,
      channels: alert.channels,
      isActive: alert.isActive,
      lastTriggered: alert.lastTriggered
    }))
  });
}
