import {
  NotificationEventType,
  NotificationPriority,
  EmployeeRole,
  NotificationChannel,
  NotificationRule
} from "@/types/notifications";

export const defaultNotificationRules: Omit<NotificationRule, "id">[] = [
  // Room Requests - Immediate Alerts
  {
    eventType: NotificationEventType.ROOM_SERVICE_REQUEST,
    priority: NotificationPriority.IMMEDIATE,
    targetRoles: [
      EmployeeRole.FRONT_DESK,
      EmployeeRole.HOUSEKEEPING,
      EmployeeRole.MANAGER
    ],
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isActive: true,
    template: {
      subject: "🛎️ Room Service Request - Room {{roomNumber}}",
      body: "New room service request from Room {{roomNumber}}:\n\n{{requestDetails}}\n\nGuest: {{guestName}}\nTime: {{requestTime}}",
      variables: ["roomNumber", "requestDetails", "guestName", "requestTime"],
      formatting: "text"
    }
  },

  {
    eventType: NotificationEventType.ROOM_MAINTENANCE_REQUEST,
    priority: NotificationPriority.IMMEDIATE,
    targetRoles: [
      EmployeeRole.MAINTENANCE,
      EmployeeRole.MANAGER,
      EmployeeRole.FRONT_DESK
    ],
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS
    ],
    isActive: true,
    template: {
      subject: "🔧 Maintenance Request - Room {{roomNumber}}",
      body: "Maintenance request for Room {{roomNumber}}:\n\n{{issueDescription}}\n\nPriority: {{priority}}\nReported by: {{reportedBy}}",
      variables: ["roomNumber", "issueDescription", "priority", "reportedBy"],
      formatting: "text"
    }
  },

  // Reservation Changes - Immediate Alerts
  {
    eventType: NotificationEventType.RESERVATION_STATUS_CHANGE,
    priority: NotificationPriority.IMMEDIATE,
    targetRoles: [EmployeeRole.FRONT_DESK, EmployeeRole.MANAGER],
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isActive: true,
    template: {
      subject: "📋 Reservation Status Changed - {{guestName}}",
      body: "Reservation status updated:\n\nGuest: {{guestName}}\nReservation ID: {{reservationId}}\nStatus: {{previousStatus}} → {{newStatus}}\nReason: {{changeReason}}",
      variables: [
        "guestName",
        "reservationId",
        "previousStatus",
        "newStatus",
        "changeReason"
      ],
      formatting: "text"
    }
  },

  {
    eventType: NotificationEventType.NO_SHOW_DETECTED,
    priority: NotificationPriority.IMMEDIATE,
    targetRoles: [EmployeeRole.FRONT_DESK, EmployeeRole.MANAGER],
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS
    ],
    isActive: true,
    template: {
      subject: "⚠️ No-Show Detected - {{guestName}}",
      body: "No-show detected for:\n\nGuest: {{guestName}}\nReservation ID: {{reservationId}}\nCheck-in Date: {{checkInDate}}\nRoom: {{roomNumber}}\n\nPlease review and take appropriate action.",
      variables: ["guestName", "reservationId", "checkInDate", "roomNumber"],
      formatting: "text"
    }
  },

  // Payment Issues - Immediate Alerts
  {
    eventType: NotificationEventType.PAYMENT_FAILURE,
    priority: NotificationPriority.IMMEDIATE,
    targetRoles: [
      EmployeeRole.FRONT_DESK,
      EmployeeRole.MANAGER,
      EmployeeRole.ADMIN
    ],
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS
    ],
    isActive: true,
    template: {
      subject: "💳 Payment Failed - {{guestName}}",
      body: "Payment processing failed:\n\nGuest: {{guestName}}\nReservation ID: {{reservationId}}\nAmount: ₹{{amount}}\nError: {{errorMessage}}\n\nImmediate action required.",
      variables: ["guestName", "reservationId", "amount", "errorMessage"],
      formatting: "text"
    }
  },

  {
    eventType: NotificationEventType.CREDIT_CARD_DECLINED,
    priority: NotificationPriority.IMMEDIATE,
    targetRoles: [EmployeeRole.FRONT_DESK, EmployeeRole.MANAGER],
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isActive: true,
    template: {
      subject: "💳 Credit Card Declined - {{guestName}}",
      body: "Credit card declined for:\n\nGuest: {{guestName}}\nReservation ID: {{reservationId}}\nAmount: ₹{{amount}}\nCard ending: {{cardLast4}}\n\nPlease contact guest for alternative payment.",
      variables: ["guestName", "reservationId", "amount", "cardLast4"],
      formatting: "text"
    }
  },

  // Service Requests/Housekeeping - Immediate Alerts
  {
    eventType: NotificationEventType.CLEANING_REQUEST,
    priority: NotificationPriority.IMMEDIATE,
    targetRoles: [EmployeeRole.HOUSEKEEPING, EmployeeRole.MANAGER],
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    isActive: true,
    template: {
      subject: "🧹 Cleaning Request - Room {{roomNumber}}",
      body: "Cleaning request for Room {{roomNumber}}:\n\n{{requestType}}\nPriority: {{priority}}\nRequested by: {{requestedBy}}\nNotes: {{notes}}",
      variables: [
        "roomNumber",
        "requestType",
        "priority",
        "requestedBy",
        "notes"
      ],
      formatting: "text"
    }
  },

  {
    eventType: NotificationEventType.HOUSEKEEPING_STATUS_UPDATE,
    priority: NotificationPriority.IMMEDIATE,
    targetRoles: [EmployeeRole.FRONT_DESK, EmployeeRole.MANAGER],
    channels: [NotificationChannel.IN_APP],
    isActive: true,
    template: {
      subject: "🏠 Room Status Updated - Room {{roomNumber}}",
      body: "Room {{roomNumber}} status updated:\n\nStatus: {{previousStatus}} → {{newStatus}}\nHousekeeper: {{housekeeperName}}\nTime: {{updateTime}}",
      variables: [
        "roomNumber",
        "previousStatus",
        "newStatus",
        "housekeeperName",
        "updateTime"
      ],
      formatting: "text"
    }
  },

  // Maintenance - Immediate Alerts
  {
    eventType: NotificationEventType.EQUIPMENT_FAILURE,
    priority: NotificationPriority.IMMEDIATE,
    targetRoles: [
      EmployeeRole.MAINTENANCE,
      EmployeeRole.MANAGER,
      EmployeeRole.ADMIN
    ],
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS
    ],
    isActive: true,
    template: {
      subject: "🚨 Equipment Failure - {{equipmentName}}",
      body: "Equipment failure reported:\n\nEquipment: {{equipmentName}}\nLocation: {{location}}\nIssue: {{issueDescription}}\nSeverity: {{severity}}\n\nImmediate attention required.",
      variables: ["equipmentName", "location", "issueDescription", "severity"],
      formatting: "text"
    }
  },

  {
    eventType: NotificationEventType.SAFETY_ISSUE,
    priority: NotificationPriority.IMMEDIATE,
    targetRoles: [
      EmployeeRole.MAINTENANCE,
      EmployeeRole.MANAGER,
      EmployeeRole.ADMIN,
      EmployeeRole.FRONT_DESK
    ],
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS
    ],
    isActive: true,
    template: {
      subject: "🚨 SAFETY ISSUE - {{location}}",
      body: "SAFETY ISSUE REPORTED:\n\nLocation: {{location}}\nIssue: {{issueDescription}}\nReported by: {{reportedBy}}\nTime: {{reportTime}}\n\n⚠️ IMMEDIATE ACTION REQUIRED ⚠️",
      variables: ["location", "issueDescription", "reportedBy", "reportTime"],
      formatting: "text"
    }
  },

  // Daily Summary - Daily Summary Priority
  {
    eventType: NotificationEventType.ROOM_OCCUPANCY_SUMMARY,
    priority: NotificationPriority.DAILY_SUMMARY,
    targetRoles: [
      EmployeeRole.MANAGER,
      EmployeeRole.ADMIN,
      EmployeeRole.FRONT_DESK
    ],
    channels: [NotificationChannel.EMAIL],
    isActive: true,
    template: {
      subject: "📊 Daily Summary - {{date}}",
      body: "Daily operational summary for {{date}}:\n\n📊 REVENUE: ₹{{totalRevenue}}\n🏨 OCCUPANCY: {{occupancyRate}}% ({{occupiedRooms}}/{{totalRooms}} rooms)\n📋 BOOKINGS: {{bookingCount}}\n\n✅ CHECK-INS: {{checkInsCompleted}} completed, {{checkInsPending}} pending\n🚪 CHECK-OUTS: {{checkOutsOnTime}} on-time, {{checkOutsLate}} late\n\n{{additionalNotes}}",
      variables: [
        "date",
        "totalRevenue",
        "occupancyRate",
        "occupiedRooms",
        "totalRooms",
        "bookingCount",
        "checkInsCompleted",
        "checkInsPending",
        "checkOutsOnTime",
        "checkOutsLate",
        "additionalNotes"
      ],
      formatting: "text"
    }
  }
];

export async function createDefaultNotificationRules(
  organizationId: string,
  createdBy: string
): Promise<void> {
  const { prisma } = await import("@/lib/prisma");

  // Check if rules already exist
  const existingRules = await prisma.notificationRule.count({
    where: { organizationId }
  });

  if (existingRules > 0) {
    console.log("Notification rules already exist for organization");
    return;
  }

  for (const rule of defaultNotificationRules) {
    await prisma.notificationRule.create({
      data: {
        eventType: rule.eventType,
        priority: rule.priority,
        targetRoles: rule.targetRoles,
        channels: rule.channels,
        isActive: rule.isActive,
        conditions: JSON.parse(JSON.stringify(rule.conditions || [])),
        template: JSON.parse(JSON.stringify(rule.template)),
        throttling: rule.throttling
          ? JSON.parse(JSON.stringify(rule.throttling))
          : undefined,
        organizationId,
        createdBy
      }
    });
  }
}
