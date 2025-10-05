import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/lib/notifications/notification-service";
import { createDefaultNotificationRules } from "@/lib/notifications/default-rules";
import { prisma } from "@/lib/prisma";
import {
  NotificationEventType,
  EmployeeRole,
  DailySummaryData
} from "@/types/notifications";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const organizationId =
      searchParams.get("organizationId") || "cmgcitcig0000njowznpnhzp8";
    const propertyId =
      searchParams.get("propertyId") || "cmgcitcij0002njowu85dqocx";

    switch (action) {
      case "setup":
        return await setupNotificationSystem(organizationId);

      case "test-immediate":
        return await testImmediateNotifications(organizationId, propertyId);

      case "test-daily-summary":
        return await testDailySummary(organizationId, propertyId);

      case "rules":
        return await getNotificationRules(organizationId);

      case "logs":
        return await getNotificationLogs(organizationId, propertyId);

      case "preferences":
        return await getUserPreferences(organizationId);

      default:
        return NextResponse.json({
          message: "Notification System Test API",
          actions: [
            "setup - Create default notification rules",
            "test-immediate - Test immediate notifications",
            "test-daily-summary - Test daily summary",
            "rules - Get notification rules",
            "logs - Get notification logs",
            "preferences - Get user preferences"
          ]
        });
    }
  } catch (error) {
    console.error("Notification test API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

async function setupNotificationSystem(organizationId: string) {
  try {
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        memberships: {
          some: {
            organizationId,
            role: "ORG_ADMIN"
          }
        }
      }
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "No admin user found" },
        { status: 404 }
      );
    }

    // Create default notification rules
    await createDefaultNotificationRules(organizationId, adminUser.id);

    // Create default user preferences for all users in the organization
    const users = await prisma.user.findMany({
      where: {
        memberships: {
          some: { organizationId }
        }
      }
    });

    for (const user of users) {
      await prisma.userNotificationPreferences.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          channels: {
            inApp: true,
            email: true,
            sms: false
          },
          eventSubscriptions: {
            roomRequests: true,
            reservationChanges: true,
            paymentIssues: true,
            serviceRequests: true,
            maintenance: true,
            dailySummaries: true
          },
          phoneNumber: user.phone,
          isActive: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Notification system setup complete",
      rulesCreated: 11,
      usersConfigured: users.length
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      {
        error: "Setup failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

async function testImmediateNotifications(
  organizationId: string,
  propertyId: string
) {
  try {
    // Get a front desk user
    const frontDeskUser = await prisma.user.findFirst({
      where: {
        userProperties: {
          some: {
            propertyId,
            role: "FRONT_DESK"
          }
        }
      }
    });

    if (!frontDeskUser) {
      return NextResponse.json(
        { error: "No front desk user found" },
        { status: 404 }
      );
    }

    const testNotifications = [
      {
        eventType: NotificationEventType.ROOM_SERVICE_REQUEST,
        data: {
          roomNumber: "101",
          requestDetails: "Extra towels and room service menu",
          guestName: "John Smith",
          requestTime: new Date().toLocaleString()
        }
      },
      {
        eventType: NotificationEventType.PAYMENT_FAILURE,
        data: {
          guestName: "Jane Doe",
          reservationId: "RES-12345",
          amount: "5000",
          errorMessage: "Insufficient funds"
        }
      },
      {
        eventType: NotificationEventType.NO_SHOW_DETECTED,
        data: {
          guestName: "Bob Johnson",
          reservationId: "RES-67890",
          checkInDate: new Date().toDateString(),
          roomNumber: "205"
        }
      },
      {
        eventType: NotificationEventType.EQUIPMENT_FAILURE,
        data: {
          equipmentName: "Air Conditioning Unit",
          location: "Room 301",
          issueDescription: "Unit not cooling properly",
          severity: "High"
        }
      }
    ];

    // Helper function to filter out undefined values
    const filterUndefinedValues = (
      obj: Record<string, string | number | boolean | null | undefined>
    ): Record<string, string | number | boolean | null> => {
      const filtered: Record<string, string | number | boolean | null> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          filtered[key] = value;
        }
      }
      return filtered;
    };

    const results = [];
    for (const notification of testNotifications) {
      await notificationService.sendNotification({
        eventType: notification.eventType,
        recipientId: frontDeskUser.id,
        recipientRole: EmployeeRole.FRONT_DESK,
        propertyId,
        organizationId,
        data: filterUndefinedValues(notification.data)
      });
      results.push(`Sent ${notification.eventType} notification`);
    }

    return NextResponse.json({
      success: true,
      message: "Test notifications sent",
      results
    });
  } catch (error) {
    console.error("Test immediate notifications error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

async function testDailySummary(organizationId: string, propertyId: string) {
  try {
    const summaryData: DailySummaryData = {
      date: new Date().toDateString(),
      propertyId,
      totalRevenue: 125000,
      bookingCount: 15,
      averageRate: 8333,
      totalRooms: 50,
      occupiedRooms: 42,
      occupancyRate: 84,
      checkIns: {
        completed: 12,
        pending: 3,
        early: 2
      },
      checkOuts: {
        onTime: 8,
        late: 2,
        early: 1
      },
      noShows: 1,
      paymentFailures: 0,
      maintenanceRequests: 2,
      serviceRequests: 5
    };

    await notificationService.sendDailySummary(
      propertyId,
      organizationId,
      summaryData
    );

    return NextResponse.json({
      success: true,
      message: "Daily summary sent",
      data: summaryData
    });
  } catch (error) {
    console.error("Test daily summary error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

async function getNotificationRules(organizationId: string) {
  try {
    const rules = await prisma.notificationRule.findMany({
      where: { organizationId },
      include: {
        creator: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      success: true,
      rules: rules.map((rule) => ({
        id: rule.id,
        eventType: rule.eventType,
        priority: rule.priority,
        targetRoles: rule.targetRoles,
        channels: rule.channels,
        isActive: rule.isActive,
        template: rule.template,
        createdBy: rule.creator.name || rule.creator.email,
        createdAt: rule.createdAt
      }))
    });
  } catch (error) {
    console.error("Get rules error:", error);
    return NextResponse.json(
      {
        error: "Failed to get rules",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

async function getNotificationLogs(organizationId: string, propertyId: string) {
  try {
    const logs = await prisma.notificationLog.findMany({
      where: {
        organizationId,
        propertyId
      },
      include: {
        recipient: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return NextResponse.json({
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        eventType: log.eventType,
        priority: log.priority,
        recipientRole: log.recipientRole,
        channel: log.channel,
        subject: log.subject,
        status: log.status,
        recipient: log.recipient.name || log.recipient.email,
        createdAt: log.createdAt,
        sentAt: log.sentAt,
        errorMessage: log.errorMessage
      }))
    });
  } catch (error) {
    console.error("Get logs error:", error);
    return NextResponse.json(
      {
        error: "Failed to get logs",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

async function getUserPreferences(organizationId: string) {
  try {
    const preferences = await prisma.userNotificationPreferences.findMany({
      where: {
        user: {
          memberships: {
            some: { organizationId }
          }
        }
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      preferences: preferences.map((pref) => ({
        userId: pref.userId,
        user: pref.user.name || pref.user.email,
        channels: pref.channels,
        eventSubscriptions: pref.eventSubscriptions,
        quietHours: pref.quietHours,
        phoneNumber: pref.phoneNumber,
        isActive: pref.isActive
      }))
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    return NextResponse.json(
      {
        error: "Failed to get preferences",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
