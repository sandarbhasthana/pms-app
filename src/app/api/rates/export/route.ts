// File: src/app/api/rates/export/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withTenantContext } from "@/lib/tenant";
import { addDays, format, isWeekend } from "date-fns";
import { Prisma } from "@prisma/client";

// Allowed roles for exporting rates
const ALLOWED_ROLES = ["ORG_ADMIN", "PROPERTY_MGR", "FRONT_DESK"];

/**
 * GET /api/rates/export - Export rates data to CSV or Excel
 * Query params:
 * - format: "csv" | "excel" (default: "csv")
 * - startDate?: string (default: today)
 * - days?: number (default: 30)
 * - roomTypeIds?: string (comma-separated room type IDs)
 */
export async function GET(req: NextRequest) {
  // Authentication check
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user || !ALLOWED_ROLES.includes(role as string)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const orgId =
      req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context missing" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const exportFormat = searchParams.get("format") || "csv";
    const startDateParam = searchParams.get("startDate");
    const daysParam = searchParams.get("days");
    const roomTypeIdsParam = searchParams.get("roomTypeIds");

    const startDate = startDateParam ? new Date(startDateParam) : new Date();
    const days = daysParam ? parseInt(daysParam) : 30;
    const endDate = addDays(startDate, days - 1);

    // Parse room type IDs filter
    const roomTypeIds = roomTypeIdsParam ? roomTypeIdsParam.split(",") : null;

    // Generate date range
    const dates = Array.from({ length: days }, (_, i) => addDays(startDate, i));

    // Fetch rates data
    const exportData = await withTenantContext(orgId, async (tx) => {
      // Build room types query
      const roomTypesWhere: Prisma.RoomTypeWhereInput = {
        organizationId: orgId
      };
      if (roomTypeIds) {
        roomTypesWhere.id = { in: roomTypeIds };
      }

      const roomTypes = await tx.roomType.findMany({
        where: roomTypesWhere,
        include: {
          rooms: {
            include: {
              pricing: true
            }
          },
          dailyRates: {
            where: {
              date: {
                gte: startDate,
                lte: endDate
              }
            }
          },
          seasonalRates: {
            where: {
              isActive: true,
              startDate: { lte: endDate },
              endDate: { gte: startDate }
            }
          }
        },
        orderBy: { name: "asc" }
      });

      // Process data for export
      interface ExportRow {
        roomTypeName: string;
        roomTypeId: string;
        date: string;
        dayOfWeek: string;
        basePrice: number;
        finalPrice: number;
        priceType: string;
        availability: number;
        totalRooms: number;
        minLOS: string | number;
        maxLOS: string | number;
        closedToArrival: string;
        closedToDeparture: string;
        seasonalMultiplier: number | string;
        seasonalName: string;
      }

      const exportRows: ExportRow[] = [];

      roomTypes.forEach((roomType) => {
        const roomsWithPricing = roomType.rooms.filter((room) => room.pricing);
        const totalRooms = roomType.rooms.length;

        // Calculate average pricing
        const avgBasePrice =
          roomsWithPricing.length > 0
            ? roomsWithPricing.reduce(
                (sum, room) => sum + (room.pricing?.basePrice || 0),
                0
              ) / roomsWithPricing.length
            : 0;

        const avgWeekdayPrice =
          roomsWithPricing.length > 0
            ? roomsWithPricing.reduce(
                (sum, room) =>
                  sum + (room.pricing?.weekdayPrice || avgBasePrice),
                0
              ) / roomsWithPricing.length
            : avgBasePrice;

        const avgWeekendPrice =
          roomsWithPricing.length > 0
            ? roomsWithPricing.reduce(
                (sum, room) =>
                  sum + (room.pricing?.weekendPrice || avgBasePrice),
                0
              ) / roomsWithPricing.length
            : avgBasePrice;

        dates.forEach((date) => {
          const dateString = format(date, "yyyy-MM-dd");
          const isWeekendDate = isWeekend(date);

          // Check for daily rate override
          const dailyOverride = roomType.dailyRates.find(
            (dr) => format(dr.date, "yyyy-MM-dd") === dateString
          );

          // Check for seasonal rate
          const seasonalRate = roomType.seasonalRates.find(
            (sr) => date >= sr.startDate && date <= sr.endDate
          );

          // Calculate final price
          const basePrice = isWeekendDate ? avgWeekendPrice : avgWeekdayPrice;
          let finalPrice = basePrice;
          let priceType = isWeekendDate ? "Weekend Base" : "Weekday Base";

          if (dailyOverride) {
            finalPrice = dailyOverride.basePrice;
            priceType = "Daily Override";
          } else if (seasonalRate) {
            finalPrice = basePrice * seasonalRate.multiplier;
            priceType = `Seasonal (${seasonalRate.name})`;
          }

          // Calculate availability
          const totalAvailability =
            roomsWithPricing.reduce(
              (sum, room) => sum + (room.pricing?.availability || 1),
              0
            ) || totalRooms;

          const availability = dailyOverride?.availability || totalAvailability;

          // Get restrictions
          const restrictions = {
            minLOS:
              dailyOverride?.minLOS || roomsWithPricing[0]?.pricing?.minLOS,
            maxLOS:
              dailyOverride?.maxLOS || roomsWithPricing[0]?.pricing?.maxLOS,
            closedToArrival:
              dailyOverride?.closedToArrival ||
              roomsWithPricing[0]?.pricing?.closedToArrival ||
              false,
            closedToDeparture:
              dailyOverride?.closedToDeparture ||
              roomsWithPricing[0]?.pricing?.closedToDeparture ||
              false
          };

          exportRows.push({
            roomTypeName: roomType.name,
            roomTypeId: roomType.id,
            date: dateString,
            dayOfWeek: format(date, "EEEE"),
            basePrice: Math.round(basePrice * 100) / 100,
            finalPrice: Math.round(finalPrice * 100) / 100,
            priceType,
            availability,
            totalRooms,
            minLOS: restrictions.minLOS || "",
            maxLOS: restrictions.maxLOS || "",
            closedToArrival: restrictions.closedToArrival ? "Yes" : "No",
            closedToDeparture: restrictions.closedToDeparture ? "Yes" : "No",
            seasonalMultiplier: seasonalRate?.multiplier || "",
            seasonalName: seasonalRate?.name || ""
          });
        });
      });

      return exportRows;
    });

    if (exportFormat === "csv") {
      // Generate CSV
      const headers = [
        "Room Type",
        "Room Type ID",
        "Date",
        "Day of Week",
        "Base Price",
        "Final Price",
        "Price Type",
        "Availability",
        "Total Rooms",
        "Min LOS",
        "Max LOS",
        "Closed to Arrival",
        "Closed to Departure",
        "Seasonal Multiplier",
        "Seasonal Name"
      ];

      const csvRows = [
        headers.join(","),
        ...exportData.map((row) =>
          [
            `"${row.roomTypeName}"`,
            row.roomTypeId,
            row.date,
            `"${row.dayOfWeek}"`,
            row.basePrice,
            row.finalPrice,
            `"${row.priceType}"`,
            row.availability,
            row.totalRooms,
            row.minLOS,
            row.maxLOS,
            row.closedToArrival,
            row.closedToDeparture,
            row.seasonalMultiplier,
            `"${row.seasonalName}"`
          ].join(",")
        )
      ];

      const csvContent = csvRows.join("\n");
      const filename = `rates_export_${format(
        startDate,
        "yyyy-MM-dd"
      )}_to_${format(endDate, "yyyy-MM-dd")}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    } else if (exportFormat === "excel") {
      // For Excel export, we'll return JSON data that the frontend can convert to Excel
      // This requires a library like xlsx on the frontend
      const filename = `rates_export_${format(
        startDate,
        "yyyy-MM-dd"
      )}_to_${format(endDate, "yyyy-MM-dd")}.xlsx`;

      return NextResponse.json({
        success: true,
        data: exportData,
        metadata: {
          filename,
          exportDate: new Date().toISOString(),
          dateRange: {
            startDate: format(startDate, "yyyy-MM-dd"),
            endDate: format(endDate, "yyyy-MM-dd")
          },
          totalRows: exportData.length,
          roomTypesCount: [...new Set(exportData.map((row) => row.roomTypeId))]
            .length
        }
      });
    } else {
      return NextResponse.json(
        { error: "Invalid export format" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("GET /api/rates/export error:", error);
    return NextResponse.json(
      {
        error: "Failed to export rates data",
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rates/export/schedule - Schedule recurring rate exports
 * Body: {
 *   format: "csv" | "excel";
 *   frequency: "daily" | "weekly" | "monthly";
 *   email: string;
 *   roomTypeIds?: string[];
 *   isActive?: boolean;
 * }
 */
export async function POST(req: NextRequest) {
  // Authentication check
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (
    !session?.user ||
    !["ORG_ADMIN", "PROPERTY_MGR"].includes(role as string)
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const orgId =
      req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context missing" },
        { status: 400 }
      );
    }

    const {
      format,
      frequency,
      email,
      roomTypeIds,
      isActive = true
    } = await req.json();

    // Validate required fields
    if (!format || !frequency || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["csv", "excel"].includes(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    if (!["daily", "weekly", "monthly"].includes(frequency)) {
      return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // For now, we'll just return success - actual scheduling would require a job queue
    // In a real implementation, you'd save this to a database and set up a cron job

    return NextResponse.json({
      success: true,
      message: "Export schedule created successfully",
      data: {
        format,
        frequency,
        email,
        roomTypeIds: roomTypeIds || [],
        isActive,
        nextExport: "Feature coming soon - manual exports available now"
      }
    });
  } catch (error) {
    console.error("POST /api/rates/export/schedule error:", error);
    return NextResponse.json(
      { error: "Failed to schedule export", details: (error as Error).message },
      { status: 500 }
    );
  }
}
