/**
 * Chat Room Details API
 * 
 * GET /api/chat/rooms/[id] - Get room details
 * PATCH /api/chat/rooms/[id] - Update room (name, mute, etc.)
 * DELETE /api/chat/rooms/[id] - Leave room
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/chat/rooms/[id]
 * Get room details with participants
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

    const { id } = await context.params;

    // Get room with participants
    const room = await prisma.chatRoom.findUnique({
      where: { id },
      include: {
        participants: {
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
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Verify user is a participant
    const isParticipant = room.participants.some((p) => p.userId === session.user.id);

    if (!isParticipant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error fetching room details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room details' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chat/rooms/[id]
 * Update room settings (mute notifications, update name)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Verify user is a participant
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        roomId: id,
        userId: session.user.id,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update participant settings (mute)
    if (typeof body.isMuted === 'boolean') {
      await prisma.chatParticipant.update({
        where: { id: participant.id },
        data: { isMuted: body.isMuted },
      });
    }

    // Update room name (only for GROUP rooms)
    if (body.name) {
      const room = await prisma.chatRoom.findUnique({
        where: { id },
        select: { type: true },
      });

      if (room?.type === 'GROUP') {
        await prisma.chatRoom.update({
          where: { id },
          data: { name: body.name },
        });
      }
    }

    // Get updated room
    const updatedRoom = await prisma.chatRoom.findUnique({
      where: { id },
      include: {
        participants: {
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

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat/rooms/[id]
 * Leave a room (remove participant)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Remove participant
    await prisma.chatParticipant.deleteMany({
      where: {
        roomId: id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving room:', error);
    return NextResponse.json(
      { error: 'Failed to leave room' },
      { status: 500 }
    );
  }
}

