// app/api/rooms/available/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!propertyId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all rooms for the property with roomType relation
    const allRooms = await prisma.room.findMany({
      where: {
        propertyId
      },
      include: {
        roomType: {
          select: { id: true, name: true, basePrice: true }
        }
      },
      orderBy: [
        { type: "asc" }, // Group by room type first
        { name: "asc" } // Then sort by name within each type
      ]
    });

    // Get all reservations that overlap with the date range
    const overlappingReservations = await prisma.reservation.findMany({
      where: {
        propertyId,
        status: {
          notIn: ["CANCELLED", "NO_SHOW"]
        },
        OR: [
          {
            // Reservation starts during the range
            checkIn: {
              gte: start,
              lt: end
            }
          },
          {
            // Reservation ends during the range
            checkOut: {
              gt: start,
              lte: end
            }
          },
          {
            // Reservation spans the entire range
            checkIn: {
              lte: start
            },
            checkOut: {
              gte: end
            }
          }
        ]
      },
      select: {
        roomId: true
      }
    });

    // Get all room blocks that overlap with the date range
    const overlappingBlocks = await prisma.roomBlock.findMany({
      where: {
        propertyId,
        OR: [
          {
            // Block starts during the range
            startDate: {
              gte: start,
              lt: end
            }
          },
          {
            // Block ends during the range
            endDate: {
              gt: start,
              lte: end
            }
          },
          {
            // Block spans the entire range
            startDate: {
              lte: start
            },
            endDate: {
              gte: end
            }
          }
        ]
      },
      select: {
        roomId: true
      }
    });

    // Create a set of occupied room IDs
    const occupiedRoomIds = new Set<string>();
    overlappingReservations.forEach((res) => occupiedRoomIds.add(res.roomId));
    overlappingBlocks.forEach((block) => occupiedRoomIds.add(block.roomId));

    // Filter out occupied rooms
    const availableRooms = allRooms.filter(
      (room) => !occupiedRoomIds.has(room.id)
    );

    return NextResponse.json(availableRooms);
  } catch (error) {
    console.error("Error fetching available rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch available rooms" },
      { status: 500 }
    );
  }
}
