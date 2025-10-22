// File: src/lib/audit-log/reservation-audit.ts
import { PrismaClient } from "@prisma/client";

export interface AuditLogInput {
  reservationId: string;
  propertyId: string;
  action: string; // CREATED, FIELD_UPDATED, NOTE_ADDED, PAYMENT_MADE, ADDON_ADDED, ADDON_REMOVED
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  description?: string;
  changedBy?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Create an audit log entry for a reservation change
 */
export async function createAuditLog(
  prisma: PrismaClient,
  input: AuditLogInput
) {
  try {
    const metadataStr = input.metadata ? JSON.stringify(input.metadata) : null;

    const auditLog = await prisma.reservationAuditLog.create({
      data: {
        reservationId: input.reservationId,
        propertyId: input.propertyId,
        action: input.action,
        fieldName: input.fieldName || null,
        oldValue: input.oldValue || null,
        newValue: input.newValue || null,
        description: input.description || null,
        changedBy: input.changedBy || null,
        metadata: metadataStr,
        changedAt: new Date()
      }
    });

    console.log(`✅ Audit log created:`, auditLog);
    return auditLog;
  } catch (error) {
    console.error("Error creating audit log:", error);
    throw error;
  }
}

/**
 * Log reservation creation
 */
export async function logReservationCreated(
  prisma: PrismaClient,
  reservationId: string,
  propertyId: string,
  guestName: string | null,
  changedBy: string | null
) {
  return createAuditLog(prisma, {
    reservationId,
    propertyId,
    action: "CREATED",
    description: `Reservation created for ${guestName || "Guest"}`,
    changedBy,
    metadata: { guestName }
  });
}

/**
 * Log field update
 */
export async function logFieldUpdate(
  prisma: PrismaClient,
  reservationId: string,
  propertyId: string,
  fieldName: string,
  oldValue: string | number | boolean | null | undefined,
  newValue: string | number | boolean | null | undefined,
  changedBy: string | null
) {
  return createAuditLog(prisma, {
    reservationId,
    propertyId,
    action: "FIELD_UPDATED",
    fieldName,
    oldValue: String(oldValue || ""),
    newValue: String(newValue || ""),
    description: `Updated ${fieldName}`,
    changedBy
  });
}

/**
 * Log note addition
 */
export async function logNoteAdded(
  prisma: PrismaClient,
  reservationId: string,
  propertyId: string,
  noteContent: string,
  changedBy: string | null
) {
  return createAuditLog(prisma, {
    reservationId,
    propertyId,
    action: "NOTE_ADDED",
    description: `Note added: ${noteContent.substring(0, 100)}...`,
    changedBy,
    metadata: { noteLength: noteContent.length }
  });
}

/**
 * Log payment
 */
export async function logPaymentMade(
  prisma: PrismaClient,
  reservationId: string,
  propertyId: string,
  amount: number,
  paymentMethod: string,
  changedBy: string | null
) {
  return createAuditLog(prisma, {
    reservationId,
    propertyId,
    action: "PAYMENT_MADE",
    description: `Payment of ${amount} received via ${paymentMethod}`,
    changedBy,
    metadata: { amount, paymentMethod }
  });
}

/**
 * Log add-on addition
 */
export async function logAddonAdded(
  prisma: PrismaClient,
  reservationId: string,
  propertyId: string,
  addonName: string,
  quantity: number,
  price: number,
  changedBy: string | null
) {
  return createAuditLog(prisma, {
    reservationId,
    propertyId,
    action: "ADDON_ADDED",
    description: `Added ${quantity}x ${addonName} (${price} each)`,
    changedBy,
    metadata: { addonName, quantity, price }
  });
}

/**
 * Log add-on removal
 */
export async function logAddonRemoved(
  prisma: PrismaClient,
  reservationId: string,
  propertyId: string,
  addonName: string,
  changedBy: string | null
) {
  return createAuditLog(prisma, {
    reservationId,
    propertyId,
    action: "ADDON_REMOVED",
    description: `Removed ${addonName}`,
    changedBy,
    metadata: { addonName }
  });
}
