/**
 * Safe Data Migration Script for Reservation Status
 *
 * This script migrates existing reservation status data from old values to new values
 * while preserving all existing data and creating audit trail entries.
 */

import { PrismaClient } from "@prisma/client";
import { ReservationStatus } from "../src/types/reservation-status";

const prisma = new PrismaClient();

async function migrateReservationStatus() {
  console.log("🚀 Starting reservation status migration...");

  try {
    // Step 1: Get count of reservations to migrate
    const pendingCount = await prisma.reservation.count({
      where: { status: "PENDING" as unknown as ReservationStatus }
    });

    const checkedInCount = await prisma.reservation.count({
      where: { status: "CHECKED_IN" as unknown as ReservationStatus }
    });

    console.log(
      `📊 Found ${pendingCount} PENDING reservations to migrate to CONFIRMATION_PENDING`
    );
    console.log(
      `📊 Found ${checkedInCount} CHECKED_IN reservations to migrate to IN_HOUSE`
    );

    if (pendingCount === 0 && checkedInCount === 0) {
      console.log("✅ No reservations need migration. All done!");
      return;
    }

    // Step 2: Migrate PENDING -> CONFIRMATION_PENDING
    if (pendingCount > 0) {
      console.log("🔄 Migrating PENDING reservations...");

      const pendingReservations = await prisma.reservation.findMany({
        where: { status: "PENDING" as unknown as ReservationStatus },
        select: { id: true, status: true }
      });

      for (const reservation of pendingReservations) {
        await prisma.$transaction(async (tx) => {
          // Update reservation status
          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: "CONFIRMATION_PENDING",
              statusUpdatedAt: new Date(),
              statusUpdatedBy: "system-migration",
              statusChangeReason:
                "Migrated from PENDING to CONFIRMATION_PENDING"
            }
          });

          // Create status history entry
          await tx.reservationStatusHistory.create({
            data: {
              reservationId: reservation.id,
              previousStatus: "PENDING" as unknown as ReservationStatus,
              newStatus: "CONFIRMATION_PENDING",
              changedBy: "system-migration",
              changeReason: "Migrated from PENDING to CONFIRMATION_PENDING",
              changedAt: new Date(),
              isAutomatic: true
            }
          });
        });
      }

      console.log(
        `✅ Migrated ${pendingCount} PENDING reservations to CONFIRMATION_PENDING`
      );
    }

    // Step 3: Migrate CHECKED_IN -> IN_HOUSE
    if (checkedInCount > 0) {
      console.log("🔄 Migrating CHECKED_IN reservations...");

      const checkedInReservations = await prisma.reservation.findMany({
        where: { status: "CHECKED_IN" as unknown as ReservationStatus },
        select: { id: true, status: true, checkIn: true }
      });

      for (const reservation of checkedInReservations) {
        await prisma.$transaction(async (tx) => {
          // Update reservation status
          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: "IN_HOUSE",
              statusUpdatedAt: new Date(),
              statusUpdatedBy: "system-migration",
              statusChangeReason: "Migrated from CHECKED_IN to IN_HOUSE",
              checkedInAt: reservation.checkIn // Set checkedInAt to original checkIn date
            }
          });

          // Create status history entry
          await tx.reservationStatusHistory.create({
            data: {
              reservationId: reservation.id,
              previousStatus: "CHECKED_IN" as unknown as ReservationStatus,
              newStatus: "IN_HOUSE",
              changedBy: "system-migration",
              changeReason: "Migrated from CHECKED_IN to IN_HOUSE",
              changedAt: new Date(),
              isAutomatic: true
            }
          });
        });
      }

      console.log(
        `✅ Migrated ${checkedInCount} CHECKED_IN reservations to IN_HOUSE`
      );
    }

    // Step 4: Create initial status history for existing reservations that don't need migration
    console.log(
      "🔄 Creating initial status history for existing reservations..."
    );

    const existingReservations = await prisma.reservation.findMany({
      where: {
        status: {
          in: ["CONFIRMED", "CANCELLED", "CHECKED_OUT", "NO_SHOW"]
        },
        statusHistory: {
          none: {} // Only reservations without any status history
        }
      },
      select: { id: true, status: true, createdAt: true }
    });

    for (const reservation of existingReservations) {
      await prisma.reservationStatusHistory.create({
        data: {
          reservationId: reservation.id,
          previousStatus: null, // No previous status for initial entry
          newStatus: reservation.status,
          changedBy: "system-migration",
          changeReason: "Initial status history entry for existing reservation",
          changedAt: reservation.createdAt,
          isAutomatic: true
        }
      });
    }

    console.log(
      `✅ Created initial status history for ${existingReservations.length} existing reservations`
    );

    // Step 5: Verify migration
    console.log("🔍 Verifying migration...");

    const finalCounts = {
      CONFIRMATION_PENDING: await prisma.reservation.count({
        where: { status: "CONFIRMATION_PENDING" }
      }),
      CONFIRMED: await prisma.reservation.count({
        where: { status: "CONFIRMED" }
      }),
      IN_HOUSE: await prisma.reservation.count({
        where: { status: "IN_HOUSE" }
      }),
      CHECKED_OUT: await prisma.reservation.count({
        where: { status: "CHECKED_OUT" }
      }),
      NO_SHOW: await prisma.reservation.count({
        where: { status: "NO_SHOW" }
      }),
      CANCELLED: await prisma.reservation.count({
        where: { status: "CANCELLED" }
      }),
      // Check for any remaining old statuses
      PENDING: await prisma.reservation.count({
        where: { status: "PENDING" as unknown as ReservationStatus }
      }),
      CHECKED_IN: await prisma.reservation.count({
        where: { status: "CHECKED_IN" as unknown as ReservationStatus }
      })
    };

    console.log("📊 Final status counts:");
    Object.entries(finalCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    if (finalCounts.PENDING > 0 || finalCounts.CHECKED_IN > 0) {
      console.warn(
        "⚠️  Warning: Some reservations still have old status values!"
      );
    } else {
      console.log(
        "✅ All reservations successfully migrated to new status values!"
      );
    }

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  migrateReservationStatus()
    .then(() => {
      console.log("✅ Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration script failed:", error);
      process.exit(1);
    });
}

export default migrateReservationStatus;
