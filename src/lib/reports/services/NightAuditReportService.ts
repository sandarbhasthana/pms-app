/**
 * Night Audit Report Service
 *
 * Generates night audit reports showing all bookings for a selected night
 * (6 AM to 6 AM) with check-ins, check-outs, total revenue, cancellations
 */

import prisma from "@/lib/prisma";
import { ReportService } from "../ReportService";
import { ReportGenerationRequest, ReportData } from "../types";
import { startOfDay, addHours } from "date-fns";

// Type definitions for helper function return types
interface CheckInData {
  reservationId: string;
  guestName: string;
  roomNumber: string;
  checkInTime: Date;
  nights: number;
  totalAmount: number;
  paymentStatus: string;
}

interface CheckOutData {
  reservationId: string;
  guestName: string;
  roomNumber: string;
  checkOutTime: Date;
  totalAmount: number;
  balanceDue: number;
}

interface CancellationData {
  reservationId: string;
  guestName: string;
  roomType: string;
  cancelledAt: Date;
  reason?: string;
  refundAmount: number;
}

interface NoShowData {
  reservationId: string;
  guestName: string;
  roomType: string;
  expectedCheckIn: Date;
  chargeAmount: number;
}

interface InHouseGuestData {
  reservationId: string;
  guestName: string;
  roomNumber: string;
  checkInDate: Date;
  checkOutDate: Date;
  nights: number;
}

interface SummaryData {
  totalRevenue: number;
  roomRevenue: number;
  addonRevenue: number;
  taxRevenue: number;
  totalBookings: number;
  checkIns: number;
  checkOuts: number;
  cancellations: number;
  noShows: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
}

