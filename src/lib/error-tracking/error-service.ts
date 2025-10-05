import { prisma } from "@/lib/prisma";
import { notificationService } from "@/lib/notifications/notification-service";
import {
  ErrorSeverity,
  ErrorCategory,
  ErrorStatus,
  ErrorLogData,
  ErrorOccurrenceData,
  ErrorMetrics,
  ErrorContext,
  CircuitBreakerState,
  RetryConfig
} from "@/types/error-tracking";
import { NotificationEventType, EmployeeRole } from "@/types/notifications";

export class ErrorTrackingService {
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  /**
   * Log an error with automatic deduplication and alerting
   */
  async logError(errorData: ErrorLogData): Promise<string> {
    try {
      // Generate correlation ID if not provided
      const requestId = String(
        errorData.context?.requestId || this.generateCorrelationId()
      );

      // Check for existing similar error (deduplication)
      const existingError = await this.findSimilarError(errorData);

      if (existingError) {
        // Add occurrence to existing error
        await this.addErrorOccurrence({
          errorLogId: existingError.id,
          context: errorData.context,
          userId: errorData.userId,
          requestId
        });

        // Check if we need to escalate
        await this.checkAlertThresholds(existingError.id);

        return existingError.id;
      } else {
        // Create new error log
        const errorLog = await prisma.errorLog.create({
          data: {
            errorCode: errorData.errorCode,
            severity: errorData.severity.toLowerCase() as ErrorSeverity,
            category: errorData.category.toLowerCase() as ErrorCategory,
            title: errorData.title,
            message: errorData.message,
            stackTrace: errorData.stackTrace,
            context: errorData.context || {},
            service: errorData.service,
            endpoint: errorData.endpoint,
            userId: errorData.userId,
            propertyId: errorData.propertyId,
            organizationId: errorData.organizationId,
            userAgent: errorData.userAgent,
            ipAddress: errorData.ipAddress,
            requestId,
            status: "open" as ErrorStatus
          }
        });

        // Create initial occurrence
        await this.addErrorOccurrence({
          errorLogId: errorLog.id,
          context: errorData.context,
          userId: errorData.userId,
          requestId
        });

        // Send immediate notification for critical errors
        if (errorData.severity === ErrorSeverity.CRITICAL) {
          await this.sendCriticalErrorNotification(errorLog.id);
        }

        // Check alert thresholds
        await this.checkAlertThresholds(errorLog.id);

        return errorLog.id;
      }
    } catch (error) {
      console.error("Failed to log error:", error);
      // Fallback: at least log to console
      console.error("Original error:", errorData);
      throw error;
    }
  }

  /**
   * Add an occurrence to an existing error
   */
  async addErrorOccurrence(occurrenceData: ErrorOccurrenceData): Promise<void> {
    await prisma.errorOccurrence.create({
      data: {
        errorLogId: occurrenceData.errorLogId,
        context: occurrenceData.context || {},
        userId: occurrenceData.userId,
        requestId: occurrenceData.requestId
      }
    });
  }

  /**
   * Find similar error for deduplication
   */
  private async findSimilarError(
    errorData: ErrorLogData
  ): Promise<{ id: string } | null> {
    const timeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    return await prisma.errorLog.findFirst({
      where: {
        title: errorData.title,
        category: errorData.category,
        service: errorData.service,
        organizationId: errorData.organizationId,
        status: {
          in: ["open", "in_progress"]
        },
        createdAt: {
          gte: timeWindow
        }
      }
    });
  }

  /**
   * Check alert thresholds and trigger notifications
   */
  private async checkAlertThresholds(errorLogId: string): Promise<void> {
    const errorLog = await prisma.errorLog.findUnique({
      where: { id: errorLogId },
      include: {
        occurrences: {
          orderBy: { occurredAt: "desc" }
        }
      }
    });

    if (!errorLog) return;

    // Get active alert rules for this organization
    const alertRules = await prisma.errorAlert.findMany({
      where: {
        organizationId: errorLog.organizationId || undefined,
        isActive: true,
        severity: {
          has: errorLog.severity
        },
        category: {
          has: errorLog.category
        }
      }
    });

    for (const rule of alertRules) {
      await this.evaluateAlertRule(rule, errorLog);
    }
  }

