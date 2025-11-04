// File: src/app/api/reservations/[id]/notes/[noteId]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePropertyAccess } from "@/lib/property-context";

/**
 * PATCH /api/reservations/[id]/notes/[noteId]
 * Update an existing note
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: reservationId, noteId } = await context.params;
    const { content } = await req.json();

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

    // Get the original note with full details
    const originalNote = await prisma.reservationAuditLog.findUnique({
      where: { id: noteId },
      select: {
        newValue: true,
        metadata: true,
        changedBy: true,
        changedAt: true
      }
    });

    if (!originalNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Parse metadata
    const metadata = originalNote.metadata
      ? JSON.parse(originalNote.metadata)
      : { noteType: "INTERNAL", important: false };

    // Create an audit log entry for the edit (tracking the change)
    // This creates a new NOTE_EDITED entry that shows the full edit history
    const editLog = await prisma.reservationAuditLog.create({
      data: {
        reservationId,
        propertyId: validation.propertyId!,
        action: "NOTE_EDITED",
        fieldName: "notes",
        oldValue: originalNote.newValue,
        newValue: content.trim(),
        description: `Note edited by ${
          session.user.name || session.user.email
        }`,
        changedBy: session.user.id,
        metadata: JSON.stringify({
          originalNoteId: noteId,
          editedAt: new Date().toISOString()
        })
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

    // Update the original note with new content (for display in Notes tab)
    // This keeps the same note ID but updates the content
    await prisma.reservationAuditLog.update({
      where: { id: noteId },
      data: {
        newValue: content.trim(),
        changedAt: new Date() // Update timestamp to show when it was last edited
      }
    });

    // Return the updated note (using the original note ID)
    const updatedNote = {
      id: noteId, // Keep the original note ID
      content: content.trim(),
      author: editLog.user?.name || "Unknown User", // Show who edited it
      createdAt: new Date().toISOString(), // Show current timestamp
      noteType: metadata.noteType,
      important: metadata.important
    };

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reservations/[id]/notes/[noteId]
 * Delete a note (soft delete by marking in audit log)
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: reservationId, noteId } = await context.params;

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

    // Get the note to verify it exists
    const note = await prisma.reservationAuditLog.findUnique({
      where: { id: noteId },
      select: { newValue: true }
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Create audit log entry for deletion
    await prisma.reservationAuditLog.create({
      data: {
        reservationId,
        propertyId: validation.propertyId!,
        action: "NOTE_DELETED",
        fieldName: "notes",
        oldValue: note.newValue,
        newValue: null,
        description: `Note deleted by ${
          session.user.name || session.user.email
        } (Deleted note ID: ${noteId})`,
        changedBy: session.user.id,
        metadata: JSON.stringify({ deletedNoteId: noteId })
      }
    });

    // Delete the note from audit log
    await prisma.reservationAuditLog.delete({
      where: { id: noteId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
