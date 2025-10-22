// File: src/app/api/approval-requests/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePropertyAccess } from "@/lib/property-context";
import { withPropertyContext } from "@/lib/property-context";

/**
 * PATCH /api/approval-requests/[id]
 * Approve or reject an approval request
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { status, approvalNotes } = await req.json();

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    // Get approval request
    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { id },
      include: { reservation: true }
    });

    if (!approvalRequest) {
      return NextResponse.json(
        { error: "Approval request not found" },
        { status: 404 }
      );
    }

    // Validate property access (PROPERTY_MGR required)
    const validation = await validatePropertyAccess(req, "PROPERTY_MGR");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    // Update approval request
    const updated = await withPropertyContext(
      approvalRequest.propertyId,
      async (tx) => {
        return await tx.approvalRequest.update({
          where: { id },
          data: {
            status,
            approvedBy: session.user.id,
            approvedAt: new Date(),
            approvalNotes: approvalNotes || null
          },
          include: {
            requestedByUser: {
              select: { id: true, name: true, email: true }
            },
            approvedByUser: {
              select: { id: true, name: true, email: true }
            },
            reservation: {
              select: { id: true, guestName: true }
            }
          }
        });
      }
    );

    // If approved and it's an early check-in request, proceed with the status update
    if (
      status === "APPROVED" &&
      approvalRequest.requestType === "EARLY_CHECKIN"
    ) {
      try {
        const metadata = approvalRequest.metadata
          ? JSON.parse(approvalRequest.metadata)
          : {};

        // Use the newStatus from metadata, or default to IN_HOUSE
        const newStatus = metadata.newStatus || "IN_HOUSE";
        const reason =
          metadata.reason ||
          `Early check-in approved by ${
            session.user.name || session.user.email
          }`;

        // Update reservation status to the requested status
        await withPropertyContext(approvalRequest.propertyId, async (tx) => {
          return await tx.reservation.update({
            where: { id: approvalRequest.reservationId },
            data: {
              status: newStatus,
              statusUpdatedBy: session.user.id,
              statusUpdatedAt: new Date(),
              statusChangeReason: reason
            }
          });
        });

        console.log(
          `✅ Early check-in approved and reservation status updated to ${newStatus}`
        );
      } catch (error) {
        console.error("Error updating reservation status:", error);
        // Don't fail the approval - the approval is still recorded
      }
    }

    console.log(`✅ Approval request ${status}:`, updated);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/approval-requests/[id] error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
