/**
 * Chat Rooms API
 *
 * POST /api/chat/rooms - Create a new chat room
 * GET /api/chat/rooms - List user's chat rooms
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDirectMessageRoom } from "@/lib/chat/room-service";
import type {
  CreateRoomRequest,
  CreateDirectMessageRequest
} from "@/lib/chat/types";

/**
 * POST /api/chat/rooms
 * Create a new chat room (group or direct message)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Handle direct message creation
    if (body.recipientId) {
      const { organizationId, recipientId } =
        body as CreateDirectMessageRequest;

      if (!organizationId || !recipientId) {
        return NextResponse.json(
          { error: "organizationId and recipientId are required" },
          { status: 400 }
        );
      }

      // Create or get existing DM room
      const room = await createDirectMessageRoom(
        organizationId,
        session.user.id,
        recipientId
      );

      return NextResponse.json(room, { status: 200 });
    }

    // Handle group chat creation
    const { type, name, organizationId, propertyId, participantIds } =
      body as CreateRoomRequest;

    if (
      !type ||
      !organizationId ||
      !participantIds ||
      participantIds.length === 0
    ) {
      return NextResponse.json(
        { error: "type, organizationId, and participantIds are required" },
        { status: 400 }
      );
    }

    // Validate room type
    if (type !== "GROUP") {
      return NextResponse.json(
        { error: "Only GROUP rooms can be created via this endpoint" },
        { status: 400 }
      );
    }

    // Create group chat room
    const room = await prisma.chatRoom.create({
      data: {
        type,
        name: name || "Group Chat",
        organizationId,
        propertyId: propertyId || null,
        participants: {
          create: [
            // Add creator
            { userId: session.user.id },
            // Add other participants
            ...participantIds
              .filter((id) => id !== session.user.id)
              .map((userId) => ({ userId }))
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Error creating chat room:", error);
    return NextResponse.json(
      { error: "Failed to create chat room" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/rooms
 * List all chat rooms for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    // Get all rooms where user is a participant
    const rooms = await prisma.chatRoom.findMany({
      where: {
        organizationId,
        participants: {
          some: {
            userId: session.user.id
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: {
        lastMessageAt: "desc"
      }
    });

    // Calculate unread count for each room
    const roomsWithUnread = await Promise.all(
      rooms.map(async (room) => {
        const participant = room.participants.find(
          (p) => p.userId === session.user.id
        );
        const lastReadAt = participant?.lastReadAt;

        const unreadCount = await prisma.chatMessage.count({
          where: {
            roomId: room.id,
            senderId: { not: session.user.id },
            createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
            isDeleted: false
          }
        });

        return {
          ...room,
          lastMessage: room.messages[0] || null,
          unreadCount
        };
      })
    );

    return NextResponse.json({
      rooms: roomsWithUnread,
      total: roomsWithUnread.length
    });
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat rooms" },
      { status: 500 }
    );
  }
}
