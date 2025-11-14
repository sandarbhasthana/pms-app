/**
 * Mark Message as Read API
 *
 * POST /api/chat/messages/[id]/read - Mark a message as read
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerAblyRestClient, AblyEvents } from "@/lib/chat/ably-config";
import type { MessageReadEvent } from "@/lib/chat/types";

/**
 * POST /api/chat/messages/[id]/read
 * Mark a message (and all previous messages in the room) as read
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: messageId } = await context.params;

    // Get message details
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        roomId: true,
        senderId: true,
        createdAt: true
      }
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify user is a participant in the room
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        roomId: message.roomId,
        userId: session.user.id
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update participant's lastReadAt to this message's timestamp
    // (Do this even for own messages to track when user last viewed the room)
    await prisma.chatParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: message.createdAt }
    });

    // Don't create read receipt for own messages (but we still updated lastReadAt above)
    if (message.senderId === session.user.id) {
      return NextResponse.json({ success: true });
    }

    // Create read receipt
    const readReceipt = await prisma.chatReadReceipt.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId: session.user.id
        }
      },
      create: {
        messageId,
        userId: session.user.id
      },
      update: {
        readAt: new Date()
      },
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
    });

    // Publish read receipt to Ably
    try {
      const room = await prisma.chatRoom.findUnique({
        where: { id: message.roomId },
        select: { organizationId: true }
      });

      if (room) {
        const ably = getServerAblyRestClient();
        const channelName = `org:${room.organizationId}:room:${message.roomId}`;
        const channel = ably.channels.get(channelName);

        const event: MessageReadEvent = {
          messageId,
          userId: session.user.id,
          roomId: message.roomId,
          readAt: readReceipt.readAt
        };

        await channel.publish(AblyEvents.MESSAGE_READ, event);
      }
    } catch (ablyError) {
      console.error("Error publishing read receipt to Ably:", ablyError);
      // Don't fail the request if Ably publish fails
    }

    return NextResponse.json({ success: true, readReceipt });
  } catch (error) {
    console.error("Error marking message as read:", error);
    return NextResponse.json(
      { error: "Failed to mark message as read" },
      { status: 500 }
    );
  }
}
