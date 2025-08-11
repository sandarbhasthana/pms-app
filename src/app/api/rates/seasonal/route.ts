// File: src/app/api/rates/seasonal/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import { PropertyRole } from "@prisma/client";

/**
 * GET /api/rates/seasonal - Fetch all seasonal rates
 * Query params:
 * - roomTypeId?: string (optional filter by room type)
 * - active?: boolean (default: true)
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

    const { searchParams } = new URL(req.url);
    const roomTypeId = searchParams.get("roomTypeId");
    const activeParam = searchParams.get("active");
    const isActive = activeParam !== null ? activeParam === "true" : true;

    const seasonalRates = await withPropertyContext(propertyId!, async (tx) => {
      const whereClause: {
        isActive: boolean;
        roomTypeId?: string | null;
        roomType?: { propertyId: string } | null;
      } = {
        isActive
      };

      if (roomTypeId) {
        whereClause.roomTypeId = roomTypeId;
        // Ensure the room type belongs to this property
        whereClause.roomType = { propertyId: propertyId! };
      } else {
        // For property-wide rates, roomTypeId should be null
        whereClause.roomTypeId = null;
      }

      return await tx.seasonalRate.findMany({
        where: whereClause,
        include: {
          roomType: {
            select: {
              id: true,
              name: true,
              propertyId: true
            }
          }
        },
        orderBy: [{ startDate: "asc" }, { name: "asc" }]
      });
    });

    return NextResponse.json({
      success: true,
      data: seasonalRates,
      count: seasonalRates.length
    });
  } catch (error) {
    console.error("GET /api/rates/seasonal error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch seasonal rates",
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rates/seasonal - Create new seasonal rate
 * Body: {
 *   name: string;
 *   startDate: string;
 *   endDate: string;
 *   multiplier: number;
 *   roomTypeId?: string; // null for property-wide
 *   isActive?: boolean;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Validate property access (PROPERTY_MGR and above can create seasonal rates)
    const validation = await validatePropertyAccess(
      req,
      PropertyRole.PROPERTY_MGR
    );
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    const {
      name,
      startDate,
      endDate,
      multiplier,
      roomTypeId,
      isActive = true
    } = await req.json();

    // Validate required fields
    if (!name || !startDate || !endDate || typeof multiplier !== "number") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (multiplier <= 0) {
      return NextResponse.json(
        { error: "Multiplier must be greater than 0" },
        { status: 400 }
      );
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (startDateObj >= endDateObj) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    const seasonalRate = await withPropertyContext(propertyId!, async (tx) => {
      // Verify room type exists if provided
      if (roomTypeId) {
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
      }

      // Check for overlapping seasonal rates
      const overlapping = await tx.seasonalRate.findFirst({
        where: {
          roomTypeId: roomTypeId || null,
          isActive: true,
          OR: [
            {
              startDate: { lte: startDateObj },
              endDate: { gte: startDateObj }
            },
            {
              startDate: { lte: endDateObj },
              endDate: { gte: endDateObj }
            },
            {
              startDate: { gte: startDateObj },
              endDate: { lte: endDateObj }
            }
          ]
        }
      });

      if (overlapping) {
        throw new Error(`Overlapping seasonal rate found: ${overlapping.name}`);
      }

      // Create the seasonal rate
      return await tx.seasonalRate.create({
        data: {
          name,
          startDate: startDateObj,
          endDate: endDateObj,
          multiplier,
          roomTypeId: roomTypeId || null,
          isActive
        },
        include: {
          roomType: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: "Seasonal rate created successfully",
      data: seasonalRate
    });
  } catch (error) {
    console.error("POST /api/rates/seasonal error:", error);
    return NextResponse.json(
      {
        error: "Failed to create seasonal rate",
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rates/seasonal - Update seasonal rate
 * Body: {
 *   id: string;
 *   name?: string;
 *   startDate?: string;
 *   endDate?: string;
 *   multiplier?: number;
 *   isActive?: boolean;
 * }
 */
