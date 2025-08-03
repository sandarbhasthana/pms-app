// File: src/app/api/rates/[roomTypeId]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withTenantContext } from "@/lib/tenant";
import { format } from "date-fns";

// Allowed roles for modifying rates
const ALLOWED_ROLES = ["ORG_ADMIN", "PROPERTY_MGR"];

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
  { params }: { params: { roomTypeId: string } }
) {
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

    const { roomTypeId } = params;
    const {
      date,
      price,
      availability,
      restrictions,
      ratePlan = "base"
    } = await req.json();

    // Validate required fields
    if (typeof price !== "number" || price < 0) {
      return NextResponse.json(
        { error: "Valid price is required" },
        { status: 400 }
      );
    }

    const result = await withTenantContext(orgId, async (tx) => {
      // Verify room type exists and belongs to organization
      const roomType = await tx.roomType.findFirst({
        where: {
          id: roomTypeId,
          organizationId: orgId
        }
      });

      if (!roomType) {
        throw new Error("Room type not found");
      }

      let updateResult;
      let changeType: string;
      let oldPrice: number | null = null;

      if (date) {
        // Update daily rate (date-specific override)
        const updateDate = new Date(date);

        // Get existing daily rate for old price logging
        const existingDailyRate = await tx.dailyRate.findUnique({
          where: {
            roomTypeId_date: {
              roomTypeId,
              date: updateDate
            }
          }
        });

        oldPrice = existingDailyRate?.basePrice || null;

        updateResult = await tx.dailyRate.upsert({
          where: {
            roomTypeId_date: {
              roomTypeId,
              date: updateDate
            }
          },
          update: {
            basePrice: price,
            availability: availability !== undefined ? availability : undefined,
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

        changeType = "DAILY_RATE";
      } else {
        // Update base rates for all rooms of this type
        const rooms = await tx.room.findMany({
          where: {
            roomTypeId,
            organizationId: orgId
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

      // Log the rate change
      await tx.rateChangeLog.create({
        data: {
          roomTypeId,
          date: date ? new Date(date) : null,
          oldPrice,
          newPrice: price,
          changeType,
          reason: `Updated via rates matrix - ${ratePlan} rate`,
          userId: session.user.email || "unknown"
        }
      });

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
    console.error(`PATCH /api/rates/${params.roomTypeId} error:`, error);
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
  { params }: { params: { roomTypeId: string } }
) {
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
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    const { roomTypeId } = params;
    const deleteDate = new Date(date);

    const result = await withTenantContext(orgId, async (tx) => {
      // Verify room type exists
      const roomType = await tx.roomType.findFirst({
        where: {
          id: roomTypeId,
          organizationId: orgId
        }
      });

      if (!roomType) {
        throw new Error("Room type not found");
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

      // Log the rate change
      await tx.rateChangeLog.create({
        data: {
          roomTypeId,
          date: deleteDate,
          oldPrice: existingDailyRate.basePrice,
          newPrice: 0, // Indicates deletion/reset to base rate
          changeType: "DAILY_RATE_DELETED",
          reason: "Removed daily rate override via rates matrix",
          userId: session.user.email || "unknown"
        }
      });

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
    console.error(`DELETE /api/rates/${params.roomTypeId} error:`, error);
    return NextResponse.json(
      {
        error: "Failed to delete daily rate",
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
