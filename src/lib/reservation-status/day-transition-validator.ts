/**
 * Day Transition Validator Service
 * Detects booking issues that should block calendar day transitions
 */

import { prisma } from "@/lib/prisma";
import {
  DayTransitionIssue,
  DayTransitionValidationResponse,
  DayTransitionIssueType,
  IssueSeverity
} from "@/types/day-transition";
import {
  getOperationalDayStart,
  getOperationalDayEnd
} from "@/lib/timezone/day-boundaries";
import { ReservationStatus } from "@prisma/client";

/**
 * Validates if a day transition should be blocked due to booking issues
 * Checks for 3 types of issues:
 * 1. Yesterday's bookings with partial payments
 * 2. Yesterday's bookings with CHECKOUT_DUE status (never checked out)
 * 3. Today's bookings with CHECKOUT_DUE status (not yet checked out)
 */
export async function validateDayTransition(
  propertyId: string,
  timezone: string
): Promise<DayTransitionValidationResponse> {
  try {
    const now = new Date();
    const issues: DayTransitionIssue[] = [];

    // Get today's operational day boundaries (6 AM to 5:59 AM next day)
    const todayStart = getOperationalDayStart(now, timezone);
    const todayEnd = getOperationalDayEnd(now, timezone);

    // Get yesterday's operational day boundaries
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = getOperationalDayStart(yesterday, timezone);
    const yesterdayEnd = getOperationalDayEnd(yesterday, timezone);

    // Query 1: Yesterday's IN_HOUSE reservations with PARTIALLY_PAID status
    const partialPaymentIssues = await prisma.reservation.findMany({
      where: {
        propertyId,
        status: ReservationStatus.IN_HOUSE,
        checkOut: {
          gte: yesterdayStart,
          lte: yesterdayEnd
        },
        paymentStatus: "PARTIALLY_PAID",
        deletedAt: null
      },
      select: {
        id: true,
        guestName: true,
        room: {
          select: {
            name: true
          }
        },
        checkOut: true,
        paymentStatus: true,
        status: true
      }
    });

    // Query 2: Yesterday's CHECKOUT_DUE reservations (never checked out)
    const checkoutDueNotCompletedIssues = await prisma.reservation.findMany({
      where: {
        propertyId,
        status: ReservationStatus.CHECKOUT_DUE,
        checkOut: {
          gte: yesterdayStart,
          lte: yesterdayEnd
        },
        deletedAt: null
      },
      select: {
        id: true,
        guestName: true,
        room: {
          select: {
            name: true
          }
        },
        checkOut: true,
        paymentStatus: true,
        status: true
      }
    });

    // Query 3: Today's CHECKOUT_DUE reservations (not yet checked out)
    const checkoutDueTodayIssues = await prisma.reservation.findMany({
      where: {
        propertyId,
        status: ReservationStatus.CHECKOUT_DUE,
        checkOut: {
          gte: todayStart,
          lt: todayEnd
        },
        deletedAt: null
      },
      select: {
        id: true,
        guestName: true,
        room: {
          select: {
            name: true
          }
        },
        checkOut: true,
        paymentStatus: true,
        status: true
      }
    });

    // Process PARTIAL_PAYMENT issues
    for (const reservation of partialPaymentIssues) {
      issues.push({
        reservationId: reservation.id,
        guestName: reservation.guestName || "Unknown Guest",
        roomNumber: reservation.room?.name || "N/A",
        issueType: "PARTIAL_PAYMENT",
        description: `Guest checked out yesterday but payment is incomplete. Remaining balance due.`,
        severity: "warning",
        checkOutDate: reservation.checkOut.toISOString(),
        paymentStatus: reservation.paymentStatus || "PARTIALLY_PAID",
        reservationStatus: reservation.status
      });
    }

    // Process CHECKOUT_DUE_NOT_COMPLETED issues
    for (const reservation of checkoutDueNotCompletedIssues) {
      issues.push({
        reservationId: reservation.id,
        guestName: reservation.guestName || "Unknown Guest",
        roomNumber: reservation.room?.name || "N/A",
        issueType: "CHECKOUT_DUE_NOT_COMPLETED",
        description: `Guest was marked for checkout yesterday but never completed checkout. Manual intervention required.`,
        severity: "critical",
        checkOutDate: reservation.checkOut.toISOString(),
        paymentStatus: reservation.paymentStatus ?? undefined,
        reservationStatus: reservation.status
      });
    }

    // Process CHECKOUT_DUE_TODAY issues
    for (const reservation of checkoutDueTodayIssues) {
      issues.push({
        reservationId: reservation.id,
        guestName: reservation.guestName || "Unknown Guest",
        roomNumber: reservation.room?.name || "N/A",
        issueType: "CHECKOUT_DUE_TODAY",
        description: `Guest is marked for checkout today but has not yet checked out.`,
        severity: "warning",
        checkOutDate: reservation.checkOut.toISOString(),
        paymentStatus: reservation.paymentStatus ?? undefined,
        reservationStatus: reservation.status
      });
    }

    // Sort issues by severity (critical first) then by guest name
    issues.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === "critical" ? -1 : 1;
      }
      return a.guestName.localeCompare(b.guestName);
    });

    return {
      canTransition: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(
      `Error validating day transition for property ${propertyId}:`,
      error
    );
    throw error;
  }
}

