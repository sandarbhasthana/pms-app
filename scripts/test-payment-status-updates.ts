/**
 * Test Payment Status Updates
 *
 * Tests the payment-triggered status update system
 */

import { prisma } from "../src/lib/prisma";
import { addJobToQueue } from "../src/lib/queue/queues";
import { PaymentStatusJobData } from "../src/lib/queue/types";
import "../src/lib/queue/workers/automation-worker"; // Initialize worker

async function testPaymentStatusUpdates() {
  console.log("🧪 Testing Payment Status Updates...\n");

  try {
    // Get test reservations
    const testReservations = await prisma.reservation.findMany({
      where: {
        guestName: {
          startsWith: "Payment Test -"
        }
      },
      include: {
        property: {
          include: {
            settings: true
          }
        }
      },
      orderBy: { guestName: "asc" }
    });

    if (testReservations.length === 0) {
      console.error(
        "❌ No test reservations found. Run create-payment-test-data.ts first."
      );
      return;
    }

    console.log(`📋 Found ${testReservations.length} test reservations\n`);

    // Test scenarios with different payment amounts
    const testScenarios = [
      {
        name: "Same Day Full Payment",
        guestName: "Payment Test - Same Day Full",
        paymentAmount: 200.0, // Full payment
        expectedStatus: "CONFIRMED",
        description: "Same-day booking with full payment should auto-confirm"
      },
      {
        name: "Same Day Partial Payment (Above Threshold)",
        guestName: "Payment Test - Same Day Partial",
        paymentAmount: 100.0, // 66.7% of $150 (above 50% threshold)
        expectedStatus: "CONFIRMED",
        description:
          "Same-day booking with payment above threshold should auto-confirm"
      },
      {
        name: "Future Full Payment",
        guestName: "Payment Test - Future Full",
        paymentAmount: 300.0, // Full payment
        expectedStatus: "CONFIRMED",
        description: "Future booking with full payment should auto-confirm"
      },
      {
        name: "Future Partial Payment (Meets Threshold)",
        guestName: "Payment Test - Future Partial",
        paymentAmount: 50.0, // $50 meets the $50 threshold
        expectedStatus: "CONFIRMED",
        description:
          "Future booking with payment meeting threshold should auto-confirm"
      },
      {
        name: "Already Confirmed Additional Payment",
        guestName: "Payment Test - Already Confirmed",
        paymentAmount: 80.0, // Additional payment (total will be $180)
        expectedStatus: "CONFIRMED",
        description: "Already confirmed reservation should stay confirmed"
      },
      {
        name: "Automation Disabled",
        guestName: "Payment Test - Disabled Auto",
        paymentAmount: 120.0, // Full payment
        expectedStatus: "CONFIRMATION_PENDING",
        description: "Property with automation disabled should not auto-confirm"
      }
    ];

    // Execute test scenarios
    for (const scenario of testScenarios) {
      const reservation = testReservations.find(
        (r) => r.guestName === scenario.guestName
      );

      if (!reservation) {
        console.log(`⚠️ Skipping ${scenario.name}: Reservation not found`);
        continue;
      }

      console.log(`\n🔄 Testing: ${scenario.name}`);
      console.log(`   Reservation: ${reservation.id}`);
      console.log(`   Current Status: ${reservation.status}`);
      console.log(`   Payment Amount: $${scenario.paymentAmount}`);
      console.log(`   Expected Status: ${scenario.expectedStatus}`);
      console.log(`   Description: ${scenario.description}`);

      // Create payment status job
      const jobData: PaymentStatusJobData = {
        jobType: "payment-status-update",
        propertyId: reservation.propertyId,
        reservationId: reservation.id,
        paymentAmount: scenario.paymentAmount,
        paymentIntentId: `test_pi_${reservation.id}_${Date.now()}`,
        timestamp: new Date(),
        triggeredBy: "test-script",
        dryRun: false // Set to true for dry-run testing
      };

      try {
        // Add job to queue
        const job = await addJobToQueue(
          "reservation-automation",
          `test-payment-${reservation.id}-${Date.now()}`,
          jobData,
          { priority: 1 }
        );

        console.log(`   ✅ Job queued: ${job.id}`);

        // Wait for job processing
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Check result
        const updatedReservation = await prisma.reservation.findUnique({
          where: { id: reservation.id },
          select: {
            id: true,
            guestName: true,
            status: true,
            paidAmount: true,
            paymentStatus: true,
            statusUpdatedAt: true,
            statusUpdatedBy: true,
            statusChangeReason: true
          }
        });

        if (updatedReservation) {
          const statusMatch =
            updatedReservation.status === scenario.expectedStatus;
          const statusIcon = statusMatch ? "✅" : "❌";

          console.log(
            `   ${statusIcon} Result: ${updatedReservation.status} (Expected: ${scenario.expectedStatus})`
          );
          console.log(
            `   💰 Paid Amount: $${updatedReservation.paidAmount || 0}`
          );

          if (updatedReservation.statusChangeReason) {
            console.log(
              `   📝 Reason: ${updatedReservation.statusChangeReason}`
            );
          }

          if (updatedReservation.statusUpdatedBy) {
            console.log(
              `   👤 Updated By: ${updatedReservation.statusUpdatedBy}`
            );
          }

          if (!statusMatch) {
            console.log(`   ⚠️ Status mismatch! Check business logic.`);
          }
        } else {
          console.log(`   ❌ Failed to retrieve updated reservation`);
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${scenario.name}:`, error);
      }
    }

    // Summary
    console.log("\n📊 Test Summary:");
    const finalReservations = await prisma.reservation.findMany({
      where: {
        guestName: {
          startsWith: "Payment Test -"
        }
      },
      select: {
        guestName: true,
        status: true,
        paidAmount: true,
        paymentStatus: true
      },
      orderBy: { guestName: "asc" }
    });

    finalReservations.forEach((reservation) => {
      const paidAmount = reservation.paidAmount || 0;
      console.log(
        `   ${reservation.guestName}: ${reservation.status} ($${paidAmount} paid)`
      );
    });

    console.log("\n✅ Payment status update testing completed!");
  } catch (error) {
    console.error("❌ Error testing payment status updates:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPaymentStatusUpdates();
