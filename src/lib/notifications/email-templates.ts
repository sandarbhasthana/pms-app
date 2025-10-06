// File: src/lib/notifications/email-templates.ts

import { NotificationEventType } from "@/types/notifications";

export interface EmailTemplateData {
  subject: string;
  html: string;
  text: string;
  variables: string[];
}

/**
 * Email template registry for different notification types
 */
export const EMAIL_TEMPLATES: Record<NotificationEventType, EmailTemplateData> =
  {
    [NotificationEventType.ROOM_SERVICE_REQUEST]: {
      subject: "🛎️ Room Service Request - Room {{roomNumber}}",
      variables: ["roomNumber", "guestName", "requestDetails", "requestTime"],
      html: `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #92400e; margin-top: 0;">🛎️ New Room Service Request</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Room Number:</strong> {{roomNumber}}</p>
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Request Details:</strong> {{requestDetails}}</p>
          <p><strong>Request Time:</strong> {{requestTime}}</p>
        </div>
        <p style="color: #92400e; font-weight: 600;">Please attend to this request as soon as possible.</p>
      </div>
    `,
      text: `
🛎️ NEW ROOM SERVICE REQUEST

Room Number: {{roomNumber}}
Guest Name: {{guestName}}
Request Details: {{requestDetails}}
Request Time: {{requestTime}}

Please attend to this request as soon as possible.
    `
    },

    [NotificationEventType.PAYMENT_FAILURE]: {
      subject: "⚠️ Payment Failed - {{guestName}}",
      variables: ["guestName", "reservationId", "amount", "errorMessage"],
      html: `
      <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #dc2626; margin-top: 0;">⚠️ Payment Failure Alert</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Reservation ID:</strong> {{reservationId}}</p>
          <p><strong>Amount:</strong> ₹{{amount}}</p>
          <p><strong>Error Message:</strong> {{errorMessage}}</p>
        </div>
        <p style="color: #dc2626; font-weight: 600;">Please contact the guest immediately to resolve this payment issue.</p>
      </div>
    `,
      text: `
⚠️ PAYMENT FAILURE ALERT

Guest Name: {{guestName}}
Reservation ID: {{reservationId}}
Amount: ₹{{amount}}
Error Message: {{errorMessage}}

Please contact the guest immediately to resolve this payment issue.
    `
    },

    // Reservation Status Changes
    [NotificationEventType.RESERVATION_STATUS_CHANGE]: {
      subject: "📋 Reservation Status Changed - {{guestName}}",
      variables: [
        "guestName",
        "reservationId",
        "previousStatus",
        "newStatus",
        "changeReason"
      ],
      html: `
      <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1d4ed8; margin-top: 0;">📋 Reservation Status Changed</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Reservation ID:</strong> {{reservationId}}</p>
          <p><strong>Previous Status:</strong> {{previousStatus}}</p>
          <p><strong>New Status:</strong> {{newStatus}}</p>
          <p><strong>Change Reason:</strong> {{changeReason}}</p>
        </div>
        <p style="color: #1d4ed8; font-weight: 600;">Reservation status has been updated.</p>
      </div>
    `,
      text: `
📋 RESERVATION STATUS CHANGED

Guest Name: {{guestName}}
Reservation ID: {{reservationId}}
Previous Status: {{previousStatus}}
New Status: {{newStatus}}
Change Reason: {{changeReason}}

Reservation status has been updated.
    `
    },

    [NotificationEventType.BOOKING_MODIFICATION]: {
      subject: "✏️ Booking Modified - {{guestName}}",
      variables: [
        "guestName",
        "reservationId",
        "modificationType",
        "changes",
        "modifiedBy"
      ],
      html: `
      <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #92400e; margin-top: 0;">✏️ Booking Modified</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Reservation ID:</strong> {{reservationId}}</p>
          <p><strong>Modification Type:</strong> {{modificationType}}</p>
          <p><strong>Changes:</strong> {{changes}}</p>
          <p><strong>Modified By:</strong> {{modifiedBy}}</p>
        </div>
        <p style="color: #92400e; font-weight: 600;">Booking has been successfully modified.</p>
      </div>
    `,
      text: `
✏️ BOOKING MODIFIED

Guest Name: {{guestName}}
Reservation ID: {{reservationId}}
Modification Type: {{modificationType}}
Changes: {{changes}}
Modified By: {{modifiedBy}}

Booking has been successfully modified.
    `
    },

    [NotificationEventType.RESERVATION_CANCELLATION]: {
      subject: "❌ Reservation Cancelled - {{guestName}}",
      variables: [
        "guestName",
        "reservationId",
        "cancellationReason",
        "refundAmount"
      ],
      html: `
      <div style="background: #fef2f2; border: 1px solid #f97316; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #ea580c; margin-top: 0;">❌ Reservation Cancelled</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Reservation ID:</strong> {{reservationId}}</p>
          <p><strong>Cancellation Reason:</strong> {{cancellationReason}}</p>
          <p><strong>Refund Amount:</strong> ₹{{refundAmount}}</p>
        </div>
        <p style="color: #ea580c; font-weight: 600;">Please process the refund and update room availability.</p>
      </div>
    `,
      text: `
❌ RESERVATION CANCELLED

Guest Name: {{guestName}}
Reservation ID: {{reservationId}}
Cancellation Reason: {{cancellationReason}}
Refund Amount: ₹{{refundAmount}}

Please process the refund and update room availability.
    `
    },

    // Check-in/Check-out Time Changes
    [NotificationEventType.CHECKIN_TIME_CHANGE]: {
      subject: "🕐 Check-in Time Changed - {{guestName}}",
      variables: [
        "guestName",
        "reservationId",
        "oldCheckInTime",
        "newCheckInTime",
        "reason"
      ],
      html: `
      <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #92400e; margin-top: 0;">🕐 Check-in Time Changed</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Reservation ID:</strong> {{reservationId}}</p>
          <p><strong>Previous Check-in:</strong> {{oldCheckInTime}}</p>
          <p><strong>New Check-in:</strong> {{newCheckInTime}}</p>
          <p><strong>Reason:</strong> {{reason}}</p>
        </div>
        <p style="color: #92400e; font-weight: 600;">Check-in time has been updated.</p>
      </div>
    `,
      text: `
🕐 CHECK-IN TIME CHANGED

Guest Name: {{guestName}}
Reservation ID: {{reservationId}}
Previous Check-in: {{oldCheckInTime}}
New Check-in: {{newCheckInTime}}
Reason: {{reason}}

Check-in time has been updated.
    `
    },

    [NotificationEventType.CHECKOUT_TIME_CHANGE]: {
      subject: "� Check-out Time Changed - {{guestName}}",
      variables: [
        "guestName",
        "reservationId",
        "oldCheckOutTime",
        "newCheckOutTime",
        "reason"
      ],
      html: `
      <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #92400e; margin-top: 0;">� Check-out Time Changed</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Reservation ID:</strong> {{reservationId}}</p>
          <p><strong>Previous Check-out:</strong> {{oldCheckOutTime}}</p>
          <p><strong>New Check-out:</strong> {{newCheckOutTime}}</p>
          <p><strong>Reason:</strong> {{reason}}</p>
        </div>
        <p style="color: #92400e; font-weight: 600;">Check-out time has been updated.</p>
      </div>
    `,
      text: `
� CHECK-OUT TIME CHANGED

Guest Name: {{guestName}}
Reservation ID: {{reservationId}}
Previous Check-out: {{oldCheckOutTime}}
New Check-out: {{newCheckOutTime}}
Reason: {{reason}}

Check-out time has been updated.
    `
    },

    [NotificationEventType.NO_SHOW_DETECTED]: {
      subject: "❌ No-Show Alert - {{guestName}}",
      variables: ["guestName", "reservationId", "checkInDate", "roomNumber"],
      html: `
      <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #dc2626; margin-top: 0;">❌ Guest No-Show Detected</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Reservation ID:</strong> {{reservationId}}</p>
          <p><strong>Expected Check-in:</strong> {{checkInDate}}</p>
          <p><strong>Room Number:</strong> {{roomNumber}}</p>
        </div>
        <p style="color: #dc2626; font-weight: 600;">The guest has not checked in as expected. Please follow up and consider releasing the room.</p>
      </div>
    `,
      text: `
❌ GUEST NO-SHOW DETECTED

Guest Name: {{guestName}}
Reservation ID: {{reservationId}}
Expected Check-in: {{checkInDate}}
Room Number: {{roomNumber}}

The guest has not checked in as expected. Please follow up and consider releasing the room.
    `
    },

    // Payment Issues
    [NotificationEventType.CREDIT_CARD_DECLINED]: {
      subject: "� Credit Card Declined - {{guestName}}",
      variables: [
        "guestName",
        "reservationId",
        "amount",
        "cardLast4",
        "declineReason"
      ],
      html: `
      <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #dc2626; margin-top: 0;">💳 Credit Card Declined</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Reservation ID:</strong> {{reservationId}}</p>
          <p><strong>Amount:</strong> ₹{{amount}}</p>
          <p><strong>Card Ending:</strong> ****{{cardLast4}}</p>
          <p><strong>Decline Reason:</strong> {{declineReason}}</p>
        </div>
        <p style="color: #dc2626; font-weight: 600;">Please contact the guest to resolve this payment issue.</p>
      </div>
    `,
      text: `
💳 CREDIT CARD DECLINED

Guest Name: {{guestName}}
Reservation ID: {{reservationId}}
Amount: ₹{{amount}}
Card Ending: ****{{cardLast4}}
Decline Reason: {{declineReason}}

Please contact the guest to resolve this payment issue.
    `
    },

    [NotificationEventType.REFUND_PROCESSING_ISSUE]: {
      subject: "💰 Refund Processing Issue - {{guestName}}",
      variables: [
        "guestName",
        "reservationId",
        "refundAmount",
        "issueDescription",
        "errorCode"
      ],
      html: `
      <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #dc2626; margin-top: 0;">� Refund Processing Issue</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Reservation ID:</strong> {{reservationId}}</p>
          <p><strong>Refund Amount:</strong> ₹{{refundAmount}}</p>
          <p><strong>Issue:</strong> {{issueDescription}}</p>
          <p><strong>Error Code:</strong> {{errorCode}}</p>
        </div>
        <p style="color: #dc2626; font-weight: 600;">Manual intervention required to process this refund.</p>
      </div>
    `,
      text: `
� REFUND PROCESSING ISSUE

Guest Name: {{guestName}}
Reservation ID: {{reservationId}}
Refund Amount: ₹{{refundAmount}}
Issue: {{issueDescription}}
Error Code: {{errorCode}}

Manual intervention required to process this refund.
    `
    },

    [NotificationEventType.CHARGEBACK_NOTIFICATION]: {
      subject: "⚠️ Chargeback Notification - {{guestName}}",
      variables: [
        "guestName",
        "reservationId",
        "chargebackAmount",
        "reason",
        "disputeId"
      ],
      html: `
      <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #dc2626; margin-top: 0;">⚠️ Chargeback Notification</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Reservation ID:</strong> {{reservationId}}</p>
          <p><strong>Chargeback Amount:</strong> ₹{{chargebackAmount}}</p>
          <p><strong>Reason:</strong> {{reason}}</p>
          <p><strong>Dispute ID:</strong> {{disputeId}}</p>
        </div>
        <p style="color: #dc2626; font-weight: 600;">Immediate action required to respond to this chargeback.</p>
      </div>
    `,
      text: `
⚠️ CHARGEBACK NOTIFICATION

Guest Name: {{guestName}}
Reservation ID: {{reservationId}}
Chargeback Amount: ₹{{chargebackAmount}}
Reason: {{reason}}
Dispute ID: {{disputeId}}

Immediate action required to respond to this chargeback.
    `
    },

    [NotificationEventType.EQUIPMENT_FAILURE]: {
      subject: "⚠️ Equipment Failure - {{equipmentName}}",
      variables: [
        "equipmentName",
        "location",
        "issueDescription",
        "severity",
        "affectedRooms"
      ],
      html: `
      <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #dc2626; margin-top: 0;">⚠️ Equipment Failure Alert</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Equipment:</strong> {{equipmentName}}</p>
          <p><strong>Location:</strong> {{location}}</p>
          <p><strong>Issue Description:</strong> {{issueDescription}}</p>
          <p><strong>Severity:</strong> {{severity}}</p>
          <p><strong>Affected Rooms:</strong> {{affectedRooms}}</p>
        </div>
        <p style="color: #dc2626; font-weight: 600;">Immediate attention required! This may impact guest experience.</p>
      </div>
    `,
      text: `
⚠️ EQUIPMENT FAILURE ALERT

Equipment: {{equipmentName}}
Location: {{location}}
Issue Description: {{issueDescription}}
Severity: {{severity}}
Affected Rooms: {{affectedRooms}}

Immediate attention required! This may impact guest experience.
    `
    },

    // Daily Summary Templates
    [NotificationEventType.DAILY_REVENUE_SUMMARY]: {
      subject: "📊 Daily Revenue Summary - {{date}}",
      variables: [
        "date",
        "totalRevenue",
        "bookingCount",
        "averageRate",
        "occupancyRate"
      ],
      html: `
      <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1d4ed8; margin-top: 0;">📊 Daily Revenue Summary</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Date:</strong> {{date}}</p>
          <p><strong>Total Revenue:</strong> ₹{{totalRevenue}}</p>
          <p><strong>Booking Count:</strong> {{bookingCount}}</p>
          <p><strong>Average Rate:</strong> ₹{{averageRate}}</p>
          <p><strong>Occupancy Rate:</strong> {{occupancyRate}}%</p>
        </div>
      </div>
    `,
      text: `
📊 DAILY REVENUE SUMMARY

Date: {{date}}
Total Revenue: ₹{{totalRevenue}}
Booking Count: {{bookingCount}}
Average Rate: ₹{{averageRate}}
Occupancy Rate: {{occupancyRate}}%
    `
    },

    [NotificationEventType.BOOKING_PERFORMANCE_SUMMARY]: {
      subject: "📈 Booking Performance Summary - {{date}}",
      variables: [
        "date",
        "newBookings",
        "cancellations",
        "noShows",
        "conversionRate"
      ],
      html: `
      <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1d4ed8; margin-top: 0;">📈 Booking Performance Summary</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Date:</strong> {{date}}</p>
          <p><strong>New Bookings:</strong> {{newBookings}}</p>
          <p><strong>Cancellations:</strong> {{cancellations}}</p>
          <p><strong>No-Shows:</strong> {{noShows}}</p>
          <p><strong>Conversion Rate:</strong> {{conversionRate}}%</p>
        </div>
      </div>
    `,
      text: `
📈 BOOKING PERFORMANCE SUMMARY

Date: {{date}}
New Bookings: {{newBookings}}
Cancellations: {{cancellations}}
No-Shows: {{noShows}}
Conversion Rate: {{conversionRate}}%
    `
    },

    [NotificationEventType.GUEST_SATISFACTION_SUMMARY]: {
      subject: "⭐ Guest Satisfaction Summary - {{date}}",
      variables: [
        "date",
        "averageRating",
        "totalReviews",
        "positiveReviews",
        "issuesReported"
      ],
      html: `
      <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1d4ed8; margin-top: 0;">⭐ Guest Satisfaction Summary</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Date:</strong> {{date}}</p>
          <p><strong>Average Rating:</strong> {{averageRating}}/5</p>
          <p><strong>Total Reviews:</strong> {{totalReviews}}</p>
          <p><strong>Positive Reviews:</strong> {{positiveReviews}}</p>
          <p><strong>Issues Reported:</strong> {{issuesReported}}</p>
        </div>
      </div>
    `,
      text: `
⭐ GUEST SATISFACTION SUMMARY

Date: {{date}}
Average Rating: {{averageRating}}/5
Total Reviews: {{totalReviews}}
Positive Reviews: {{positiveReviews}}
Issues Reported: {{issuesReported}}
    `
    },

    [NotificationEventType.STAFF_PERFORMANCE_SUMMARY]: {
      subject: "👥 Staff Performance Summary - {{date}}",
      variables: [
        "date",
        "totalStaff",
        "attendanceRate",
        "tasksCompleted",
        "averageRating"
      ],
      html: `
      <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1d4ed8; margin-top: 0;">👥 Staff Performance Summary</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Date:</strong> {{date}}</p>
          <p><strong>Total Staff:</strong> {{totalStaff}}</p>
          <p><strong>Attendance Rate:</strong> {{attendanceRate}}%</p>
          <p><strong>Tasks Completed:</strong> {{tasksCompleted}}</p>
          <p><strong>Average Rating:</strong> {{averageRating}}/5</p>
        </div>
      </div>
    `,
      text: `
👥 STAFF PERFORMANCE SUMMARY

Date: {{date}}
Total Staff: {{totalStaff}}
Attendance Rate: {{attendanceRate}}%
Tasks Completed: {{tasksCompleted}}
Average Rating: {{averageRating}}/5
    `
    },

    [NotificationEventType.ROOM_OCCUPANCY_SUMMARY]: {
      subject: "🏨 Room Occupancy Summary - {{date}}",
      variables: [
        "date",
        "totalRooms",
        "occupiedRooms",
        "occupancyRate",
        "availableRooms"
      ],
      html: `
      <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1d4ed8; margin-top: 0;">🏨 Room Occupancy Summary</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Date:</strong> {{date}}</p>
          <p><strong>Total Rooms:</strong> {{totalRooms}}</p>
          <p><strong>Occupied Rooms:</strong> {{occupiedRooms}}</p>
          <p><strong>Occupancy Rate:</strong> {{occupancyRate}}%</p>
          <p><strong>Available Rooms:</strong> {{availableRooms}}</p>
        </div>
      </div>
    `,
      text: `
🏨 ROOM OCCUPANCY SUMMARY

Date: {{date}}
Total Rooms: {{totalRooms}}
Occupied Rooms: {{occupiedRooms}}
Occupancy Rate: {{occupancyRate}}%
Available Rooms: {{availableRooms}}
    `
    },

    // Service Requests/Housekeeping
    [NotificationEventType.CLEANING_REQUEST]: {
      subject: "🧹 Cleaning Request - {{location}}",
      variables: [
        "location",
        "requestType",
        "priority",
        "requestedBy",
        "specialInstructions"
      ],
      html: `
      <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1d4ed8; margin-top: 0;">🧹 Cleaning Request</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Location:</strong> {{location}}</p>
          <p><strong>Request Type:</strong> {{requestType}}</p>
          <p><strong>Priority:</strong> {{priority}}</p>
          <p><strong>Requested By:</strong> {{requestedBy}}</p>
          <p><strong>Special Instructions:</strong> {{specialInstructions}}</p>
        </div>
        <p style="color: #1d4ed8; font-weight: 600;">Please attend to this cleaning request promptly.</p>
      </div>
    `,
      text: `
🧹 CLEANING REQUEST

Location: {{location}}
Request Type: {{requestType}}
Priority: {{priority}}
Requested By: {{requestedBy}}
Special Instructions: {{specialInstructions}}

Please attend to this cleaning request promptly.
    `
    },

    [NotificationEventType.HOUSEKEEPING_STATUS_UPDATE]: {
      subject: "🏠 Housekeeping Status Update - {{roomNumber}}",
      variables: [
        "roomNumber",
        "previousStatus",
        "newStatus",
        "staffMember",
        "notes"
      ],
      html: `
      <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1d4ed8; margin-top: 0;">🏠 Housekeeping Status Update</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Room Number:</strong> {{roomNumber}}</p>
          <p><strong>Previous Status:</strong> {{previousStatus}}</p>
          <p><strong>New Status:</strong> {{newStatus}}</p>
          <p><strong>Staff Member:</strong> {{staffMember}}</p>
          <p><strong>Notes:</strong> {{notes}}</p>
        </div>
        <p style="color: #1d4ed8; font-weight: 600;">Room status has been updated.</p>
      </div>
    `,
      text: `
🏠 HOUSEKEEPING STATUS UPDATE

Room Number: {{roomNumber}}
Previous Status: {{previousStatus}}
New Status: {{newStatus}}
Staff Member: {{staffMember}}
Notes: {{notes}}

Room status has been updated.
    `
    },

    [NotificationEventType.SUPPLY_REQUEST]: {
      subject: "📦 Supply Request - {{itemName}}",
      variables: [
        "itemName",
        "quantity",
        "department",
        "requestedBy",
        "urgency"
      ],
      html: `
      <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #92400e; margin-top: 0;">📦 Supply Request</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Item Name:</strong> {{itemName}}</p>
          <p><strong>Quantity:</strong> {{quantity}}</p>
          <p><strong>Department:</strong> {{department}}</p>
          <p><strong>Requested By:</strong> {{requestedBy}}</p>
          <p><strong>Urgency:</strong> {{urgency}}</p>
        </div>
        <p style="color: #92400e; font-weight: 600;">Please process this supply request based on urgency level.</p>
      </div>
    `,
      text: `
📦 SUPPLY REQUEST

Item Name: {{itemName}}
Quantity: {{quantity}}
Department: {{department}}
Requested By: {{requestedBy}}
Urgency: {{urgency}}

Please process this supply request based on urgency level.
    `
    },

    [NotificationEventType.LOST_FOUND_ITEM]: {
      subject: "🔍 Lost & Found Item - {{itemDescription}}",
      variables: [
        "itemDescription",
        "location",
        "foundBy",
        "dateFound",
        "guestName"
      ],
      html: `
      <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1d4ed8; margin-top: 0;">🔍 Lost & Found Item</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Item Description:</strong> {{itemDescription}}</p>
          <p><strong>Location Found:</strong> {{location}}</p>
          <p><strong>Found By:</strong> {{foundBy}}</p>
          <p><strong>Date Found:</strong> {{dateFound}}</p>
          <p><strong>Possible Guest:</strong> {{guestName}}</p>
        </div>
        <p style="color: #1d4ed8; font-weight: 600;">Please log this item and attempt to contact the guest.</p>
      </div>
    `,
      text: `
🔍 LOST & FOUND ITEM

Item Description: {{itemDescription}}
Location Found: {{location}}
Found By: {{foundBy}}
Date Found: {{dateFound}}
Possible Guest: {{guestName}}

Please log this item and attempt to contact the guest.
    `
    },

    // Missing Room Request Templates
    [NotificationEventType.ROOM_CHANGE_REQUEST]: {
      subject: "🔄 Room Change Request - {{guestName}}",
      variables: [
        "guestName",
        "reservationId",
        "currentRoom",
        "requestedRoom",
        "reason"
      ],
      html: `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #92400e; margin-top: 0;">🔄 Room Change Request</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Reservation ID:</strong> {{reservationId}}</p>
          <p><strong>Current Room:</strong> {{currentRoom}}</p>
          <p><strong>Requested Room:</strong> {{requestedRoom}}</p>
          <p><strong>Reason:</strong> {{reason}}</p>
        </div>
        <p style="color: #92400e; font-weight: 600;">Please review and process this room change request.</p>
      </div>
    `,
      text: `
🔄 ROOM CHANGE REQUEST

Guest Name: {{guestName}}
Reservation ID: {{reservationId}}
Current Room: {{currentRoom}}
Requested Room: {{requestedRoom}}
Reason: {{reason}}

Please review and process this room change request.
    `
    },

    [NotificationEventType.SPECIAL_ACCOMMODATION_REQUEST]: {
      subject: "♿ Special Accommodation Request - {{guestName}}",
      variables: [
        "guestName",
        "reservationId",
        "accommodationType",
        "details",
        "urgency"
      ],
      html: `
      <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1d4ed8; margin-top: 0;">♿ Special Accommodation Request</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Guest Name:</strong> {{guestName}}</p>
          <p><strong>Reservation ID:</strong> {{reservationId}}</p>
          <p><strong>Accommodation Type:</strong> {{accommodationType}}</p>
          <p><strong>Details:</strong> {{details}}</p>
          <p><strong>Urgency:</strong> {{urgency}}</p>
        </div>
        <p style="color: #1d4ed8; font-weight: 600;">Please arrange the requested accommodation promptly.</p>
      </div>
    `,
      text: `
♿ SPECIAL ACCOMMODATION REQUEST

Guest Name: {{guestName}}
Reservation ID: {{reservationId}}
Accommodation Type: {{accommodationType}}
Details: {{details}}
Urgency: {{urgency}}

Please arrange the requested accommodation promptly.
    `
    },

    [NotificationEventType.ROOM_MAINTENANCE_REQUEST]: {
      subject: "🔧 Room Maintenance Request - Room {{roomNumber}}",
      variables: [
        "roomNumber",
        "issueType",
        "description",
        "severity",
        "reportedBy"
      ],
      html: `
      <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #92400e; margin-top: 0;">🔧 Room Maintenance Request</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Room Number:</strong> {{roomNumber}}</p>
          <p><strong>Issue Type:</strong> {{issueType}}</p>
          <p><strong>Description:</strong> {{description}}</p>
          <p><strong>Severity:</strong> {{severity}}</p>
          <p><strong>Reported By:</strong> {{reportedBy}}</p>
        </div>
        <p style="color: #92400e; font-weight: 600;">Please address this maintenance issue based on its severity level.</p>
      </div>
    `,
      text: `
🔧 ROOM MAINTENANCE REQUEST

Room Number: {{roomNumber}}
Issue Type: {{issueType}}
Description: {{description}}
Severity: {{severity}}
Reported By: {{reportedBy}}

Please address this maintenance issue based on its severity level.
    `
    },

    // Additional Maintenance Templates
    [NotificationEventType.REPAIR_REQUEST]: {
      subject: "🔨 Repair Request - {{equipmentName}}",
      variables: [
        "equipmentName",
        "location",
        "issueDescription",
        "priority",
        "requestedBy"
      ],
      html: `
      <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #92400e; margin-top: 0;">🔨 Repair Request</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Equipment:</strong> {{equipmentName}}</p>
          <p><strong>Location:</strong> {{location}}</p>
          <p><strong>Issue Description:</strong> {{issueDescription}}</p>
          <p><strong>Priority:</strong> {{priority}}</p>
          <p><strong>Requested By:</strong> {{requestedBy}}</p>
        </div>
        <p style="color: #92400e; font-weight: 600;">Please schedule repair work based on priority level.</p>
      </div>
    `,
      text: `
🔨 REPAIR REQUEST

Equipment: {{equipmentName}}
Location: {{location}}
Issue Description: {{issueDescription}}
Priority: {{priority}}
Requested By: {{requestedBy}}

Please schedule repair work based on priority level.
    `
    },

    [NotificationEventType.SAFETY_ISSUE]: {
      subject: "⚠️ Safety Issue Alert - {{location}}",
      variables: [
        "location",
        "issueType",
        "description",
        "severity",
        "reportedBy"
      ],
      html: `
      <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #dc2626; margin-top: 0;">⚠️ Safety Issue Alert</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Location:</strong> {{location}}</p>
          <p><strong>Issue Type:</strong> {{issueType}}</p>
          <p><strong>Description:</strong> {{description}}</p>
          <p><strong>Severity:</strong> {{severity}}</p>
          <p><strong>Reported By:</strong> {{reportedBy}}</p>
        </div>
        <p style="color: #dc2626; font-weight: 600;">IMMEDIATE ACTION REQUIRED! This is a safety concern that needs urgent attention.</p>
      </div>
    `,
      text: `
⚠️ SAFETY ISSUE ALERT

Location: {{location}}
Issue Type: {{issueType}}
Description: {{description}}
Severity: {{severity}}
Reported By: {{reportedBy}}

IMMEDIATE ACTION REQUIRED! This is a safety concern that needs urgent attention.
    `
    },

    [NotificationEventType.PREVENTIVE_MAINTENANCE_DUE]: {
      subject: "🔧 Preventive Maintenance Due - {{equipmentName}}",
      variables: [
        "equipmentName",
        "location",
        "maintenanceType",
        "dueDate",
        "lastMaintenance"
      ],
      html: `
      <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1d4ed8; margin-top: 0;">🔧 Preventive Maintenance Due</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p><strong>Equipment:</strong> {{equipmentName}}</p>
          <p><strong>Location:</strong> {{location}}</p>
          <p><strong>Maintenance Type:</strong> {{maintenanceType}}</p>
          <p><strong>Due Date:</strong> {{dueDate}}</p>
          <p><strong>Last Maintenance:</strong> {{lastMaintenance}}</p>
        </div>
        <p style="color: #1d4ed8; font-weight: 600;">Please schedule preventive maintenance to avoid equipment failure.</p>
      </div>
    `,
      text: `
🔧 PREVENTIVE MAINTENANCE DUE

Equipment: {{equipmentName}}
Location: {{location}}
Maintenance Type: {{maintenanceType}}
Due Date: {{dueDate}}
Last Maintenance: {{lastMaintenance}}

Please schedule preventive maintenance to avoid equipment failure.
    `
    }
  };

/**
 * Get email template for a specific notification event type
 */
export function getEmailTemplate(
  eventType: NotificationEventType
): EmailTemplateData {
  return (
    EMAIL_TEMPLATES[eventType] ||
    EMAIL_TEMPLATES[NotificationEventType.ROOM_SERVICE_REQUEST]
  );
}

/**
 * Replace template variables with actual data
 */
export function replaceTemplateVariables(
  template: string,
  data: Record<string, string | number | boolean | null>
): string {
  let result = template;

  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(value || ""));
  });

  return result;
}
