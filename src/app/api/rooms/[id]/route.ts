// File: src/app/api/rooms/[id]/route.ts
export const runtime = "nodejs"; // ✅ Use Node.js runtime for RLS context
import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/rooms/[id]
 * Get specific room details
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Validate property access
    const validation = await validatePropertyAccess(req);
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    // Get detailed room information
    const roomDetails = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.room.findUnique({
        where: { id },
        include: {
          roomType: true,
          pricing: true,
          property: {
            select: { id: true, name: true }
          }
        }
      });
    });

    if (!roomDetails) {
      return new NextResponse("Room not found", { status: 404 });
    }

    return NextResponse.json(roomDetails);
  } catch (error) {
    console.error(`GET /api/rooms/${id} error:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Update a room by ID (PUT /api/rooms/[id])
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Get room to determine property
    const room = await prisma.room.findUnique({
      where: { id },
      select: { propertyId: true }
    });

    if (!room || !room.propertyId) {
      return new NextResponse("Room not found", { status: 404 });
    }

    // Validate property access with required role
    const validation = await validatePropertyAccess(req, "PROPERTY_MGR");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    // Parse and validate body
    const { name, type, capacity, imageUrl, description, doorlockId } =
      await req.json();
    if (
      (name && typeof name !== "string") ||
      (type && typeof type !== "string") ||
      (capacity && typeof capacity !== "number") ||
      (description && typeof description !== "string") ||
      (doorlockId && typeof doorlockId !== "string")
    ) {
      return new NextResponse("Invalid payload", { status: 422 });
    }

    const updated = await withPropertyContext(room.propertyId, async (tx) => {
      return await tx.room.update({
        where: { id },
        data: {
          name,
          type,
          capacity,
          imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
          description:
            typeof description === "string" ? description : undefined,
          doorlockId: typeof doorlockId === "string" ? doorlockId : undefined
        }
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/rooms/[id] error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Delete a room by ID (DELETE /api/rooms/[id])
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Get room to determine property
    const room = await prisma.room.findUnique({
      where: { id },
      select: { propertyId: true }
    });

    if (!room || !room.propertyId) {
      return new NextResponse("Room not found", { status: 404 });
    }

    // Validate property access with required role
    const validation = await validatePropertyAccess(req, "PROPERTY_MGR");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const result = await withPropertyContext(room.propertyId, async (tx) => {
      // Check for existing reservations
      const existingReservations = await tx.reservation.findMany({
        where: {
          roomId: id,
          propertyId: room.propertyId
        },
        select: {
          id: true,
          guestName: true,
          checkIn: true,
          checkOut: true,
          status: true
        }
      });

      console.log(
        `🔍 Room ${id} has ${existingReservations.length} existing reservations`
      );

      if (existingReservations.length > 0) {
        console.log(
          `❌ Cannot delete room ${id} - has reservations:`,
          existingReservations
        );
        return {
          success: false,
          error: "HAS_RESERVATIONS",
          reservationCount: existingReservations.length,
          reservations: existingReservations
        };
      }

      // Safe to delete - no reservations exist
      const deleted = await tx.room.delete({
        where: { id }
      });

      return { success: true, deleted };
    });

    // Handle different scenarios
    if (!result.success) {
      if (result.error === "HAS_RESERVATIONS") {
        return NextResponse.json(
          {
            error: "Cannot delete room with existing reservations",
            message: `This room has ${result.reservationCount} existing reservation(s). Please cancel or move these reservations before deleting the room.`,
            reservationCount: result.reservationCount,
            reservations: result.reservations
          },
          { status: 409 }
        );
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/rooms/[id] error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
