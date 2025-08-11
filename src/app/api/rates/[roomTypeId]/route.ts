// File: src/app/api/rates/[roomTypeId]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import { PropertyRole } from "@prisma/client";
import { format } from "date-fns";

/**
 * PATCH /api/rates/[roomTypeId] - Update specific room type rates
 * Body: {
 *   date?: string;           // If provided, updates daily rate; otherwise updates base rate
 *   price: number;
 *   availability?: number;
 *   restrictions?: {
 *     minLOS?: number;
 *     maxLOS?: number;
 *     closedToArrival?: boolean;
 *     closedToDeparture?: boolean;
 *   };
 *   ratePlan?: "base" | "weekday" | "weekend";
 * }
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ roomTypeId: string }> }
) {
  const { roomTypeId } = await context.params;

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
    const requestBody = await req.json();
    const {
      date,
      price,
      availability,
      restrictions,
      ratePlan = "base"
    } = requestBody;

    console.log("PATCH /api/rates/[roomTypeId] - Request data:", {
      roomTypeId,
      propertyId,
      requestBody
    });

    // Validate required fields
    if (typeof price !== "number" || price < 0) {
      console.error("PATCH /api/rates/[roomTypeId] - Invalid price:", price);
      return NextResponse.json(
        { error: "Valid price is required" },
        { status: 400 }
      );
    }

    const result = await withPropertyContext(propertyId!, async (tx) => {
      console.log("PATCH /api/rates/[roomTypeId] - Looking for room type:", {
        roomTypeId,
        propertyId
      });

      // Verify room type exists and belongs to property
      const roomType = await tx.roomType.findFirst({
        where: {
          id: roomTypeId,
          propertyId: propertyId
        }
      });

      console.log(
        "PATCH /api/rates/[roomTypeId] - Room type found:",
        !!roomType
      );

      if (!roomType) {
        throw new Error(
          "Room type not found or doesn't belong to this property"
        );
      }

      let updateResult;
      let changeType: string;
      let oldPrice: number | null = null;

      if (date) {
        // Update daily rate (date-specific override)
        const updateDate = new Date(date);
        console.log(
          "PATCH /api/rates/[roomTypeId] - Updating daily rate for date:",
          {
            date,
            updateDate: updateDate.toISOString(),
            price,
            availability
          }
        );

        // Get existing daily rate for old price logging
        const existingDailyRate = await tx.dailyRate.findFirst({
          where: {
            roomTypeId,
            date: updateDate
          }
        });

        console.log(
          "PATCH /api/rates/[roomTypeId] - Existing daily rate:",
          existingDailyRate
        );
        oldPrice = existingDailyRate?.basePrice || null;

        try {
          if (existingDailyRate) {
            // Update existing rate
            updateResult = await tx.dailyRate.update({
              where: {
                id: existingDailyRate.id
              },
              data: {
                basePrice: price,
                availability:
                  availability !== undefined ? availability : undefined,
                minLOS:
                  restrictions?.minLOS !== undefined
                    ? restrictions.minLOS
                    : undefined,
                maxLOS:
                  restrictions?.maxLOS !== undefined
                    ? restrictions.maxLOS
                    : undefined,
                closedToArrival:
                  restrictions?.closedToArrival !== undefined
                    ? restrictions.closedToArrival
                    : undefined,
                closedToDeparture:
                  restrictions?.closedToDeparture !== undefined
                    ? restrictions.closedToDeparture
                    : undefined,
                updatedAt: new Date()
              }
            });
          } else {
            // Create new rate
            updateResult = await tx.dailyRate.create({
              data: {
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
          }

          console.log(
            "PATCH /api/rates/[roomTypeId] - Daily rate operation successful:",
            updateResult
          );
        } catch (dbError) {
          console.error(
            "PATCH /api/rates/[roomTypeId] - Database operation failed:",
            dbError
          );
          throw dbError;
        }

        changeType = "DAILY_RATE";
      } else {
        // Update base rates for all rooms of this type
        const rooms = await tx.room.findMany({
          where: {
            roomTypeId,
            propertyId: propertyId
          },
          include: {
            pricing: true
          }
        });

        if (rooms.length === 0) {
          throw new Error("No rooms found for this room type");
        }

        // Update pricing for each room
        const updatePromises = rooms.map(async (room) => {
          // Get old price for logging
          if (oldPrice === null && room.pricing) {
            oldPrice =
              ratePlan === "weekday"
                ? room.pricing.weekdayPrice || room.pricing.basePrice
                : ratePlan === "weekend"
                ? room.pricing.weekendPrice || room.pricing.basePrice
                : room.pricing.basePrice;
          }

          if (room.pricing) {
            // Update existing pricing
            const updateData: Partial<{
              updatedAt: Date;
              basePrice: number;
              weekdayPrice: number;
              weekendPrice: number;
              availability: number;
              minLOS: number;
              maxLOS: number;
              closedToArrival: boolean;
              closedToDeparture: boolean;
            }> = { updatedAt: new Date() };

            if (ratePlan === "weekday") {
              updateData.weekdayPrice = price;
            } else if (ratePlan === "weekend") {
              updateData.weekendPrice = price;
            } else {
              updateData.basePrice = price;
            }

            if (availability !== undefined)
              updateData.availability = availability;
            if (restrictions?.minLOS !== undefined)
              updateData.minLOS = restrictions.minLOS;
            if (restrictions?.maxLOS !== undefined)
              updateData.maxLOS = restrictions.maxLOS;
            if (restrictions?.closedToArrival !== undefined)
              updateData.closedToArrival = restrictions.closedToArrival;
            if (restrictions?.closedToDeparture !== undefined)
              updateData.closedToDeparture = restrictions.closedToDeparture;

            return await tx.roomPricing.update({
              where: { id: room.pricing.id },
              data: updateData
            });
          } else {
            // Create new pricing
            const createData: {
              roomId: string;
              basePrice: number;
              weekdayPrice?: number;
              weekendPrice?: number;
              availability?: number;
              minLOS?: number;
              maxLOS?: number;
              closedToArrival: boolean;
              closedToDeparture: boolean;
            } = {
              roomId: room.id,
              basePrice: ratePlan === "base" ? price : 0,
              weekdayPrice: ratePlan === "weekday" ? price : undefined,
              weekendPrice: ratePlan === "weekend" ? price : undefined,
              availability: availability || undefined,
              minLOS: restrictions?.minLOS || undefined,
              maxLOS: restrictions?.maxLOS || undefined,
              closedToArrival: restrictions?.closedToArrival || false,
              closedToDeparture: restrictions?.closedToDeparture || false
            };

            return await tx.roomPricing.create({
              data: createData
            });
          }
        });

        updateResult = await Promise.all(updatePromises);
        changeType = "BASE_RATE";
      }

      // Log the rate change (only if we have a valid user ID)
      if (userId) {
        await tx.rateChangeLog.create({
          data: {
            roomTypeId,
            date: date ? new Date(date) : null,
            oldPrice,
            newPrice: price,
            changeType,
            reason: `Updated via rates matrix - ${ratePlan} rate`,
            userId: userId
          }
        });
      } else {
        console.warn(
          "PATCH /api/rates/[roomTypeId] - No valid user ID for rate change log"
        );
      }

      return {
        roomTypeId,
        date,
        price,
        ratePlan,
        changeType,
        updatedCount: Array.isArray(updateResult) ? updateResult.length : 1
      };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${result.changeType
        .toLowerCase()
        .replace("_", " ")}`,
      data: result
    });
  } catch (error) {
    console.error(`PATCH /api/rates/${roomTypeId} error:`, error);
    return NextResponse.json(
      { error: "Failed to update rate", details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rates/[roomTypeId] - Delete daily rate override
 * Query params:
 * - date: ISO date string (required)
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ roomTypeId: string }> }
) {
  const { roomTypeId } = await context.params;

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
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }
    const deleteDate = new Date(date);

    const result = await withPropertyContext(propertyId!, async (tx) => {
      // Verify room type exists and belongs to property
      const roomType = await tx.roomType.findFirst({
        where: {
          id: roomTypeId,
          propertyId: propertyId
        }
      });

      if (!roomType) {
        throw new Error(
          "Room type not found or doesn't belong to this property"
        );
      }

      // Get existing daily rate for logging
      const existingDailyRate = await tx.dailyRate.findUnique({
        where: {
          roomTypeId_date: {
            roomTypeId,
            date: deleteDate
          }
        }
      });

      if (!existingDailyRate) {
        throw new Error("Daily rate override not found");
      }

      // Delete the daily rate override
      await tx.dailyRate.delete({
        where: {
          roomTypeId_date: {
            roomTypeId,
            date: deleteDate
          }
        }
      });

      // Log the rate change (only if we have a valid user ID)
      if (userId) {
        await tx.rateChangeLog.create({
          data: {
            roomTypeId,
            date: deleteDate,
            oldPrice: existingDailyRate.basePrice,
            newPrice: 0, // Indicates deletion/reset to base rate
            changeType: "DAILY_RATE_DELETED",
            reason: "Removed daily rate override via rates matrix",
            userId: userId
          }
        });
      } else {
        console.warn(
          "DELETE /api/rates/[roomTypeId] - No valid user ID for rate change log"
        );
      }

      return {
        roomTypeId,
        date: format(deleteDate, "yyyy-MM-dd"),
        deletedPrice: existingDailyRate.basePrice
      };
    });

    return NextResponse.json({
      success: true,
      message: "Daily rate override removed successfully",
      data: result
    });
  } catch (error) {
    console.error(`DELETE /api/rates/${roomTypeId} error:`, error);
    return NextResponse.json(
      {
        error: "Failed to delete daily rate",
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
