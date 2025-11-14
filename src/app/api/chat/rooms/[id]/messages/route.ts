/**
 * Chat Messages API
 * 
 * GET /api/chat/rooms/[id]/messages - Get paginated messages
 * POST /api/chat/rooms/[id]/messages - Send a new message
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerAblyRestClient, AblyChannels, AblyEvents } from '@/lib/chat/ably-config';
import type { SendMessageRequest, MessageSentEvent } from '@/lib/chat/types';

/**
 * GET /api/chat/rooms/[id]/messages
 * Get paginated messages for a room
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: roomId } = await context.params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Verify user is a participant
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        roomId,
        userId: session.user.id,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get messages with cursor-based pagination
    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        isDeleted: false,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        readReceipts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Reverse to get chronological order
    const chronologicalMessages = messages.reverse();

    return NextResponse.json({
      messages: chronologicalMessages,
      nextCursor: messages.length === limit ? messages[messages.length - 1]?.id : null,
      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/rooms/[id]/messages
 * Send a new message to a room
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: roomId } = await context.params;
    const body: SendMessageRequest = await request.json();

    // Verify user is a participant
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        roomId,
        userId: session.user.id,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate message content
    if (!body.content && !body.attachmentUrl) {
      return NextResponse.json(
        { error: 'Message must have content or attachment' },
        { status: 400 }
      );
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId: session.user.id,
        type: body.type || 'TEXT',
        content: body.content || null,
        attachmentUrl: body.attachmentUrl || null,
        attachmentName: body.attachmentName || null,
        attachmentSize: body.attachmentSize || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Update room's lastMessageAt
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: message.createdAt },
    });

    // Get room details for Ably channel
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { organizationId: true, type: true, propertyId: true },
    });

    if (room) {
      // Publish message to Ably channel
      try {
        const ably = getServerAblyRestClient();
        let channelName: string;

        // Determine channel name based on room type
        if (room.type === 'ORGANIZATION') {
          channelName = AblyChannels.org(room.organizationId);
        } else if (room.type === 'PROPERTY' && room.propertyId) {
          channelName = AblyChannels.property(room.organizationId, room.propertyId);
        } else if (room.type === 'GROUP') {
          channelName = AblyChannels.group(room.organizationId, roomId);
        } else {
          // DIRECT message - we'll use a generic channel pattern
          channelName = `org:${room.organizationId}:room:${roomId}`;
        }

        const channel = ably.channels.get(channelName);
        const event: MessageSentEvent = {
          message,
          roomId,
        };

        await channel.publish(AblyEvents.MESSAGE_SENT, event);
      } catch (ablyError) {
        console.error('Error publishing to Ably:', ablyError);
        // Don't fail the request if Ably publish fails
      }
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

