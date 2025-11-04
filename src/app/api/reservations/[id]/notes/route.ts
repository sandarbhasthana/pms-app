// File: src/app/api/reservations/[id]/notes/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePropertyAccess } from "@/lib/property-context";

/**
 * GET /api/reservations/[id]/notes
 * Get all notes for a reservation from audit log
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: reservationId } = await context.params;

    // Validate property access
    const validation = await validatePropertyAccess(req, "FRONT_DESK");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    // Get reservation to verify it exists and belongs to the property
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { propertyId: true }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    if (reservation.propertyId !== validation.propertyId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get all NOTE_ADDED audit logs for this reservation
    const notes = await prisma.reservationAuditLog.findMany({
      where: {
        reservationId,
        action: "NOTE_ADDED"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        changedAt: "desc"
      }
    });

    // Transform to match the Note interface
    const transformedNotes = notes.map((note) => ({
      id: note.id,
      content: note.newValue || "",
      author: note.user?.name || "Unknown User",
      createdAt: note.changedAt.toISOString(),
      noteType: note.metadata ? JSON.parse(note.metadata).noteType : "INTERNAL",
      important: note.metadata
        ? JSON.parse(note.metadata).important || false
        : false
    }));

    return NextResponse.json({ notes: transformedNotes });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reservations/[id]/notes
 * Add a new note to a reservation
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: reservationId } = await context.params;
    const {
      content,
      noteType = "INTERNAL",
      important = false
    } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    // Validate property access
    const validation = await validatePropertyAccess(req, "FRONT_DESK");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    // Get reservation to verify it exists and belongs to the property
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { propertyId: true, guestName: true }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    if (reservation.propertyId !== validation.propertyId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Create audit log entry for the note
    const auditLog = await prisma.reservationAuditLog.create({
      data: {
        reservationId,
        propertyId: validation.propertyId!,
        action: "NOTE_ADDED",
        fieldName: "notes",
        oldValue: null,
        newValue: content.trim(),
        description: `Note added by ${session.user.name || session.user.email}`,
        changedBy: session.user.id,
        metadata: JSON.stringify({ noteType, important })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Return the created note
    const createdNote = {
      id: auditLog.id,
      content: auditLog.newValue || "",
      author: auditLog.user?.name || "Unknown User",
      createdAt: auditLog.changedAt.toISOString(),
      noteType,
      important
    };

    return NextResponse.json({ note: createdNote }, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reservations/[id]/notes/[noteId]
 * Update an existing note (handled in separate route file)
 */

/**
 * DELETE /api/reservations/[id]/notes/[noteId]
 * Delete a note (handled in separate route file)
 */