export async function PUT(req: NextRequest) {
  try {
    // Validate property access (PROPERTY_MGR and above can update seasonal rates)
    const validation = await validatePropertyAccess(
      req,
      PropertyRole.PROPERTY_MGR
    );
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    const { id, name, startDate, endDate, multiplier, isActive } =
      await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Seasonal rate ID is required" },
        { status: 400 }
      );
    }

    if (multiplier !== undefined && multiplier <= 0) {
      return NextResponse.json(
        { error: "Multiplier must be greater than 0" },
        { status: 400 }
      );
    }

    const updatedSeasonalRate = await withPropertyContext(
      propertyId!,
      async (tx) => {
        // Verify seasonal rate exists
        const existingRate = await tx.seasonalRate.findUnique({
          where: { id },
          include: {
            roomType: {
              select: {
                propertyId: true
              }
            }
          }
        });

        if (!existingRate) {
          throw new Error("Seasonal rate not found");
        }

        // Verify ownership (either property-wide or belongs to this property)
        if (
          existingRate.roomType &&
          existingRate.roomType.propertyId !== propertyId
        ) {
          throw new Error("Unauthorized access to seasonal rate");
        }

        // Prepare update data
        const updateData: {
          updatedAt: Date;
          name?: string;
          startDate?: Date;
          endDate?: Date;
          multiplier?: number;
          isActive?: boolean;
        } = { updatedAt: new Date() };
        if (name !== undefined) updateData.name = name;
        if (startDate !== undefined) updateData.startDate = new Date(startDate);
        if (endDate !== undefined) updateData.endDate = new Date(endDate);
        if (multiplier !== undefined) updateData.multiplier = multiplier;
        if (isActive !== undefined) updateData.isActive = isActive;

        // Validate date range if dates are being updated
        if (updateData.startDate || updateData.endDate) {
          const finalStartDate = updateData.startDate || existingRate.startDate;
          const finalEndDate = updateData.endDate || existingRate.endDate;

          if (finalStartDate >= finalEndDate) {
            throw new Error("End date must be after start date");
          }
        }

        // Update the seasonal rate
        return await tx.seasonalRate.update({
          where: { id },
          data: updateData,
          include: {
            roomType: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
      }
    );

    return NextResponse.json({
      success: true,
      message: "Seasonal rate updated successfully",
      data: updatedSeasonalRate
    });
  } catch (error) {
    console.error("PUT /api/rates/seasonal error:", error);
    return NextResponse.json(
      {
        error: "Failed to update seasonal rate",
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rates/seasonal - Delete seasonal rate
 * Query params:
 * - id: string (required)
 */
export async function DELETE(req: NextRequest) {
  try {
    // Validate property access (PROPERTY_MGR and above can delete seasonal rates)
    const validation = await validatePropertyAccess(
      req,
      PropertyRole.PROPERTY_MGR
    );
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Seasonal rate ID is required" },
        { status: 400 }
      );
    }

    const deletedRate = await withPropertyContext(propertyId!, async (tx) => {
      // Verify seasonal rate exists and ownership
      const existingRate = await tx.seasonalRate.findUnique({
        where: { id },
        include: {
          roomType: {
            select: {
              propertyId: true,
              name: true
            }
          }
        }
      });

      if (!existingRate) {
        throw new Error("Seasonal rate not found");
      }

      // Verify ownership
      if (
        existingRate.roomType &&
        existingRate.roomType.propertyId !== propertyId
      ) {
        throw new Error("Unauthorized access to seasonal rate");
      }

      // Delete the seasonal rate
      await tx.seasonalRate.delete({
        where: { id }
      });

      return existingRate;
    });

    return NextResponse.json({
      success: true,
      message: "Seasonal rate deleted successfully",
      data: {
        id: deletedRate.id,
        name: deletedRate.name,
        roomType: deletedRate.roomType?.name || "Property-wide"
      }
    });
  } catch (error) {
    console.error("DELETE /api/rates/seasonal error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete seasonal rate",
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
