// File: src/app/api/reservations/[id]/status/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ReservationStatus, PropertyRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validatePropertyAccess } from "@/lib/property-context";
import { withPropertyContext } from "@/lib/property-context";
import { validateStatusTransition } from "@/lib/reservation-status/utils";
import { statusTransitionValidator } from "@/lib/reservation-status/advanced-validation";
import { statusBusinessRulesService } from "@/lib/reservation-status/business-rules-service";

/**
 * PATCH /api/reservations/[id]/status
 * Update reservation status with validation and audit trail
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate property access (FRONT_DESK role required)
    const validation = await validatePropertyAccess(req, "FRONT_DESK");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId, userId } = validation;

    // Parse request body
    const {
      newStatus,
      reason,
      isAutomatic = false
    }: {
      newStatus: ReservationStatus;
      reason?: string;
      isAutomatic?: boolean;
    } = await req.json();

    if (!newStatus) {
      return NextResponse.json(
        { error: "newStatus is required" },
        { status: 400 }
      );
    }

    // Validate that the reservation exists and belongs to the property
    const reservation = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.reservation.findFirst({
        where: {
          id,
          propertyId: propertyId
        },
        select: {
          id: true,
          status: true,
          guestName: true,
          checkIn: true,
          checkOut: true,
          paymentStatus: true,
          paidAmount: true,
          amountCaptured: true,
          depositAmount: true,
          roomId: true,
          adults: true,
          children: true,
          createdAt: true
        }
      });
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Basic status transition validation
    const basicValidation = validateStatusTransition(
      reservation.status,
      newStatus
    );

    if (!basicValidation.isValid) {
      return NextResponse.json(
        { error: basicValidation.reason },
        { status: 400 }
      );
    }

    // Get user's property role for advanced validation
    // First check if user is ORG_ADMIN (has organization-level access)
    const orgAccess = await prisma.userOrg.findFirst({
      where: {
        userId: userId,
        role: { in: ["SUPER_ADMIN", "ORG_ADMIN"] },
        organization: {
          properties: {
            some: { id: propertyId }
          }
        }
      },
      select: {
        role: true
      }
    });

    // If ORG_ADMIN or SUPER_ADMIN, map to PROPERTY_MGR for validation
    let userRole: PropertyRole | undefined;
    if (orgAccess?.role === "SUPER_ADMIN" || orgAccess?.role === "ORG_ADMIN") {
      userRole = PropertyRole.PROPERTY_MGR; // Map org-level roles to property manager
    } else {
      // Check property-level access
      const userProperty = await withPropertyContext(
        propertyId!,
        async (tx) => {
          return await tx.userProperty.findFirst({
            where: {
              userId: userId,
              propertyId: propertyId
            },
            select: {
              role: true
            }
          });
        }
      );

      if (!userProperty) {
        return NextResponse.json(
          { error: "User property access not found" },
          { status: 403 }
        );
      }
      userRole = userProperty.role;
    }

    // Get organizationId from property
    const property = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.property.findUnique({
        where: { id: propertyId! },
        select: { organizationId: true }
      });
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Advanced validation with business rules
    const advancedValidationContext = {
      reservationId: id,
      currentStatus: reservation.status,
      newStatus,
      reason: reason || "Status update",
      userId: userId!,
      userRole: userRole!,
      propertyId: propertyId!,
      organizationId: property.organizationId,
      isAutomatic,
      reservation: {
        guestName: reservation.guestName || "Unknown Guest",
        checkIn: new Date(reservation.checkIn),
        checkOut: new Date(reservation.checkOut),
        paymentStatus: reservation.paymentStatus || "UNPAID",
        paidAmount: reservation.paidAmount || 0,
        amountCaptured: reservation.amountCaptured || 0,
        depositAmount: reservation.depositAmount || 0,
        roomId: reservation.roomId,
        adults: reservation.adults || 1,
        children: reservation.children || 0,
        createdAt: reservation.createdAt
      }
    };

    const advancedValidation =
      await statusTransitionValidator.validateTransition(
        advancedValidationContext
      );

    // Check business rules
    const businessRulesValidation =
      await statusBusinessRulesService.evaluateRules(advancedValidationContext);

    // Combine validation results
    const combinedErrors = [
      ...advancedValidation.errors,
      ...businessRulesValidation.errors
    ];

    const combinedWarnings = [
      ...advancedValidation.warnings,
      ...businessRulesValidation.warnings
    ];

    const requiresApproval =
      advancedValidation.requiresApproval ||
      businessRulesValidation.requiresApproval;

    // If there are errors, return them
    if (combinedErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: combinedErrors,
          warnings: combinedWarnings,
          businessRuleViolations: advancedValidation.businessRuleViolations,
          dataIntegrityIssues: advancedValidation.dataIntegrityIssues
        },
        { status: 400 }
      );
    }

    // If approval is required and not explicitly requested, return approval requirement
    if (requiresApproval && !isAutomatic) {
      return NextResponse.json(
        {
          error: "Approval required",
          requiresApproval: true,
          approvalReason:
            advancedValidation.approvalReason ||
            businessRulesValidation.approvalReason,
          warnings: combinedWarnings
        },
        { status: 403 }
      );
    }

    // Update reservation status and create audit trail
    const updatedReservation = await withPropertyContext(
      propertyId!,
      async (tx) => {
        // Update the reservation
        const updated = await tx.reservation.update({
          where: { id },
          data: {
            status: newStatus,
            statusUpdatedBy: userId, // Always use the authenticated user's ID
            statusUpdatedAt: new Date(),
            statusChangeReason: reason,
            // Set check-in/check-out timestamps based on status
            ...(newStatus === ReservationStatus.IN_HOUSE && {
              checkedInAt: new Date()
            }),
            ...(newStatus === ReservationStatus.CHECKED_OUT && {
              checkedOutAt: new Date()
            })
          },
          include: {
            room: {
              select: { id: true, name: true, type: true }
            },
            property: {
              select: { id: true, name: true }
            }
          }
        });

        // Create status history entry
        await tx.reservationStatusHistory.create({
          data: {
            reservationId: id,
            propertyId: propertyId!,
            previousStatus: reservation.status,
            newStatus: newStatus,
            changedBy: userId || null, // Always use the authenticated user's ID
            changeReason: reason,
            notes: undefined, // Can be added from request body if needed
            isAutomatic: isAutomatic
          }
        });

        return updated;
      }
    );

    return NextResponse.json({
      success: true,
      reservation: updatedReservation,
      message: `Status updated to ${newStatus}`,
      validation: {
        warnings: combinedWarnings,
        businessRuleViolations: advancedValidation.businessRuleViolations,
        dataIntegrityIssues: advancedValidation.dataIntegrityIssues,
        requiresApproval: requiresApproval
      }
    });
  } catch (error) {
    console.error("PATCH /api/reservations/[id]/status error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reservations/[id]/status
 * Get current status and recent status history
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate property access (FRONT_DESK role required)
    const validation = await validatePropertyAccess(req, "FRONT_DESK");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    // Get reservation with status information
    const reservation = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.reservation.findFirst({
        where: {
          id,
          propertyId: propertyId
        },
        select: {
          id: true,
          status: true,
          checkedInAt: true,
          checkedOutAt: true,
          statusUpdatedBy: true,
          statusUpdatedAt: true,
          statusChangeReason: true,
          guestName: true,
          checkIn: true,
          checkOut: true
        }
      });
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      reservation,
      currentStatus: reservation.status
    });
  } catch (error) {
    console.error("GET /api/reservations/[id]/status error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
