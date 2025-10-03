#!/usr/bin/env tsx

import { prisma } from "../src/lib/prisma";
import { ReservationStatus, ReservationSource } from "@prisma/client";

async function createCleanupTestData() {
  console.log("🧹 Creating test data for cleanup operations...");

  try {
    // Find a test property
    const property = await prisma.property.findFirst({
      where: { isActive: true },
      include: { rooms: true }
    });

    if (!property || !property.rooms.length) {
      console.error("❌ No active property with rooms found");
      return;
    }

    console.log(`✅ Using property: ${property.name} (${property.id})`);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Test scenarios for cleanup operations
    const testReservations = [
      {
        scenario: "Stale CONFIRMATION_PENDING - should be auto-cancelled",
        guestName: "Stale Pending Guest",
        email: "stale.pending@test.com",
        phone: "+1234567801",
        checkIn: now,
        checkOut: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        status: ReservationStatus.CONFIRMATION_PENDING,
        createdAt: twoDaysAgo, // 2 days old
        amountCaptured: 0,
        depositAmount: 5000
      },
      {
        scenario: "Stale CONFIRMED past check-in - should be marked NO_SHOW",
        guestName: "Missed Checkin Guest",
        email: "missed.checkin@test.com",
        phone: "+1234567802",
        checkIn: yesterday, // Should have checked in yesterday
        checkOut: now,
        status: ReservationStatus.CONFIRMED,
        createdAt: threeDaysAgo,
        amountCaptured: 15000,
        depositAmount: 7500
      },
      {
        scenario: "Stale IN_HOUSE past checkout - should be auto-checked out",
        guestName: "Overstayed Guest",
        email: "overstayed@test.com",
        phone: "+1234567803",
        checkIn: twoDaysAgo,
        checkOut: yesterday, // Should have checked out yesterday
        status: ReservationStatus.IN_HOUSE,
        createdAt: threeDaysAgo,
        checkedInAt: twoDaysAgo,
        amountCaptured: 20000,
        depositAmount: 10000
      },
      {
        scenario: "Normal reservation - should NOT be affected",
        guestName: "Normal Guest",
        email: "normal@test.com",
        phone: "+1234567804",
        checkIn: now,
        checkOut: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        status: ReservationStatus.CONFIRMED,
        createdAt: now,
        amountCaptured: 18000,
        depositAmount: 9000
      },
      {
        scenario: "Automation disabled - should NOT be affected",
        guestName: "Manual Override Guest",
        email: "manual@test.com",
        phone: "+1234567805",
        checkIn: yesterday,
        checkOut: now,
        status: ReservationStatus.CONFIRMED,
        createdAt: threeDaysAgo,
        statusChangeReason: "automation-disabled by staff",
        amountCaptured: 16000,
        depositAmount: 8000
      }
    ];

    const createdReservations = [];

    for (let i = 0; i < testReservations.length; i++) {
      const testData = testReservations[i];
      const room = property.rooms[i % property.rooms.length];

      console.log(`\n📝 Creating: ${testData.scenario}`);

      const reservation = await prisma.reservation.create({
        data: {
          organizationId: property.organizationId,
          propertyId: property.id,
          roomId: room.id,
          guestName: testData.guestName,
          email: testData.email,
          phone: testData.phone,
          checkIn: testData.checkIn,
          checkOut: testData.checkOut,
          status: testData.status,
          source: ReservationSource.WEBSITE,
          adults: 2,
          children: 0,
          amountCaptured: testData.amountCaptured,
          depositAmount: testData.depositAmount,
          statusChangeReason:
            testData.statusChangeReason ||
            "Test reservation for cleanup operations",
          createdAt: testData.createdAt,
          // Set checkedInAt for IN_HOUSE reservations
          ...(testData.checkedInAt && {
            checkedInAt: testData.checkedInAt
          })
        }
      });

      // Create some status history for testing audit archival
      await prisma.reservationStatusHistory.create({
        data: {
          reservationId: reservation.id,
          previousStatus: ReservationStatus.CONFIRMATION_PENDING,
          newStatus: testData.status,
          changeReason: "Initial status set for testing",
          changedBy: "system-test",
          changedAt: testData.createdAt
        }
      });

      createdReservations.push({
        id: reservation.id,
        scenario: testData.scenario,
        guestName: testData.guestName,
        status: testData.status,
        createdAt: testData.createdAt.toISOString(),
        room: room.name
      });

      console.log(
        `✅ Created reservation ${reservation.id} for ${testData.guestName} in ${room.name}`
      );
    }

    // Note: Skipping orphaned records creation due to CASCADE DELETE constraint
    // In a real scenario, orphaned records would occur from external database operations
    console.log(
      "\n📝 Skipping orphaned status history records (CASCADE DELETE prevents creation)"
    );
    const orphanedRecords: string[] = [];

    console.log("\n📊 Cleanup Test Data Summary:");
    console.log("==============================================");
    createdReservations.forEach((res, index) => {
      console.log(`${index + 1}. ${res.guestName} (${res.id})`);
      console.log(`   Status: ${res.status}`);
      console.log(`   Created: ${res.createdAt}`);
      console.log(`   Room: ${res.room}`);
      console.log(`   Scenario: ${res.scenario}`);
      console.log("");
    });

    console.log("🎯 Expected Results After Running Cleanup:");
    console.log("- Stale Pending Guest: Should be CANCELLED (timeout)");
    console.log("- Missed Checkin Guest: Should be NO_SHOW (past check-in)");
    console.log("- Overstayed Guest: Should be CHECKED_OUT (past checkout)");
    console.log("- Normal Guest: Should remain CONFIRMED (no action needed)");
    console.log(
      "- Manual Override Guest: Should remain CONFIRMED (automation disabled)"
    );
    console.log(
      "- Orphaned records cleanup will be tested separately (CASCADE DELETE prevents test data creation)"
    );

    console.log("\n✅ Cleanup test data created successfully!");
    console.log("🚀 Now run the cleanup job to test the logic:");
    console.log("   npx tsx scripts/test-cleanup-operations.ts");
  } catch (error) {
    console.error("❌ Error creating cleanup test data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createCleanupTestData().catch(console.error);