export class NightAuditReportService extends ReportService {
  /**
   * Fetch night audit report data
   */
  protected async fetchReportData(
    request: ReportGenerationRequest
  ): Promise<ReportData> {
    // Calculate the night date range (6 AM to 6 AM)
    // Convert string to Date if needed (dates get serialized when going through Redis queue)
    const reportDate = request.startDate
      ? new Date(request.startDate)
      : new Date();
    const nightStart = this.calculateNightStart(reportDate);
    const nightEnd = addHours(nightStart, 24);

    console.log(
      `📊 Generating Night Audit Report for: ${nightStart.toISOString()} to ${nightEnd.toISOString()}`
    );

    // Fetch property details
    const property = await prisma.property.findUnique({
      where: { id: request.propertyId! },
      select: {
        id: true,
        name: true,
        suite: true,
        street: true,
        city: true,
        state: true,
        zipCode: true,
        country: true
      }
    });

    if (!property) {
      throw new Error("Property not found");
    }

    // Fetch organization details
    const organization = await prisma.organization.findUnique({
      where: { id: request.organizationId },
      select: { name: true }
    });

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { name: true, email: true }
    });

    // Fetch all reservations for the night
    const [
      checkIns,
      checkOuts,
      cancellations,
      noShows,
      inHouseGuests,
      totalRooms
    ] = await Promise.all([
      this.fetchCheckIns(nightStart, nightEnd, request.propertyId!),
      this.fetchCheckOuts(nightStart, nightEnd, request.propertyId!),
      this.fetchCancellations(nightStart, nightEnd, request.propertyId!),
      this.fetchNoShows(nightStart, nightEnd, request.propertyId!),
      this.fetchInHouseGuests(nightStart, request.propertyId!),
      this.getTotalRooms(request.propertyId!)
    ]);

    // Calculate summary metrics
    const summary = this.calculateSummary(
      checkIns,
      checkOuts,
      cancellations,
      noShows,
      inHouseGuests,
      totalRooms
    );

    // Build activity data array
    const activityData = [
      ...checkIns.map((ci) => ({
        type: "Check-In",
        reservationId: ci.reservationId.substring(0, 8),
        guestName: ci.guestName,
        roomNumber: ci.roomNumber,
        time: ci.checkInTime.toLocaleTimeString(),
        nights: ci.nights,
        amount: `$${ci.totalAmount.toFixed(2)}`,
        paymentStatus: ci.paymentStatus
      })),
      ...checkOuts.map((co) => ({
        type: "Check-Out",
        reservationId: co.reservationId.substring(0, 8),
        guestName: co.guestName,
        roomNumber: co.roomNumber,
        time: co.checkOutTime.toLocaleTimeString(),
        nights: "-",
        amount: `$${co.totalAmount.toFixed(2)}`,
        paymentStatus: co.balanceDue > 0 ? "Balance Due" : "Paid"
      })),
      ...cancellations.map((cancel) => ({
        type: "Cancellation",
        reservationId: cancel.reservationId.substring(0, 8),
        guestName: cancel.guestName,
        roomNumber: cancel.roomType,
        time: cancel.cancelledAt.toLocaleTimeString(),
        nights: "-",
        amount: `$${cancel.refundAmount.toFixed(2)}`,
        paymentStatus: "Refunded"
      })),
      ...noShows.map((ns) => ({
        type: "No-Show",
        reservationId: ns.reservationId.substring(0, 8),
        guestName: ns.guestName,
        roomNumber: ns.roomType,
        time: ns.expectedCheckIn.toLocaleTimeString(),
        nights: "-",
        amount: `$${ns.chargeAmount.toFixed(2)}`,
        paymentStatus: "Charged"
      }))
    ];

    // Add in-house guests to the data
    const inHouseData = inHouseGuests.map((guest) => {
      // Calculate remaining nights from nightStart to checkout
      const remainingNights = Math.ceil(
        (guest.checkOutDate.getTime() - nightStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      return {
        type: "In-House",
        reservationId: guest.reservationId.substring(0, 8),
        guestName: guest.guestName,
        roomNumber: guest.roomNumber,
        time: "-",
        nights: remainingNights,
        amount: "-",
        paymentStatus: "Staying"
      };
    });

    // Check if there's any activity
    const hasActivity = activityData.length > 0 || inHouseData.length > 0;

    // Build summary object
    const summaryObject: Record<string, string | number> = {
      totalRevenue: `$${summary.totalRevenue.toFixed(2)}`,
      roomRevenue: `$${summary.roomRevenue.toFixed(2)}`,
      addonRevenue: `$${summary.addonRevenue.toFixed(2)}`,
      totalBookings: summary.totalBookings,
      checkIns: summary.checkIns,
      checkOuts: summary.checkOuts,
      cancellations: summary.cancellations,
      noShows: summary.noShows,
      inHouseGuests: inHouseGuests.length,
      occupancyRate: `${summary.occupancyRate.toFixed(1)}%`,
      adr: `$${summary.adr.toFixed(2)}`,
      revpar: `$${summary.revpar.toFixed(2)}`
    };

    // Add empty message if no activity
    if (!hasActivity) {
      summaryObject.emptyMessage =
        "No activity during this period. No check-ins, check-outs, cancellations, or in-house guests.";
    }

    // Build report data
    const reportData: ReportData = {
      title: "Night Audit Report",
      subtitle: `${property.name} - ${nightStart.toLocaleDateString()}`,
      generatedAt: new Date(),
      generatedBy: user?.name || user?.email || "System",
      organizationName: organization?.name || "Unknown",
      propertyName: property.name,
      dateRange: {
        start: nightStart,
        end: nightEnd
      },
      data: [...activityData, ...inHouseData],
      summary: summaryObject
    };

    return reportData;
  }

  /**
   * Calculate night start time (6 AM of the previous day)
   * If report is run at 7 PM on Aug 15, it should be 6 AM Aug 14
   * If report is run at 6 AM on Aug 15, it should be 6 AM Aug 14
   */
  private calculateNightStart(reportDate: Date): Date {
    const currentHour = reportDate.getHours();

    // If before 6 AM, go back 2 days, otherwise go back 1 day
    const daysToSubtract = currentHour < 6 ? 2 : 1;

    const nightStart = startOfDay(reportDate);
    nightStart.setDate(nightStart.getDate() - daysToSubtract);
    nightStart.setHours(6, 0, 0, 0);

    return nightStart;
  }

  private async fetchCheckIns(
    start: Date,
    end: Date,
    propertyId: string
  ): Promise<CheckInData[]> {
    const reservations = await prisma.reservation.findMany({
      where: {
        propertyId,
        checkIn: {
          gte: start,
          lt: end
        },
        status: {
          in: ["IN_HOUSE", "CHECKED_OUT"]
        }
      },
      include: {
        room: {
          select: {
            name: true,
            type: true
          }
        },
        payments: true,
        addons: true
      }
    });

    return reservations.map((r) => {
      // Calculate total amount from payments and addons
      const totalPaid = r.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const addonsTotal = r.addons.reduce(
        (sum, a) => sum + (a.totalAmount || 0),
        0
      );
      const totalAmount = totalPaid + addonsTotal;

      return {
        reservationId: r.id,
        guestName: r.guestName || "Unknown",
        roomNumber: r.room?.name || "N/A",
        checkInTime: r.checkIn,
        nights: Math.ceil(
          (r.checkOut.getTime() - r.checkIn.getTime()) / (1000 * 60 * 60 * 24)
        ),
        totalAmount,
        paymentStatus: r.payments.length > 0 ? "Paid" : "Pending"
      };
    });
  }

  private async fetchCheckOuts(
    start: Date,
    end: Date,
    propertyId: string
  ): Promise<CheckOutData[]> {
    const reservations = await prisma.reservation.findMany({
      where: {
        propertyId,
        checkOut: {
          gte: start,
          lt: end
        },
        status: "CHECKED_OUT"
      },
      include: {
        room: {
          select: {
            name: true,
            type: true
          }
        },
        payments: true,
        addons: true
      }
    });

    return reservations.map((r) => {
      const totalPaid = r.payments.reduce(
        (sum: number, p) => sum + (p.amount || 0),
        0
      );
      const addonsTotal = r.addons.reduce(
        (sum: number, a) => sum + (a.totalAmount || 0),
        0
      );
      const totalAmount = totalPaid + addonsTotal;
      const balanceDue = totalAmount - totalPaid;

      return {
        reservationId: r.id,
        guestName: r.guestName || "Unknown",
        roomNumber: r.room?.name || "N/A",
        checkOutTime: r.checkOut,
        totalAmount,
        balanceDue
      };
    });
  }

  private async fetchCancellations(
    start: Date,
    end: Date,
    propertyId: string
  ): Promise<CancellationData[]> {
    const reservations = await prisma.reservation.findMany({
      where: {
        propertyId,
        status: "CANCELLED",
        updatedAt: {
          gte: start,
          lt: end
        }
      },
      include: {
        room: {
          select: {
            name: true,
            type: true
          }
        },
        payments: true
      }
    });

    return reservations.map((r) => {
      const refundAmount = r.payments
        .filter((p) => p.status === "REFUNDED")
        .reduce((sum: number, p) => sum + (p.amount || 0), 0);

      return {
        reservationId: r.id,
        guestName: r.guestName || "Unknown",
        roomType: r.room?.type || "N/A",
        cancelledAt: r.updatedAt,
        reason: r.notes || undefined,
        refundAmount
      };
    });
  }

  private async fetchNoShows(
    start: Date,
    end: Date,
    propertyId: string
  ): Promise<NoShowData[]> {
    const reservations = await prisma.reservation.findMany({
      where: {
        propertyId,
        status: "NO_SHOW",
        checkIn: {
          gte: start,
          lt: end
        }
      },
      include: {
        room: {
          select: {
            name: true,
            type: true
          }
        },
        payments: true,
        addons: true
      }
    });

    return reservations.map((r) => {
      const totalPaid = r.payments.reduce(
        (sum: number, p) => sum + (p.amount || 0),
        0
      );
      const addonsTotal = r.addons.reduce(
        (sum: number, a) => sum + (a.totalAmount || 0),
        0
      );
      const chargeAmount = totalPaid + addonsTotal;

      return {
        reservationId: r.id,
        guestName: r.guestName || "Unknown",
        roomType: r.room?.type || "N/A",
        expectedCheckIn: r.checkIn,
        chargeAmount
      };
    });
  }

  private async fetchInHouseGuests(
    nightStart: Date,
    propertyId: string
  ): Promise<InHouseGuestData[]> {
    const reservations = await prisma.reservation.findMany({
      where: {
        propertyId,
        status: "IN_HOUSE",
        checkIn: {
          lte: nightStart
        },
        checkOut: {
          gt: nightStart
        }
      },
      include: {
        room: {
          select: {
            name: true,
            type: true
          }
        }
      }
    });

    return reservations.map((r) => ({
      reservationId: r.id,
      guestName: r.guestName || "Unknown",
      roomNumber: r.room?.name || "N/A",
      checkInDate: r.checkIn,
      checkOutDate: r.checkOut,
      nights: Math.ceil(
        (r.checkOut.getTime() - r.checkIn.getTime()) / (1000 * 60 * 60 * 24)
      )
    }));
  }

  private async getTotalRooms(propertyId: string): Promise<number> {
    return await prisma.room.count({
      where: { propertyId }
    });
  }

  private calculateSummary(
    checkIns: CheckInData[],
    checkOuts: CheckOutData[],
    cancellations: CancellationData[],
    noShows: NoShowData[],
    inHouseGuests: InHouseGuestData[],
    totalRooms: number
  ): SummaryData {
    const totalRevenue = checkIns.reduce((sum, ci) => sum + ci.totalAmount, 0);
    const roomRevenue = totalRevenue * 0.85; // Estimate
    const addonRevenue = totalRevenue * 0.15; // Estimate

    const occupiedRooms = inHouseGuests.length + checkIns.length;
    const occupancyRate =
      totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
    const adr = occupiedRooms > 0 ? totalRevenue / occupiedRooms : 0;
    const revpar = totalRooms > 0 ? totalRevenue / totalRooms : 0;

    return {
      totalRevenue,
      roomRevenue,
      addonRevenue,
      taxRevenue: 0,
      totalBookings:
        checkIns.length +
        checkOuts.length +
        cancellations.length +
        noShows.length,
      checkIns: checkIns.length,
      checkOuts: checkOuts.length,
      cancellations: cancellations.length,
      noShows: noShows.length,
      occupancyRate,
      adr,
      revpar
    };
  }
}
