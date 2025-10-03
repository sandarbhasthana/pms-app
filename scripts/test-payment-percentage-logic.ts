/**
 * Test Payment Percentage Logic
 *
 * Tests the updated payment-triggered status updates with percentage-based logic
 */

import { addJobToQueue } from "../src/lib/queue/queues";
import { PaymentStatusJobData } from "../src/lib/queue/types";
import { prisma } from "../src/lib/prisma";

async function testPaymentPercentageLogic() {
  console.log("🧪 Testing Payment Percentage Logic...\n");

  try {
    // Get test reservations
    const testReservations = await prisma.reservation.findMany({
      where: {
        guestName: {
          startsWith: "Payment Test -"
        }
      },
      include: {
        room: {
          include: {
            pricing: true
          }
        },
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

    // Get room pricing for calculations
    const roomPricing = testReservations[0]?.room?.pricing;
    if (!roomPricing) {
      console.error("❌ No room pricing found. Please add room pricing first.");
      return;
    }

    const basePrice = roomPricing.basePrice;
    const totalBookingAmount = basePrice; // 1 night booking
    
    console.log(`💰 Room rate: ₹${basePrice} per night`);
    console.log(`💰 Total booking amount: ₹${totalBookingAmount}\n`);

    // Test scenarios with percentage-based payments
    const testScenarios = [
      {
        name: "Same Day Full Payment (100%)",
        guestName: "Payment Test - Same Day Full",
        paymentAmount: totalBookingAmount, // 100%
        expectedStatus: "CONFIRMED",
        description: `Full payment (₹${totalBookingAmount}) should auto-confirm same-day booking`
      },
      {
        name: "Same Day Deposit Payment (60%)",
        guestName: "Payment Test - Same Day Partial",
        paymentAmount: Math.round(totalBookingAmount * 0.6), // 60%
        expectedStatus: "CONFIRMED",
        description: `Deposit payment (60% = ₹${Math.round(totalBookingAmount * 0.6)}) should auto-confirm`
      },
      {
        name: "Future Full Payment (100%)",
        guestName: "Payment Test - Future Full",
        paymentAmount: totalBookingAmount, // 100%
        expectedStatus: "CONFIRMED",
        description: `Full payment (₹${totalBookingAmount}) should auto-confirm future booking`
      },
      {
        name: "Future Partial Payment (30% - Below Threshold)",
        guestName: "Payment Test - Future Partial",
        paymentAmount: Math.round(totalBookingAmount * 0.3), // 30%
        expectedStatus: "CONFIRMATION_PENDING",
        description: `Partial payment (30% = ₹${Math.round(totalBookingAmount * 0.3)}) should NOT auto-confirm (below 50% threshold)`
      },
      {
        name: "Already Confirmed Additional Payment",
        guestName: "Payment Test - Already Confirmed",
        paymentAmount: Math.round(totalBookingAmount * 0.2), // 20% additional
        expectedStatus: "CONFIRMED",
        description: `Additional payment should keep status as CONFIRMED`
      },
      {
        name: "Automation Disabled (100%)",
        guestName: "Payment Test - Disabled Auto",
        paymentAmount: totalBookingAmount, // 100%
        expectedStatus: "CONFIRMATION_PENDING",
        description: "Should not auto-confirm when automation is disabled"
      }
    ];

    // Execute test scenarios
    for (let i = 0; i < testScenarios.length; i++) {
      const scenario = testScenarios[i];
      const reservation = testReservations.find(r => r.guestName === scenario.guestName);
      
      if (!reservation) {
        console.log(`⚠️  Skipping ${scenario.name} - reservation not found`);
        continue;
      }

      console.log(`\n🧪 Test ${i + 1}: ${scenario.name}`);
      console.log(`📝 ${scenario.description}`);
      console.log(`🏨 Reservation: ${reservation.id} (${reservation.guestName})`);
      console.log(`💰 Payment: ₹${scenario.paymentAmount} (${((scenario.paymentAmount / totalBookingAmount) * 100).toFixed(1)}%)`);
      console.log(`📊 Current Status: ${reservation.status}`);
      console.log(`🎯 Expected Status: ${scenario.expectedStatus}`);

      // Create job data
      const jobData: PaymentStatusJobData = {
        jobType: "payment-status-update",
        propertyId: reservation.propertyId,
        reservationId: reservation.id,
        paymentAmount: scenario.paymentAmount,
        paymentIntentId: `test_pi_${Date.now()}_${i}`,
        timestamp: new Date(),
        triggeredBy: "percentage-test"
      };

      try {
        // Queue the job
        await addJobToQueue(
          "reservation-automation",
          `test-percentage-${i}`,
          jobData,
          { priority: 1 }
        );

        console.log("✅ Job queued successfully");
        
        // Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check result
        const updatedReservation = await prisma.reservation.findUnique({
          where: { id: reservation.id },
          select: { status: true, paidAmount: true }
        });

        if (updatedReservation) {
          const statusMatch = updatedReservation.status === scenario.expectedStatus;
          console.log(`📊 Final Status: ${updatedReservation.status} ${statusMatch ? '✅' : '❌'}`);
          console.log(`💰 Paid Amount: ₹${updatedReservation.paidAmount || 0}`);
          
          if (!statusMatch) {
            console.log(`❌ Expected: ${scenario.expectedStatus}, Got: ${updatedReservation.status}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing ${scenario.name}:`, error);
      }

      // Add delay between tests
      if (i < testScenarios.length - 1) {
        console.log("⏳ Waiting before next test...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log("\n🎉 Payment percentage logic testing completed!");
    console.log("\n📊 Summary:");
    console.log("- Full payments (100%): Should auto-confirm");
    console.log("- Deposit payments (≥50%): Should auto-confirm");
    console.log("- Partial payments (<50%): Should NOT auto-confirm");
    console.log("- Additional payments: Should maintain current status");
    console.log("- Disabled automation: Should never auto-confirm");

  } catch (error) {
    console.error("❌ Error in payment percentage logic test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPaymentPercentageLogic().catch(console.error);
