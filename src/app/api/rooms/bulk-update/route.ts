export const runtime = "nodejs"; // ✅ Use Node.js runtime for RLS context
import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import { PropertyRole } from "@prisma/client";

export async function PUT(req: NextRequest) {
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

    const { propertyId } = validation;

    // Expecting an array of rooms with id, name, description, doorlockId, imageUrl
    const roomsToUpdate: {
      id: string;
      name: string;
      description?: string;
      doorlockId?: string;
      imageUrl?: string;
    }[] = await req.json();

    if (!Array.isArray(roomsToUpdate) || roomsToUpdate.length === 0) {
      return NextResponse.json(
        { error: "Invalid rooms array" },
        { status: 400 }
      );
    }

    // Perform all updates in parallel within property context
    const updated = await withPropertyContext(propertyId!, async (tx) => {
      // First verify all rooms belong to this property
      const roomIds = roomsToUpdate.map((r) => r.id);
      const existingRooms = await tx.room.findMany({
        where: {
          id: { in: roomIds },
          propertyId: propertyId
        },
        select: { id: true }
      });

      if (existingRooms.length !== roomIds.length) {
        throw new Error(
          "Some rooms not found or don't belong to this property"
        );
      }

      // Perform updates
      return await Promise.all(
        roomsToUpdate.map((r) =>
          tx.room.update({
            where: { id: r.id },
            data: {
              name: r.name,
              description: r.description,
              doorlockId: r.doorlockId,
              imageUrl: r.imageUrl
            }
          })
        )
      );
    });

    return NextResponse.json({ rooms: updated });
  } catch (error: unknown) {
    console.error("Bulk update error:", error);
    return NextResponse.json(
      { error: "Failed to update rooms" },
      { status: 500 }
    );
  }
}
