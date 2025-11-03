// API route for individual room block operations
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BlockType } from "@prisma/client";

// GET /api/room-blocks/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const block = await prisma.roomBlock.findUnique({
      where: { id },
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

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    return NextResponse.json(block);
  } catch (error) {
    console.error("Error fetching room block:", error);
    return NextResponse.json(
      { error: "Failed to fetch room block" },
      { status: 500 }
    );
  }
}

// DELETE /api/room-blocks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if block exists
    const block = await prisma.roomBlock.findUnique({
      where: { id }
    });

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    // Delete the block
    await prisma.roomBlock.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Block deleted successfully" });
  } catch (error) {
    console.error("Error deleting room block:", error);
    return NextResponse.json(
      { error: "Failed to delete room block" },
      { status: 500 }
    );
  }
}

// PUT /api/room-blocks/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { startDate, endDate, blockType, reason } = body;

    // Check if block exists
    const existingBlock = await prisma.roomBlock.findUnique({
      where: { id }
    });

    if (!existingBlock) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    // Validation
    if (!startDate || !endDate || !blockType) {
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

    // Check for overlapping blocks (excluding current block)
    const overlappingBlocks = await prisma.roomBlock.findMany({
      where: {
        roomId: existingBlock.roomId,
        id: { not: id },
        OR: [
          {
            AND: [{ startDate: { lte: start } }, { endDate: { gte: start } }]
          },
          {
            AND: [{ startDate: { lte: end } }, { endDate: { gte: end } }]
          },
          {
            AND: [{ startDate: { gte: start } }, { endDate: { lte: end } }]
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
        roomId: existingBlock.roomId,
        OR: [
          {
            AND: [{ checkIn: { lte: start } }, { checkOut: { gt: start } }]
          },
          {
            AND: [{ checkIn: { lt: end } }, { checkOut: { gte: end } }]
          },
          {
            AND: [{ checkIn: { gte: start } }, { checkOut: { lte: end } }]
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
          error: "Cannot update block - existing reservations found",
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

    // Update the block
    const updatedBlock = await prisma.roomBlock.update({
      where: { id },
      data: {
        startDate: start,
        endDate: end,
        blockType,
        reason: reason || ""
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

    return NextResponse.json(updatedBlock);
  } catch (error) {
    console.error("Error updating room block:", error);
    return NextResponse.json(
      { error: "Failed to update room block" },
      { status: 500 }
    );
  }
}
