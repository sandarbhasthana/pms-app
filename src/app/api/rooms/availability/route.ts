// File: src/app/api/rooms/availability/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
  validatePropertyAccess,
  withPropertyContext
} from "@/lib/property-context";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    const excludeReservation = searchParams.get("excludeReservation");

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: "Check-in and check-out dates are required" },
        { status: 400 }
      );
    }

    // Validate property access and get property context
    const validation = await validatePropertyAccess(request);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error || "Access denied" },
        { status: validation.error === "Unauthorized" ? 401 : 403 }
      );
    }

    const { propertyId } = validation;

    // Query all rooms for the property with their reservations
    // ✅ OPTIMIZED: Use select instead of include (Task 1.4)
    const availableRooms = await withPropertyContext(
      propertyId!,
      async (tx) => {
        return await tx.room.findMany({
          where: {
            propertyId: propertyId // Filter by current property
          },
          select: {
            id: true,
            name: true,
            type: true,
            capacity: true,
            imageUrl: true,
            description: true,
            doorlockId: true,
            roomTypeId: true,
            roomType: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                weekdayPrice: true,
                weekendPrice: true,
                maxOccupancy: true,
                maxAdults: true,
                maxChildren: true
              }
            },
            reservations: {
              where: {
                AND: [
                  // Check for overlapping reservations
                  {
                    OR: [
                      {
                        AND: [
                          { checkIn: { lt: new Date(checkOut) } },
                          { checkOut: { gt: new Date(checkIn) } }
                        ]
                      }
                    ]
                  },
                  // Exclude the current reservation being edited
                  excludeReservation
                    ? {
                        id: { not: excludeReservation }
                      }
                    : {},
                  // Only check active reservations
                  {
                    status: {
                      in: ["CONFIRMED", "IN_HOUSE", "CONFIRMATION_PENDING"]
                    }
                  },
                  // Exclude soft-deleted reservations
                  {
                    deletedAt: null
                  }
                ]
              },
              select: {
                id: true,
                status: true,
                checkIn: true,
                checkOut: true,
                guestName: true
              }
            }
          }
        });
      }
    );

    // Transform to expected format with availability logic
    const formattedRooms = availableRooms.map((room) => {
      const hasConflictingReservation = room.reservations.length > 0;
      const basePrice =
        room.roomType?.basePrice || room.roomType?.weekdayPrice || 2500;

      return {
        id: room.id,
        number: room.name, // Using room name as number for now
        type: room.type.toLowerCase().replace(/\s+/g, "_"),
        typeDisplayName: room.roomType?.name || room.type,
        name: room.roomType
          ? `${room.roomType.name} - ${room.name}`
          : room.name,
        capacity: room.roomType?.maxOccupancy || room.capacity,
        basePrice: basePrice,
        available: !hasConflictingReservation,
        conflictingReservations: room.reservations.map((res) => ({
          id: res.id,
          guestName: res.guestName,
          checkIn: res.checkIn,
          checkOut: res.checkOut,
          status: res.status
        }))
      };
    });

    // Return the formatted rooms with availability information
    return NextResponse.json(formattedRooms);
  } catch (error) {
    console.error("Error checking room availability:", error);
    return NextResponse.json(
      { error: "Failed to check room availability" },
      { status: 500 }
    );
  }
}
