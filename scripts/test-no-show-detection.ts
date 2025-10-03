#!/usr/bin/env tsx

import { prisma } from "../src/lib/prisma";
import { ReservationStatus } from "@prisma/client";
import { NoShowProcessor } from "../src/lib/queue/processors/no-show-processor";

async function testNoShowDetection() {
  console.log("🔍 Testing No-Show Detection Logic...");

  try {
    // Find the test property
    const property = await prisma.property.findFirst({
      where: { isActive: true },
      include: { settings: true }
    });

    if (!property) {
      console.error("❌ No active property found");
      return;
    }

    console.log(`✅ Using property: ${property.name} (${property.id})`);

    // Get current property settings
    const settings = property.settings;
    console.log(`⚙️ Property Settings:`);
    console.log(`   Check-in time: ${settings?.checkInTime || "15:00"}`);
    console.log(`   No-show grace hours: ${settings?.noShowGraceHours || 6}`);
    console.log(`   No-show detection enabled: ${settings?.enableNoShowDetection || true}`);

    // Find test reservations we created
    const testReservations = await prisma.reservation.findMany({
      where: {
        propertyId: property.id,
        statusChangeReason: "Test reservation for no-show detection"
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📋 Found ${testReservations.length} test reservations:`);
    testReservations.forEach((res, index) => {
      console.log(`${index + 1}. ${res.guestName} (${res.id})`);
      console.log(`   Status: ${res.status}`);
      console.log(`   Check-in: ${res.checkIn.toISOString()}`);
      console.log(`   Room: ${res.room?.name || 'N/A'}`);
      console.log("");
    });

    // Test the no-show processor directly
    console.log("🧪 Testing No-Show Processor...");
    
    const processor = new NoShowProcessor();
    
    // Create a mock job for testing
    const mockJob = {
      id: "test-job",
      data: {
        propertyId: property.id,
        dryRun: true, // Start with dry run
        graceHours: 1 // Use 1 hour grace period for testing
      }
    } as any;

    console.log("\n1️⃣ Running DRY RUN with 1-hour grace period...");
    const dryRunResult = await processor.process(mockJob);
    
    console.log("📊 Dry Run Results:");
    console.log(`   Success: ${dryRunResult.success}`);
    console.log(`   Processed: ${dryRunResult.processedCount}`);
    console.log(`   Errors: ${dryRunResult.errors.length}`);
    
    if (dryRunResult.details.notifications.length > 0) {
      console.log("   Notifications:");
      dryRunResult.details.notifications.forEach(notification => {
        console.log(`     - ${notification}`);
      });
    }

    if (dryRunResult.details.skippedReservations.length > 0) {
      console.log(`   Reservations that would be marked as NO_SHOW: ${dryRunResult.details.skippedReservations.length}`);
    }

    // If dry run found reservations, ask if we should run for real
    if (dryRunResult.processedCount > 0) {
      console.log("\n2️⃣ Running ACTUAL no-show detection...");
      
      const realJob = {
        id: "test-job-real",
        data: {
          propertyId: property.id,
          dryRun: false,
          graceHours: 1
        }
      } as any;

      const realResult = await processor.process(realJob);
      
      console.log("📊 Real Run Results:");
      console.log(`   Success: ${realResult.success}`);
      console.log(`   Processed: ${realResult.processedCount}`);
      console.log(`   Errors: ${realResult.errors.length}`);
      
      if (realResult.details.notifications.length > 0) {
        console.log("   Notifications:");
        realResult.details.notifications.forEach(notification => {
          console.log(`     - ${notification}`);
        });
      }

      if (realResult.details.reservationsUpdated.length > 0) {
        console.log(`   Reservations marked as NO_SHOW: ${realResult.details.reservationsUpdated.length}`);
        
        // Verify the status changes
        console.log("\n3️⃣ Verifying status changes...");
        for (const reservationId of realResult.details.reservationsUpdated) {
          const updatedReservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            select: {
              id: true,
              guestName: true,
              status: true,
              statusChangeReason: true,
              statusUpdatedAt: true
            }
          });
          
          if (updatedReservation) {
            console.log(`✅ ${updatedReservation.guestName}: ${updatedReservation.status}`);
            console.log(`   Reason: ${updatedReservation.statusChangeReason}`);
            console.log(`   Updated: ${updatedReservation.statusUpdatedAt?.toISOString()}`);
          }
        }

        // Check status history
        console.log("\n4️⃣ Checking status history...");
        const statusHistory = await prisma.reservationStatusHistory.findMany({
          where: {
            reservationId: { in: realResult.details.reservationsUpdated },
            newStatus: ReservationStatus.NO_SHOW
          },
          orderBy: { changedAt: 'desc' },
          take: 5
        });

        statusHistory.forEach(history => {
          console.log(`📝 ${history.reservationId}: ${history.previousStatus} → ${history.newStatus}`);
          console.log(`   Changed by: ${history.changedBy || 'system'}`);
          console.log(`   Reason: ${history.changeReason}`);
          console.log(`   Time: ${history.changedAt.toISOString()}`);
          console.log("");
        });
      }
    } else {
      console.log("\n💡 No reservations found for no-show detection with current settings.");
      console.log("   This could be because:");
      console.log("   - All reservations are future bookings");
      console.log("   - Grace period hasn't expired yet");
      console.log("   - No CONFIRMED reservations found");
      console.log("   - Reservations are already checked in or marked as no-show");
    }

    console.log("\n✅ No-show detection test completed!");

  } catch (error) {
    console.error("❌ Error testing no-show detection:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNoShowDetection().catch(console.error);
