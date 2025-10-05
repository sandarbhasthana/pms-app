import { prisma } from '@/lib/prisma';
import { ErrorSeverity, ErrorCategory } from '@/types/error-tracking';

export interface DefaultErrorAlert {
  name: string;
  description: string;
  severity: ErrorSeverity[];
  category: ErrorCategory[];
  threshold: number;
  timeWindow: number; // seconds
  cooldown: number; // seconds
  channels: string[];
  isActive: boolean;
}

export const defaultErrorAlerts: DefaultErrorAlert[] = [
  {
    name: 'Critical System Errors',
    description: 'Immediate notification for critical system failures',
    severity: [ErrorSeverity.CRITICAL],
    category: [
      ErrorCategory.SYSTEM,
      ErrorCategory.DATABASE,
      ErrorCategory.PAYMENT,
      ErrorCategory.AUTHENTICATION
    ],
    threshold: 1,
    timeWindow: 300, // 5 minutes
    cooldown: 900, // 15 minutes
    channels: ['in_app', 'email'],
    isActive: true
  },
  {
    name: 'High Error Rate',
    description: 'Alert when error rate exceeds normal threshold',
    severity: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
    category: [ErrorCategory.API, ErrorCategory.SYSTEM, ErrorCategory.INTEGRATION],
    threshold: 5,
    timeWindow: 600, // 10 minutes
    cooldown: 1800, // 30 minutes
    channels: ['in_app', 'email'],
    isActive: true
  },
  {
    name: 'Payment Processing Errors',
    description: 'Alert for payment and billing issues',
    severity: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
    category: [ErrorCategory.PAYMENT],
    threshold: 3,
    timeWindow: 900, // 15 minutes
    cooldown: 3600, // 1 hour
    channels: ['in_app', 'email'],
    isActive: true
  },
  {
    name: 'Database Performance Issues',
    description: 'Alert for database connection and query problems',
    severity: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
    category: [ErrorCategory.DATABASE],
    threshold: 3,
    timeWindow: 600, // 10 minutes
    cooldown: 1800, // 30 minutes
    channels: ['in_app', 'email'],
    isActive: true
  },
  {
    name: 'Queue Processing Failures',
    description: 'Alert for background job and queue failures',
    severity: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
    category: [ErrorCategory.QUEUE],
    threshold: 5,
    timeWindow: 900, // 15 minutes
    cooldown: 2700, // 45 minutes
    channels: ['in_app', 'email'],
    isActive: true
  },
  {
    name: 'Authentication Failures',
    description: 'Alert for authentication and authorization issues',
    severity: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
    category: [ErrorCategory.AUTHENTICATION, ErrorCategory.AUTHORIZATION],
    threshold: 10,
    timeWindow: 600, // 10 minutes
    cooldown: 1800, // 30 minutes
    channels: ['in_app'],
    isActive: true
  },
  {
    name: 'Business Logic Errors',
    description: 'Alert for reservation and business rule violations',
    severity: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH],
    category: [ErrorCategory.BUSINESS_LOGIC, ErrorCategory.RESERVATION],
    threshold: 5,
    timeWindow: 1800, // 30 minutes
    cooldown: 3600, // 1 hour
    channels: ['in_app'],
    isActive: true
  },
  {
    name: 'Integration Failures',
    description: 'Alert for third-party service integration issues',
    severity: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
    category: [ErrorCategory.INTEGRATION],
    threshold: 3,
    timeWindow: 900, // 15 minutes
    cooldown: 2700, // 45 minutes
    channels: ['in_app', 'email'],
    isActive: true
  },
  {
    name: 'Notification System Errors',
    description: 'Alert for notification delivery failures',
    severity: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH],
    category: [ErrorCategory.NOTIFICATION],
    threshold: 10,
    timeWindow: 1800, // 30 minutes
    cooldown: 3600, // 1 hour
    channels: ['in_app'],
    isActive: true
  },
  {
    name: 'API Rate Limiting',
    description: 'Alert for excessive API usage and rate limiting',
    severity: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH],
    category: [ErrorCategory.API],
    threshold: 20,
    timeWindow: 900, // 15 minutes
    cooldown: 1800, // 30 minutes
    channels: ['in_app'],
    isActive: true
  }
];

/**
 * Create default error alert rules for an organization
 */
export async function createDefaultErrorAlerts(
  organizationId: string,
  adminUserId: string
): Promise<number> {
  let createdCount = 0;

  for (const alertConfig of defaultErrorAlerts) {
    // Check if alert already exists
    const existing = await prisma.errorAlert.findFirst({
      where: {
        name: alertConfig.name,
        organizationId
      }
    });

    if (!existing) {
      await prisma.errorAlert.create({
        data: {
          ...alertConfig,
          recipients: [adminUserId],
          organizationId,
          createdBy: adminUserId
        }
      });
      createdCount++;
    }
  }

  return createdCount;
}

/**
 * Get error alert statistics for an organization
 */
export async function getErrorAlertStats(organizationId: string) {
  const [totalAlerts, activeAlerts, recentlyTriggered] = await Promise.all([
    prisma.errorAlert.count({
      where: { organizationId }
    }),
    prisma.errorAlert.count({
      where: { organizationId, isActive: true }
    }),
    prisma.errorAlert.count({
      where: {
        organizationId,
        lastTriggered: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })
  ]);

  return {
    totalAlerts,
    activeAlerts,
    recentlyTriggered,
    inactiveAlerts: totalAlerts - activeAlerts
  };
}

/**
 * Update error alert configuration
 */
export async function updateErrorAlert(
  alertId: string,
  updates: Partial<DefaultErrorAlert>
) {
  return await prisma.errorAlert.update({
    where: { id: alertId },
    data: updates
  });
}

/**
 * Toggle error alert active status
 */
export async function toggleErrorAlert(alertId: string, isActive: boolean) {
  return await prisma.errorAlert.update({
    where: { id: alertId },
    data: { isActive }
  });
}
