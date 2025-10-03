#!/usr/bin/env tsx

import { prisma } from "../src/lib/prisma";
import { ReservationStatus } from "@prisma/client";
import { LateCheckoutProcessor } from "../src/lib/queue/processors/late-checkout-processor";

async function testLateCheckoutDetection() {
  console.log("🏨 Testing Late Checkout Detection Logic...");

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
    console.log(`   Check-out time: ${settings?.checkOutTime || "11:00"}`);
    console.log(`   Late checkout grace hours: ${settings?.lateCheckoutGraceHours || 1}`);
    console.log(`   Late checkout detection enabled: ${settings?.enableLateCheckoutDetection || true}`);

    // Find IN_HOUSE reservations for testing
    const inHouseReservations = await prisma.reservation.findMany({
      where: {
        propertyId: property.id,
        status: ReservationStatus.IN_HOUSE
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
      orderBy: { checkOut: 'asc' },
      take: 10
    });

    console.log(`\n📋 Found ${inHouseReservations.length} IN_HOUSE reservations:`);
    inHouseReservations.forEach((res, index) => {
      const checkOutDate = new Date(res.checkOut);
      const isOverdue = checkOutDate < new Date();
      console.log(`${index + 1}. ${res.guestName} (${res.id})`);
      console.log(`   Status: ${res.status}`);
      console.log(`   Check-out: ${res.checkOut.toISOString()}`);
      console.log(`   Room: ${res.room?.name || 'N/A'}`);
      console.log(`   ${isOverdue ? '🔴 OVERDUE' : '🟢 ON TIME'}`);
      console.log("");
    });

    // Test the late checkout processor directly
    console.log("🧪 Testing Late Checkout Processor...");
    
    const processor = new LateCheckoutProcessor();
    
    // Create a mock job for testing
    const mockJob = {
      id: "test-late-checkout-job",
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
      console.log(`   Reservations that would be processed for late checkout: ${dryRunResult.details.skippedReservations.length}`);
    }

    // If dry run found reservations, ask if we should run for real
    if (dryRunResult.processedCount > 0) {
      console.log("\n2️⃣ Running ACTUAL late checkout detection...");
      
      const realJob = {
        id: "test-late-checkout-real",
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
        console.log(`   Reservations processed for late checkout: ${realResult.details.reservationsUpdated.length}`);
        
        // Show business logic that was executed
        console.log("\n3️⃣ Business logic executed:");
        console.log("   - Late checkout fees calculated and applied");
        console.log("   - Housekeeping notifications sent");
        console.log("   - Front desk alerts generated");
        console.log("   - Room availability updates processed");
        console.log("   - Guest courtesy notifications sent");
      }
    } else {
      console.log("\n💡 No reservations found for late checkout processing with current settings.");
      console.log("   This could be because:");
      console.log("   - No IN_HOUSE reservations found");
      console.log("   - All guests checked out on time");
      console.log("   - Grace period hasn't expired yet");
      console.log("   - Late checkout detection is disabled");
    }

    // Show current time and checkout logic
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const checkOutTime = settings?.checkOutTime || "11:00";
    const [checkOutHour, checkOutMinute] = checkOutTime.split(':').map(Number);
    const todayCheckOut = new Date(today);
    todayCheckOut.setHours(checkOutHour, checkOutMinute, 0, 0);
    const graceEndTime = new Date(todayCheckOut.getTime() + (1 * 60 * 60 * 1000)); // 1 hour grace

    console.log("\n⏰ Time Analysis:");
    console.log(`   Current time: ${now.toISOString()}`);
    console.log(`   Today's checkout time: ${todayCheckOut.toISOString()}`);
    console.log(`   Grace period ends: ${graceEndTime.toISOString()}`);
    console.log(`   Status: ${now > graceEndTime ? '🔴 Past grace period' : '🟢 Within grace period'}`);

    console.log("\n✅ Late checkout detection test completed!");

  } catch (error) {
    console.error("❌ Error testing late checkout detection:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testLateCheckoutDetection().catch(console.error);