  /**
   * Evaluate a specific alert rule
   */
  private async evaluateAlertRule(
    rule: {
      id: string;
      threshold: number;
      timeWindow: number;
      channels: unknown;
      recipients: unknown;
      lastTriggered?: Date | null;
      cooldown: number;
    },
    errorLog: {
      id: string;
      title: string;
      message: string;
      severity: string;
      category: string;
      service: string | null;
      propertyId: string | null;
      organizationId: string | null;
      occurrences: Array<{ occurredAt: Date }>;
    }
  ): Promise<void> {
    const timeWindow = new Date(Date.now() - rule.timeWindow * 1000);

    // Count occurrences within time window
    const recentOccurrences = errorLog.occurrences.filter(
      (occ: { occurredAt: Date }) => occ.occurredAt >= timeWindow
    );

    if (recentOccurrences.length >= rule.threshold) {
      // Check cooldown period
      if (rule.lastTriggered) {
        const cooldownEnd = new Date(
          rule.lastTriggered.getTime() + rule.cooldown * 1000
        );
        if (new Date() < cooldownEnd) {
          return; // Still in cooldown
        }
      }

      // Trigger alert
      await this.triggerAlert(rule, errorLog, recentOccurrences.length);

      // Update last triggered time
      await prisma.errorAlert.update({
        where: { id: rule.id },
        data: { lastTriggered: new Date() }
      });
    }
  }

  /**
   * Trigger an alert notification
   */
  private async triggerAlert(
    rule: { channels: unknown; recipients: unknown },
    errorLog: {
      id: string;
      title: string;
      message: string;
      severity: string;
      category: string;
      service: string | null;
      propertyId: string | null;
      organizationId: string | null;
    },
    occurrenceCount: number
  ): Promise<void> {
    const recipients = rule.recipients as string[];

    // Skip notification if organizationId is missing
    if (!errorLog.organizationId) {
      console.warn("Skipping error notification: missing organizationId");
      return;
    }

    for (const recipientId of recipients) {
      // Get user role for notification targeting
      const user = await prisma.user.findUnique({
        where: { id: recipientId },
        include: {
          userProperties: {
            where: { propertyId: errorLog.propertyId || undefined }
          }
        }
      });

      if (!user) continue;

      const userRole = user.userProperties[0]?.role || "FRONT_DESK";
      const mappedRole = this.mapPropertyRoleToEmployeeRole(userRole);

      await notificationService.sendNotification({
        eventType: NotificationEventType.EQUIPMENT_FAILURE, // Using existing event type
        recipientId: user.id,
        recipientRole: mappedRole,
        propertyId: errorLog.propertyId || "",
        organizationId: errorLog.organizationId,
        data: {
          errorTitle: errorLog.title,
          errorMessage: errorLog.message,
          severity: errorLog.severity,
          category: errorLog.category,
          service: errorLog.service,
          occurrenceCount,
          errorId: errorLog.id
        },
        subject: `🚨 Error Alert: ${errorLog.title}`,
        message: `Error threshold exceeded!\n\nTitle: ${errorLog.title}\nSeverity: ${errorLog.severity}\nOccurrences: ${occurrenceCount}\nService: ${errorLog.service}\n\nImmediate attention required.`
      });
    }
  }

