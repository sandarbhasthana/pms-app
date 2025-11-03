// API route for room blocks
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BlockType } from "@prisma/client";

// GET /api/room-blocks?propertyId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    // Fetch all blocks for the property
    const blocks = await prisma.roomBlock.findMany({
      where: {
        propertyId
      },
      include: {
        room: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        startDate: "asc"
      }
    });

    return NextResponse.json(blocks);
  } catch (error) {
    console.error("Error fetching room blocks:", error);
    return NextResponse.json(
      { error: "Failed to fetch room blocks" },
      { status: 500 }
    );
  }
}

// POST /api/room-blocks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      organizationId,
      propertyId,
      roomId,
      startDate,
      endDate,
      blockType,
      reason
    } = body;

    // Validation
    if (
      !organizationId ||
      !propertyId ||
      !roomId ||
      !startDate ||
      !endDate ||
      !blockType
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate blockType
    if (!Object.values(BlockType).includes(blockType)) {
      return NextResponse.json(
        { error: "Invalid block type" },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return NextResponse.json(
        { error: "Cannot create blocks in the past" },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { error: "End date must be after or equal to start date" },
        { status: 400 }
      );
    }

    // Check for overlapping blocks
    const overlappingBlocks = await prisma.roomBlock.findMany({
      where: {
        roomId,
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } }
            ]
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } }
            ]
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } }
            ]
          }
        ]
      }
    });

    if (overlappingBlocks.length > 0) {
      return NextResponse.json(
        { error: "This room already has a block for the selected dates" },
        { status: 409 }
      );
    }

    // Check for existing reservations
    const existingReservations = await prisma.reservation.findMany({
      where: {
        roomId,
        OR: [
          {
            AND: [
              { checkIn: { lte: start } },
              { checkOut: { gt: start } }
            ]
          },
          {
            AND: [
              { checkIn: { lt: end } },
              { checkOut: { gte: end } }
            ]
          },
          {
            AND: [
              { checkIn: { gte: start } },
              { checkOut: { lte: end } }
            ]
          }
        ],
        status: {
          notIn: ["CANCELLED", "NO_SHOW", "CHECKED_OUT"]
        }
      },
      include: {
        room: {
          select: {
            name: true
          }
        }
      }
    });

    if (existingReservations.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot block room - existing reservations found",
          reservations: existingReservations.map((r) => ({
            id: r.id,
            guestName: r.guestName,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            roomName: r.room.name
          }))
        },
        { status: 409 }
      );
    }

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create the block
    const block = await prisma.roomBlock.create({
      data: {
        organizationId,
        propertyId,
        roomId,
        startDate: start,
        endDate: end,
        blockType,
        reason: reason || "",
        createdBy: user.id
      },
      include: {
        room: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error("Error creating room block:", error);
    return NextResponse.json(
      { error: "Failed to create room block" },
      { status: 500 }
    );
  }
}

