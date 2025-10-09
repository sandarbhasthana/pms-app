// File: src/lib/notifications/twilio-sms-service.ts

import twilio from "twilio";
import {
  NotificationEventType,
  NotificationPriority
} from "@/types/notifications";

// SMS Configuration
const SMS_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  maxLength: 160, // Standard SMS length
  maxSegments: 3 // Maximum segments for long messages
};

// SMS Delivery Result Interface
export interface SMSDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  segmentCount?: number;
  estimatedCost?: string;
}

// SMS Template Data Interface
interface SMSTemplateData {
  template: string;
  variables: string[];
  maxLength: number;
  priority: NotificationPriority;
}

// SMS Templates Registry
const SMS_TEMPLATES: Record<NotificationEventType, SMSTemplateData> = {
  // Room Requests
  [NotificationEventType.ROOM_SERVICE_REQUEST]: {
    template:
      "🛎️ Room Service Request - Room {{roomNumber}}\nGuest: {{guestName}}\nRequest: {{requestDetails}}\nTime: {{requestTime}}",
    variables: ["roomNumber", "guestName", "requestDetails", "requestTime"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.ROOM_CHANGE_REQUEST]: {
    template:
      "🔄 Room Change Request\nGuest: {{guestName}}\nFrom: Room {{currentRoom}}\nTo: Room {{requestedRoom}}\nReason: {{changeReason}}",
    variables: ["guestName", "currentRoom", "requestedRoom", "changeReason"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.SPECIAL_ACCOMMODATION_REQUEST]: {
    template:
      "♿ Special Accommodation Request\nGuest: {{guestName}}\nRoom: {{roomNumber}}\nRequest: {{accommodationDetails}}\nTime: {{requestTime}}",
    variables: [
      "guestName",
      "roomNumber",
      "accommodationDetails",
      "requestTime"
    ],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.ROOM_MAINTENANCE_REQUEST]: {
    template:
      "🔧 Room Maintenance Request\nRoom: {{roomNumber}}\nIssue: {{issueDescription}}\nPriority: {{priority}}\nReported: {{reportedTime}}",
    variables: ["roomNumber", "issueDescription", "priority", "reportedTime"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },

  // Reservation Changes
  [NotificationEventType.RESERVATION_STATUS_CHANGE]: {
    template:
      "📋 Reservation Status Changed\nGuest: {{guestName}}\nReservation: {{reservationId}}\nStatus: {{previousStatus}} → {{newStatus}}",
    variables: ["guestName", "reservationId", "previousStatus", "newStatus"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.BOOKING_MODIFICATION]: {
    template:
      "📝 Booking Modified\nGuest: {{guestName}}\nReservation: {{reservationId}}\nChanges: {{modificationDetails}}\nTime: {{modificationTime}}",
    variables: [
      "guestName",
      "reservationId",
      "modificationDetails",
      "modificationTime"
    ],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.RESERVATION_CANCELLATION]: {
    template:
      "❌ Booking Cancelled\nGuest: {{guestName}}\nReservation: {{reservationId}}\nReason: {{cancellationReason}}\nRefund: ₹{{refundAmount}}",
    variables: [
      "guestName",
      "reservationId",
      "cancellationReason",
      "refundAmount"
    ],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.NO_SHOW_DETECTED]: {
    template:
      "⚠️ No-Show Alert\nGuest: {{guestName}}\nReservation: {{reservationId}}\nRoom: {{roomNumber}}\nDeposit: ₹{{depositAmount}} retained",
    variables: ["guestName", "reservationId", "roomNumber", "depositAmount"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.CHECKIN_TIME_CHANGE]: {
    template:
      "🕐 Check-in Time Changed\nGuest: {{guestName}}\nReservation: {{reservationId}}\nNew Time: {{newCheckinTime}}\nReason: {{changeReason}}",
    variables: ["guestName", "reservationId", "newCheckinTime", "changeReason"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.CHECKOUT_TIME_CHANGE]: {
    template:
      "� Check-out Time Changed\nGuest: {{guestName}}\nReservation: {{reservationId}}\nNew Time: {{newCheckoutTime}}\nReason: {{changeReason}}",
    variables: [
      "guestName",
      "reservationId",
      "newCheckoutTime",
      "changeReason"
    ],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },

  // Payment Issues
  [NotificationEventType.PAYMENT_FAILURE]: {
    template:
      "❌ Payment Failed - {{guestName}}\nReservation: {{reservationId}}\nAmount: ₹{{amount}}\nReason: {{failureReason}}\nAction required!",
    variables: ["guestName", "reservationId", "amount", "failureReason"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.CREDIT_CARD_DECLINED]: {
    template:
      "💳 Credit Card Declined\nGuest: {{guestName}}\nCard: ****{{lastFourDigits}}\nAmount: ₹{{amount}}\nReason: {{declineReason}}",
    variables: ["guestName", "lastFourDigits", "amount", "declineReason"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.REFUND_PROCESSING_ISSUE]: {
    template:
      "💸 Refund Processing Issue\nGuest: {{guestName}}\nRefund Amount: ₹{{refundAmount}}\nIssue: {{processingIssue}}\nAction needed!",
    variables: ["guestName", "refundAmount", "processingIssue"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.CHARGEBACK_NOTIFICATION]: {
    template:
      "⚠️ Chargeback Alert\nGuest: {{guestName}}\nAmount: ₹{{chargebackAmount}}\nReason: {{chargebackReason}}\nDispute ID: {{disputeId}}",
    variables: [
      "guestName",
      "chargebackAmount",
      "chargebackReason",
      "disputeId"
    ],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },

  // Service Requests/Housekeeping
  [NotificationEventType.CLEANING_REQUEST]: {
    template:
      "🧹 Cleaning Request\nRoom: {{roomNumber}}\nType: {{cleaningType}}\nPriority: {{priority}}\nRequested: {{requestTime}}",
    variables: ["roomNumber", "cleaningType", "priority", "requestTime"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.HOUSEKEEPING_STATUS_UPDATE]: {
    template:
      "🏠 Housekeeping Update\nRoom: {{roomNumber}}\nStatus: {{previousStatus}} → {{newStatus}}\nStaff: {{staffName}}\nTime: {{updateTime}}",
    variables: [
      "roomNumber",
      "previousStatus",
      "newStatus",
      "staffName",
      "updateTime"
    ],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.SUPPLY_REQUEST]: {
    template:
      "📦 Supply Request\nLocation: {{location}}\nItems: {{requestedItems}}\nQuantity: {{quantity}}\nUrgency: {{urgencyLevel}}",
    variables: ["location", "requestedItems", "quantity", "urgencyLevel"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.LOST_FOUND_ITEM]: {
    template:
      "🔍 Lost & Found Item\nItem: {{itemDescription}}\nLocation: {{foundLocation}}\nGuest: {{guestName}}\nFound: {{foundTime}}",
    variables: ["itemDescription", "foundLocation", "guestName", "foundTime"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },

  // Maintenance
  [NotificationEventType.EQUIPMENT_FAILURE]: {
    template:
      "⚠️ URGENT: Equipment Failure\nLocation: {{location}}\nEquipment: {{equipmentType}}\nIssue: {{failureDescription}}\nImmediate action required!",
    variables: ["location", "equipmentType", "failureDescription"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.REPAIR_REQUEST]: {
    template:
      "🔨 Repair Request\nLocation: {{location}}\nItem: {{itemDescription}}\nIssue: {{repairDescription}}\nPriority: {{priority}}",
    variables: ["location", "itemDescription", "repairDescription", "priority"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.SAFETY_ISSUE]: {
    template:
      "🚨 SAFETY ISSUE\nLocation: {{location}}\nIssue: {{safetyDescription}}\nSeverity: {{severityLevel}}\nIMMEDIATE ACTION REQUIRED!",
    variables: ["location", "safetyDescription", "severityLevel"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },
  [NotificationEventType.PREVENTIVE_MAINTENANCE_DUE]: {
    template:
      "🔧 Preventive Maintenance Due\nEquipment: {{equipmentName}}\nLocation: {{location}}\nDue: {{dueDate}}\nLast: {{lastMaintenance}}",
    variables: ["equipmentName", "location", "dueDate", "lastMaintenance"],
    maxLength: 160,
    priority: NotificationPriority.IMMEDIATE
  },

  // Daily Summary Events
  [NotificationEventType.DAILY_REVENUE_SUMMARY]: {
    template:
      "📊 Daily Revenue: ₹{{totalRevenue}}\nBookings: {{totalBookings}}\nOccupancy: {{occupancyRate}}%\nAvg Rate: ₹{{averageRate}}",
    variables: [
      "totalRevenue",
      "totalBookings",
      "occupancyRate",
      "averageRate"
    ],
    maxLength: 160,
    priority: NotificationPriority.DAILY_SUMMARY
  },
  [NotificationEventType.BOOKING_PERFORMANCE_SUMMARY]: {
    template:
      "� Booking Performance\nNew: {{newBookings}}\nConfirmed: {{confirmedBookings}}\nCancelled: {{cancelledBookings}}\nRevenue: ₹{{bookingRevenue}}",
    variables: [
      "newBookings",
      "confirmedBookings",
      "cancelledBookings",
      "bookingRevenue"
    ],
    maxLength: 160,
    priority: NotificationPriority.DAILY_SUMMARY
  },
  [NotificationEventType.GUEST_SATISFACTION_SUMMARY]: {
    template:
      "😊 Guest Satisfaction\nAvg Rating: {{averageRating}}/5\nReviews: {{totalReviews}}\nComplaints: {{totalComplaints}}\nResolved: {{resolvedComplaints}}",
    variables: [
      "averageRating",
      "totalReviews",
      "totalComplaints",
      "resolvedComplaints"
    ],
    maxLength: 160,
    priority: NotificationPriority.DAILY_SUMMARY
  },
  [NotificationEventType.STAFF_PERFORMANCE_SUMMARY]: {
    template:
      "� Staff Performance\nShifts: {{totalShifts}}\nAttendance: {{attendanceRate}}%\nTasks: {{completedTasks}}/{{totalTasks}}\nRating: {{avgRating}}/5",
    variables: [
      "totalShifts",
      "attendanceRate",
      "completedTasks",
      "totalTasks",
      "avgRating"
    ],
    maxLength: 160,
    priority: NotificationPriority.DAILY_SUMMARY
  },
  [NotificationEventType.ROOM_OCCUPANCY_SUMMARY]: {
    template:
      "🏨 Room Occupancy\nOccupied: {{occupiedRooms}}/{{totalRooms}}\nRate: {{occupancyRate}}%\nAvailable: {{availableRooms}}\nOOO: {{outOfOrderRooms}}",
    variables: [
      "occupiedRooms",
      "totalRooms",
      "occupancyRate",
      "availableRooms",
      "outOfOrderRooms"
    ],
    maxLength: 160,
    priority: NotificationPriority.DAILY_SUMMARY
  }
};

/**
 * Replace template variables with actual data
 */
function replaceTemplateVariables(
  template: string,
  data: Record<string, unknown>
): string {
  let result = template;
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(value || ""));
  });
  return result;
}

/**
 * Optimize SMS content for character limits
 */
function optimizeSMSContent(
  content: string,
  maxLength: number = 160
): {
  content: string;
  segmentCount: number;
  truncated: boolean;
} {
  const segmentCount = Math.ceil(content.length / maxLength);
  const truncated = content.length > maxLength * SMS_CONFIG.maxSegments;

  if (truncated) {
    const allowedLength = maxLength * SMS_CONFIG.maxSegments - 3; // Reserve space for "..."
    content = content.substring(0, allowedLength) + "...";
  }

  return {
    content,
    segmentCount: Math.min(segmentCount, SMS_CONFIG.maxSegments),
    truncated
  };
}

/**
 * Twilio SMS Service Class
*/
export class TwilioSMSService {
  private client: twilio.Twilio;

  constructor() {
    if (
      !SMS_CONFIG.accountSid ||
      !SMS_CONFIG.authToken ||
      !SMS_CONFIG.phoneNumber
    ) {
      throw new Error(
        "Twilio configuration missing. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables."
      );
    }

    this.client = twilio(SMS_CONFIG.accountSid, SMS_CONFIG.authToken);
  }

  /**
   * Generate SMS content from notification payload
   */
  private generateSMSContent(
    eventType: NotificationEventType,
    data: Record<string, unknown>
  ): { content: string; segmentCount: number; truncated: boolean } {
    const template = SMS_TEMPLATES[eventType];
    if (!template) {
      throw new Error(`No SMS template found for event type: ${eventType}`);
    }

    const content = replaceTemplateVariables(template.template, data);
    return optimizeSMSContent(content, template.maxLength);
  }

  /**
   * Send SMS notification
   */
  async sendNotification(
    eventType: NotificationEventType,
    recipientPhone: string,
    data: Record<string, unknown>
  ): Promise<SMSDeliveryResult> {
    try {
      // Validate phone number format
      if (!recipientPhone || !recipientPhone.startsWith("+")) {
        return {
          success: false,
          error:
            "Invalid phone number format. Must include country code with + prefix."
        };
      }

      // Generate SMS content
      const { content, segmentCount } = this.generateSMSContent(
        eventType,
        data
      );

      // Send SMS via Twilio
      const message = await this.client.messages.create({
        body: content,
        from: SMS_CONFIG.phoneNumber,
        to: recipientPhone,
        // Add custom parameters for tracking
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`,
        provideFeedback: true
      });

      return {
        success: true,
        messageId: message.sid,
        segmentCount,
        estimatedCost: `$${(segmentCount * 0.0075).toFixed(4)}` // Approximate Twilio pricing
      };
    } catch (error) {
      console.error("Twilio SMS error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown SMS error"
      };
    }
  }

  /**
   * Send bulk SMS notifications
   */
  async sendBulkNotifications(
    eventType: NotificationEventType,
    recipients: Array<{ phone: string; data: Record<string, unknown> }>,
    batchSize: number = 10
  ): Promise<Array<SMSDeliveryResult & { phone: string }>> {
    const results: Array<SMSDeliveryResult & { phone: string }> = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchPromises = batch.map(async ({ phone, data }) => {
        const result = await this.sendNotification(eventType, phone, data);
        return { ...result, phone };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Get SMS template for preview
   */
  getSMSTemplate(eventType: NotificationEventType): SMSTemplateData | null {
    return SMS_TEMPLATES[eventType] || null;
  }

  /**
   * Validate SMS configuration
   */
  static validateConfiguration(): {
    isConfigured: boolean;
    missingVars: string[];
    recommendations: string[];
  } {
    const missingVars: string[] = [];
    const recommendations: string[] = [];

    if (!SMS_CONFIG.accountSid) missingVars.push("TWILIO_ACCOUNT_SID");
    if (!SMS_CONFIG.authToken) missingVars.push("TWILIO_AUTH_TOKEN");
    if (!SMS_CONFIG.phoneNumber) missingVars.push("TWILIO_PHONE_NUMBER");

    if (SMS_CONFIG.phoneNumber && !SMS_CONFIG.phoneNumber.startsWith("+")) {
      recommendations.push(
        "TWILIO_PHONE_NUMBER should include country code with + prefix"
      );
    }

    if (process.env.NODE_ENV === "production") {
      recommendations.push(
        "Verify Twilio phone number is verified for production use"
      );
      recommendations.push("Set up Twilio webhook URL for delivery tracking");
    }

    return {
      isConfigured: missingVars.length === 0,
      missingVars,
      recommendations
    };
  }
}

// Export singleton instance
export const twilioSMSService = new TwilioSMSService();
