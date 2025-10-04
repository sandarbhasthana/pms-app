/**
 * Test ReservationStatusHistory Model
 * 
 * Tests the new ReservationStatusHistory table and model functionality
 */

import { prisma } from "../src/lib/prisma";

async function testStatusHistoryModel() {
  console.log("🧪 Testing ReservationStatusHistory model...\n");

  try {
    // Check if the table exists and its structure
    console.log("📋 Checking table structure...");
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'ReservationStatusHistory' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    console.log("✅ ReservationStatusHistory table structure:");
    (tableInfo as any[]).forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Get a test reservation
    console.log("\n🔍 Finding test reservation...");
    const reservation = await prisma.reservation.findFirst({
      where: {
        guestName: {
          startsWith: "Payment Test"
        }
      }
    });

    if (!reservation) {
      console.log("⚠️  No test reservation found. Please run create-payment-test-data.ts first.");
      return;
    }

    console.log(`📋 Using reservation: ${reservation.id} (${reservation.guestName})`);
    console.log(`📊 Current status: ${reservation.status}`);

    // Test creating a status history record
    console.log("\n🧪 Testing record creation...");
    const statusHistory = await prisma.reservationStatusHistory.create({
      data: {
        reservationId: reservation.id,
        previousStatus: "CONFIRMATION_PENDING",
        newStatus: "CONFIRMED",
        changedBy: "payment-processor",
        changeReason: "Payment received - auto-confirmation test",
        isAutomatic: true
      }
    });

    console.log("✅ Status history record created:");
    console.log(`  - ID: ${statusHistory.id}`);
    console.log(`  - Previous: ${statusHistory.previousStatus}`);
    console.log(`  - New: ${statusHistory.newStatus}`);
    console.log(`  - Changed By: ${statusHistory.changedBy}`);
    console.log(`  - Reason: ${statusHistory.changeReason}`);
    console.log(`  - Automatic: ${statusHistory.isAutomatic}`);
    console.log(`  - Changed At: ${statusHistory.changedAt}`);

    // Test querying status history
    console.log("\n📊 Testing queries...");
    const historyRecords = await prisma.reservationStatusHistory.findMany({
      where: {
        reservationId: reservation.id
      },
      orderBy: {
        changedAt: "desc"
      }
    });

    console.log(`✅ Found ${historyRecords.length} history records for this reservation`);

    // Test with reservation relation
    console.log("\n🔗 Testing relations...");
    const historyWithReservation = await prisma.reservationStatusHistory.findMany({
      where: {
        reservationId: reservation.id
      },
      include: {
        reservation: {
          select: {
            guestName: true,
            status: true
          }
        }
      }
    });

    console.log("✅ History with reservation data:");
    historyWithReservation.forEach((record, i) => {
      console.log(`  ${i + 1}. ${record.previousStatus} → ${record.newStatus} (${record.reservation.guestName})`);
    });

    // Test filtering by status
    console.log("\n🔍 Testing status filtering...");
    const confirmedRecords = await prisma.reservationStatusHistory.findMany({
      where: {
        newStatus: "CONFIRMED"
      },
      take: 5
    });

    console.log(`✅ Found ${confirmedRecords.length} records with CONFIRMED status`);

    // Test automatic vs manual changes
    const automaticChanges = await prisma.reservationStatusHistory.count({
      where: {
        isAutomatic: true
      }
    });

    const manualChanges = await prisma.reservationStatusHistory.count({
      where: {
        isAutomatic: false
      }
    });

    console.log(`📊 Change statistics:`);
    console.log(`  - Automatic changes: ${automaticChanges}`);
    console.log(`  - Manual changes: ${manualChanges}`);

    // Clean up test record
    await prisma.reservationStatusHistory.delete({
      where: { id: statusHistory.id }
    });
    console.log("\n🧹 Test record cleaned up");

    console.log("\n🎉 ReservationStatusHistory model test completed successfully!");

  } catch (error) {
    console.error("❌ Error testing ReservationStatusHistory:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testStatusHistoryModel().catch(console.error);
