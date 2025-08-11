// File: src/app/api/rates/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  validatePropertyAccess,
  withPropertyContext
} from "@/lib/property-context";
import { addDays, format, isWeekend } from "date-fns";
import { PropertyRole } from "@prisma/client";

// Type definitions for API responses
interface RateData {
  roomTypeId: string;
  roomTypeName: string;
  totalRooms: number;
  dates: {
    [dateString: string]: {
      basePrice: number;
      finalPrice: number;
      availability: number;
      isOverride: boolean;
      isSeasonal: boolean;
      restrictions: {
        minLOS?: number;
        maxLOS?: number;
        closedToArrival: boolean;
        closedToDeparture: boolean;
      };
    };
  };
}

interface RatesResponse {
  success: boolean;
  data: RateData[];
  dateRange: {
    startDate: string;
    endDate: string;
    dates: string[];
  };
}

/**
 * GET /api/rates - Fetch rates matrix data
 * Query params:
 * - startDate: ISO date string (default: today)
 * - days: number of days to fetch (default: 7)
 * - ratePlan: "base" | "promo" (default: "base")
 */
export async function GET(req: NextRequest) {
  try {
    // Validate property access
    const validation = await validatePropertyAccess(req);
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const daysParam = searchParams.get("days");
    const ratePlan = searchParams.get("ratePlan") || "base";

    // TODO: Implement ratePlan support for "base" | "promo" rate plans
    // Currently only "base" rates are returned regardless of ratePlan value
    void ratePlan; // Suppress unused variable warning

    const startDate = startDateParam ? new Date(startDateParam) : new Date();
    const days = daysParam ? parseInt(daysParam) : 7;
    const endDate = addDays(startDate, days - 1);

    // Generate date range
    const dates = Array.from({ length: days }, (_, i) => addDays(startDate, i));
    const dateStrings = dates.map((d) => format(d, "yyyy-MM-dd"));

    // Fetch data within property context
    const ratesData = await withPropertyContext(propertyId!, async (tx) => {
      // 1. Get all room types with their rooms and base pricing
      const roomTypes = await tx.roomType.findMany({
        where: { propertyId: propertyId },
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

      // 2. Process each room type
      const processedData: RateData[] = roomTypes.map((roomType) => {
        const roomsWithPricing = roomType.rooms.filter((room) => room.pricing);
        const totalRooms = roomType.rooms.length;

        // Calculate average base pricing for the room type
        // Used for rate plan switching, dynamic pricing, and analytics
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const avgBasePrice =
          roomsWithPricing.length > 0
            ? roomsWithPricing.reduce(
                (sum, room) => sum + (room.pricing?.basePrice || 0),
                0
              ) / roomsWithPricing.length
            : 0;

        // Get pricing from room type (new hierarchy) or fallback to individual room pricing
        const roomTypeWeekdayPrice =
          roomType.weekdayPrice ?? roomType.basePrice ?? 0;
        const roomTypeWeekendPrice =
          roomType.weekendPrice ?? roomType.basePrice ?? 0;

        // Use room type pricing if available, otherwise fallback to individual room pricing
        const avgWeekdayPrice =
          roomTypeWeekdayPrice > 0
            ? roomTypeWeekdayPrice
            : roomsWithPricing.length > 0
            ? roomsWithPricing.reduce(
                (sum, room) =>
                  sum +
                  (room.pricing?.weekdayPrice || room.pricing?.basePrice || 0),
                0
              ) / roomsWithPricing.length
            : 0;

        const avgWeekendPrice =
          roomTypeWeekendPrice > 0
            ? roomTypeWeekendPrice
            : roomsWithPricing.length > 0
            ? roomsWithPricing.reduce(
                (sum, room) =>
                  sum +
                  (room.pricing?.weekendPrice || room.pricing?.basePrice || 0),
                0
              ) / roomsWithPricing.length
            : 0;

        // Process each date
        const dateData: RateData["dates"] = {};

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
          let isOverride = false;
          let isSeasonal = false;

          if (dailyOverride) {
            finalPrice = dailyOverride.basePrice;
            isOverride = true;
          } else if (seasonalRate) {
            finalPrice = basePrice * seasonalRate.multiplier;
            isSeasonal = true;
          }

          // Calculate availability (sum of all rooms' availability or default to total rooms)
          const totalAvailability =
            roomsWithPricing.reduce(
              (sum, room) => sum + (room.pricing?.availability || 1),
              0
            ) || totalRooms;

          // Get restrictions (use daily override if available, otherwise use base pricing)
          const restrictions = {
            minLOS:
              dailyOverride?.minLOS ||
              roomsWithPricing[0]?.pricing?.minLOS ||
              undefined,
            maxLOS:
              dailyOverride?.maxLOS ||
              roomsWithPricing[0]?.pricing?.maxLOS ||
              undefined,
            closedToArrival:
              dailyOverride?.closedToArrival ||
              roomsWithPricing[0]?.pricing?.closedToArrival ||
              false,
            closedToDeparture:
              dailyOverride?.closedToDeparture ||
              roomsWithPricing[0]?.pricing?.closedToDeparture ||
              false
          };

          dateData[dateString] = {
            basePrice: Math.round(basePrice * 100) / 100,
            finalPrice: Math.round(finalPrice * 100) / 100,
            availability: dailyOverride?.availability || totalAvailability,
            isOverride,
            isSeasonal,
            restrictions
          };
        });

        return {
          roomTypeId: roomType.id,
          roomTypeName: roomType.name,
          totalRooms,
          dates: dateData
        };
      });

      return processedData;
    });

    const response: RatesResponse = {
      success: true,
      data: ratesData,
      dateRange: {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        dates: dateStrings
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/rates error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch rates data",
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rates - Bulk update rates
 * Body: {
 *   updates: Array<{
 *     roomTypeId: string;
 *     date: string;
 *     price: number;
 *     availability?: number;
 *     restrictions?: object;
 *   }>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Validate property access with required role
    const validation = await validatePropertyAccess(
      req,
      PropertyRole.PROPERTY_MGR
    );
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId, userId } = validation;

    const { updates } = await req.json();
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "Invalid updates array" },
        { status: 400 }
      );
    }

    // Process bulk updates within property context
    const results = await withPropertyContext(propertyId!, async (tx) => {
      const updatePromises = updates.map(async (update) => {
        const { roomTypeId, date, price, availability, restrictions } = update;

        // Validate required fields
        if (!roomTypeId || !date || typeof price !== "number") {
          throw new Error(`Invalid update data: ${JSON.stringify(update)}`);
        }

        const updateDate = new Date(date);

        // Upsert daily rate
        const dailyRate = await tx.dailyRate.upsert({
          where: {
            roomTypeId_date: {
              roomTypeId,
              date: updateDate
            }
          },
          update: {
            basePrice: price,
            availability: availability || undefined,
            minLOS: restrictions?.minLOS || undefined,
            maxLOS: restrictions?.maxLOS || undefined,
            closedToArrival: restrictions?.closedToArrival || false,
            closedToDeparture: restrictions?.closedToDeparture || false,
            updatedAt: new Date()
          },
          create: {
            roomTypeId,
            date: updateDate,
            basePrice: price,
            availability: availability || undefined,
            minLOS: restrictions?.minLOS || undefined,
            maxLOS: restrictions?.maxLOS || undefined,
            closedToArrival: restrictions?.closedToArrival || false,
            closedToDeparture: restrictions?.closedToDeparture || false
          }
        });

        // Create rate change log
        if (userId) {
          await tx.rateChangeLog.create({
            data: {
              roomTypeId,
              date: updateDate,
              newPrice: price,
              changeType: "DAILY_RATE",
              reason: "Bulk update via rates matrix",
              userId
            }
          });
        }

        return dailyRate;
      });

      return await Promise.all(updatePromises);
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${results.length} rates`,
      updatedCount: results.length
    });
  } catch (error) {
    console.error("POST /api/rates error:", error);
    return NextResponse.json(
      { error: "Failed to update rates", details: (error as Error).message },
      { status: 500 }
    );
  }
}