/**
 * Get issues for a specific date (for debugging/reporting)
 */
export async function getIssuesForDate(
  propertyId: string,
  date: string,
  timezone: string
): Promise<DayTransitionIssue[]> {
  try {
    const targetDate = new Date(date);
    const dayStart = getOperationalDayStart(targetDate, timezone);
    const dayEnd = getOperationalDayEnd(targetDate, timezone);

    const issues: DayTransitionIssue[] = [];

    // Query all potential issues for this date
    const reservations = await prisma.reservation.findMany({
      where: {
        propertyId,
        checkOut: {
          gte: dayStart,
          lte: dayEnd
        },
        deletedAt: null,
        OR: [
          { paymentStatus: "PARTIALLY_PAID" },
          { status: ReservationStatus.CHECKOUT_DUE }
        ]
      },
      select: {
        id: true,
        guestName: true,
        room: {
          select: {
            name: true
          }
        },
        checkOut: true,
        paymentStatus: true,
        status: true
      }
    });

    for (const reservation of reservations) {
      let issueType: DayTransitionIssueType | null = null;
      let severity: IssueSeverity = "warning";
      let description = "";

      if (
        reservation.status === ReservationStatus.CHECKOUT_DUE &&
        reservation.checkOut < dayStart
      ) {
        issueType = "CHECKOUT_DUE_NOT_COMPLETED";
        severity = "critical";
        description =
          "Guest was marked for checkout but never completed checkout.";
      } else if (reservation.paymentStatus === "PARTIALLY_PAID") {
        issueType = "PARTIAL_PAYMENT";
        severity = "warning";
        description = "Guest checked out but payment is incomplete.";
      } else if (reservation.status === ReservationStatus.CHECKOUT_DUE) {
        issueType = "CHECKOUT_DUE_TODAY";
        severity = "warning";
        description =
          "Guest is marked for checkout but has not yet checked out.";
      }

      if (issueType) {
        issues.push({
          reservationId: reservation.id,
          guestName: reservation.guestName || "Unknown Guest",
          roomNumber: reservation.room?.name || "N/A",
          issueType,
          description,
          severity,
          checkOutDate: reservation.checkOut.toISOString(),
          paymentStatus: reservation.paymentStatus || undefined,
          reservationStatus: reservation.status
        });
      }
    }

    return issues;
  } catch (error) {
    console.error(
      `Error getting issues for date ${date} in property ${propertyId}:`,
      error
    );
    throw error;
  }
}
