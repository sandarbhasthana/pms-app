/**
 * Chat Room Participants API
 * 
 * GET /api/chat/rooms/[id]/participants - Get room participants
 * POST /api/chat/rooms/[id]/participants - Add participants to room
 * DELETE /api/chat/rooms/[id]/participants - Remove participant from room
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { AddParticipantsRequest } from '@/lib/chat/types';

/**
 * GET /api/chat/rooms/[id]/participants
 * Get all participants in a room
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

    // Verify user is a participant
    const isParticipant = await prisma.chatParticipant.findFirst({
      where: {
        roomId,
        userId: session.user.id,
      },
    });

    if (!isParticipant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all participants
    const participants = await prisma.chatParticipant.findMany({
      where: { roomId },
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
      orderBy: { joinedAt: 'asc' },
    });

    return NextResponse.json({ participants });
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/rooms/[id]/participants
 * Add participants to a room (GROUP rooms only)
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
    const body: AddParticipantsRequest = await request.json();

    if (!body.userIds || body.userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const isParticipant = await prisma.chatParticipant.findFirst({
      where: {
        roomId,
        userId: session.user.id,
      },
    });

    if (!isParticipant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify room is a GROUP (can't add participants to DIRECT, PROPERTY, or ORG rooms)
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { type: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.type !== 'GROUP') {
      return NextResponse.json(
        { error: 'Can only add participants to group chats' },
        { status: 400 }
      );
    }

    // Add participants
    await prisma.chatParticipant.createMany({
      data: body.userIds.map((userId) => ({
        roomId,
        userId,
      })),
      skipDuplicates: true,
    });

    // Get updated participants list
    const participants = await prisma.chatParticipant.findMany({
      where: { roomId },
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
    });

    return NextResponse.json({ participants });
  } catch (error) {
    console.error('Error adding participants:', error);
    return NextResponse.json(
      { error: 'Failed to add participants' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat/rooms/[id]/participants
 * Remove a participant from a room
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

    const { id: roomId } = await context.params;
    const { searchParams } = new URL(request.url);
    const userIdToRemove = searchParams.get('userId');

    if (!userIdToRemove) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const isParticipant = await prisma.chatParticipant.findFirst({
      where: {
        roomId,
        userId: session.user.id,
      },
    });

    if (!isParticipant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Remove participant
    await prisma.chatParticipant.deleteMany({
      where: {
        roomId,
        userId: userIdToRemove,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing participant:', error);
    return NextResponse.json(
      { error: 'Failed to remove participant' },
      { status: 500 }
    );
  }
}