  /**
   * Send critical error notification
   */
  private async sendCriticalErrorNotification(
    errorLogId: string
  ): Promise<void> {
    const errorLog = await prisma.errorLog.findUnique({
      where: { id: errorLogId }
    });

    if (!errorLog || !errorLog.organizationId) return;

    // Get all managers and admins for the organization
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            memberships: {
              some: {
                organizationId: errorLog.organizationId || undefined,
                role: "ORG_ADMIN"
              }
            }
          },
          {
            userProperties: {
              some: {
                propertyId: errorLog.propertyId || undefined,
                role: "PROPERTY_MGR"
              }
            }
          }
        ]
      }
    });

    for (const user of users) {
      await notificationService.sendNotification({
        eventType: NotificationEventType.EQUIPMENT_FAILURE,
        recipientId: user.id,
        recipientRole: EmployeeRole.ADMIN,
        propertyId: errorLog.propertyId || "",
        organizationId: errorLog.organizationId,
        data: {
          errorTitle: errorLog.title,
          errorMessage: errorLog.message,
          severity: errorLog.severity,
          service: errorLog.service,
          errorId: errorLog.id
        },
        subject: `🚨 CRITICAL ERROR: ${errorLog.title}`,
        message: `CRITICAL ERROR DETECTED!\n\nTitle: ${errorLog.title}\nMessage: ${errorLog.message}\nService: ${errorLog.service}\n\n⚠️ IMMEDIATE ACTION REQUIRED ⚠️`
      });
    }
  }

  /**
   * Get error metrics for dashboard
   */
  async getErrorMetrics(
    organizationId: string,
    propertyId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ErrorMetrics> {
    const whereClause = {
      organizationId,
      ...(propertyId && { propertyId }),
      ...(timeRange && {
        createdAt: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      })
    };
    if (propertyId) whereClause.propertyId = propertyId;
    if (timeRange) {
      whereClause.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end
      };
    }

    const [
      totalErrors,
      errorsBySeverity,
      errorsByCategory,
      errorsByService,
      openErrors,
      resolvedErrors,
      topErrors
    ] = await Promise.all([
      // Total errors
      prisma.errorLog.count({ where: whereClause }),

      // Errors by severity
      prisma.errorLog.groupBy({
        by: ["severity"],
        where: whereClause,
        _count: { severity: true }
      }),

      // Errors by category
      prisma.errorLog.groupBy({
        by: ["category"],
        where: whereClause,
        _count: { category: true }
      }),

      // Errors by service
      prisma.errorLog.groupBy({
        by: ["service"],
        where: whereClause,
        _count: { service: true }
      }),

      // Open errors
      prisma.errorLog.count({
        where: { ...whereClause, status: "open" }
      }),

      // Resolved errors
      prisma.errorLog.count({
        where: { ...whereClause, status: "resolved" }
      }),

      // Top errors
      prisma.errorLog.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { occurrences: true }
          }
        },
        orderBy: {
          occurrences: {
            _count: "desc"
          }
        },
        take: 10
      })
    ]);

    return {
      totalErrors,
      errorsBySeverity: this.groupByToRecord(errorsBySeverity, "severity"),
      errorsByCategory: this.groupByToRecord(errorsByCategory, "category"),
      errorsByService: this.groupByToRecord(errorsByService, "service"),
      errorRate: 0, // TODO: Calculate based on total requests
      averageResolutionTime: 0, // TODO: Calculate from resolved errors
      openErrors,
      resolvedErrors,
      topErrors: topErrors.map((error) => ({
        title: error.title,
        count: (error as { _count: { occurrences: number } })._count
          .occurrences,
        lastOccurrence: error.updatedAt
      }))
    };
  }

  /**
   * Utility function to convert Prisma groupBy results to Record
   */
  private groupByToRecord<K extends string>(
    groupByResult: Array<
      Record<K, string | null> & { _count: Record<K, number> }
    >,
    key: K
  ): Record<string, number> {
    const result: Record<string, number> = {};
    groupByResult.forEach((item) => {
      const keyValue = item[key];
      if (keyValue !== null && keyValue !== undefined) {
        result[String(keyValue)] = item._count[key];
      }
    });
    return result;
  }

  /**
   * Map PropertyRole to EmployeeRole
   */
  private mapPropertyRoleToEmployeeRole(propertyRole: string): EmployeeRole {
    switch (propertyRole) {
      case "PROPERTY_MGR":
        return EmployeeRole.MANAGER;
      case "FRONT_DESK":
        return EmployeeRole.FRONT_DESK;
      case "HOUSEKEEPING":
        return EmployeeRole.HOUSEKEEPING;
      case "MAINTENANCE":
        return EmployeeRole.MAINTENANCE;
      default:
        return EmployeeRole.FRONT_DESK;
    }
  }

  /**
   * Generate correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    service: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(service);

    // Check if circuit is open
    if (circuitBreaker.state === "open") {
      if (Date.now() < (circuitBreaker.nextAttemptTime?.getTime() || 0)) {
        // Circuit is still open, use fallback or throw error
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker is open for service: ${service}`);
      } else {
        // Try to close circuit (half-open state)
        circuitBreaker.state = "half_open";
      }
    }

    try {
      const result = await operation();

      // Success - reset circuit breaker
      if (circuitBreaker.state === "half_open") {
        circuitBreaker.state = "closed";
        circuitBreaker.failureCount = 0;
      }

      return result;
    } catch (error) {
      // Failure - increment failure count
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = new Date();

      // Open circuit if threshold exceeded
      if (circuitBreaker.failureCount >= circuitBreaker.threshold) {
        circuitBreaker.state = "open";
        circuitBreaker.nextAttemptTime = new Date(
          Date.now() + circuitBreaker.timeout
        );

        // Log circuit breaker opened
        await this.logError({
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.SYSTEM,
          title: `Circuit Breaker Opened: ${service}`,
          message: `Circuit breaker opened for service ${service} after ${circuitBreaker.failureCount} failures`,
          service,
          context: {
            circuitBreakerService: circuitBreaker.service,
            circuitBreakerState: circuitBreaker.state,
            failureCount: circuitBreaker.failureCount,
            threshold: circuitBreaker.threshold,
            timeout: circuitBreaker.timeout
          }
        });
      }

      // Use fallback or re-throw error
      if (fallback) {
        return await fallback();
      }
      throw error;
    }
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context?: ErrorContext
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === config.maxRetries) {
          // Final attempt failed, log error
          await this.logError({
            severity: ErrorSeverity.HIGH,
            category: ErrorCategory.SYSTEM,
            title: "Retry Exhausted",
            message: `Operation failed after ${
              config.maxRetries + 1
            } attempts: ${lastError.message}`,
            stackTrace: lastError.stack,
            context: {
              ...context,
              retryAttempts: attempt + 1,
              maxRetries: config.maxRetries,
              baseDelay: config.baseDelay,
              backoffMultiplier: config.backoffMultiplier
            }
          });
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        const delay = config.jitter
          ? baseDelay * (0.5 + Math.random() * 0.5)
          : baseDelay;

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Get or create circuit breaker for service
   */
  private getCircuitBreaker(service: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(service)) {
      this.circuitBreakers.set(service, {
        service,
        state: "closed",
        failureCount: 0,
        threshold: 5, // Default threshold
        timeout: 60000 // Default timeout: 1 minute
      });
    }
    return this.circuitBreakers.get(service)!;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Resolve an error
   */
  async resolveError(
    errorId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<void> {
    await prisma.errorLog.update({
      where: { id: errorId },
      data: {
        status: ErrorStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedBy,
        resolution
      }
    });
  }

  /**
   * Assign error to user
   */
  async assignError(errorId: string, assignedTo: string): Promise<void> {
    await prisma.errorLog.update({
      where: { id: errorId },
      data: {
        assignedTo,
        status: ErrorStatus.IN_PROGRESS
      }
    });
  }
}

export const errorTrackingService = new ErrorTrackingService();
