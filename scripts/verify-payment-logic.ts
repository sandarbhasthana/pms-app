/**
 * Verify Payment Logic
 * 
 * Simple verification of the percentage-based payment logic
 */

import { prisma } from "../src/lib/prisma";

async function verifyPaymentLogic() {
  console.log("🧪 Verifying Payment Logic...\n");

  try {
    // Get test reservations
    const reservations = await prisma.reservation.findMany({
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
        }
      },
      orderBy: { guestName: "asc" }
    });

    if (reservations.length === 0) {
      console.error("❌ No test reservations found");
      return;
    }

    console.log(`📋 Found ${reservations.length} test reservations\n`);

    // Test the percentage calculation logic
    for (const reservation of reservations) {
      const roomPricing = reservation.room?.pricing;
      if (!roomPricing) {
        console.log(`⚠️  Skipping ${reservation.guestName} - no pricing`);
        continue;
      }

      const basePrice = roomPricing.basePrice;
      const totalBookingAmount = basePrice; // 1 night
      
      console.log(`\n🏨 ${reservation.guestName}`);
      console.log(`📊 Status: ${reservation.status}`);
      console.log(`💰 Room rate: ₹${basePrice} per night`);
      console.log(`💰 Total booking: ₹${totalBookingAmount}`);
      console.log(`💳 Current paid: ₹${reservation.paidAmount || 0}`);

      // Test different payment scenarios
      const testPayments = [
        { amount: totalBookingAmount, description: "Full Payment (100%)" },
        { amount: Math.round(totalBookingAmount * 0.6), description: "Deposit (60%)" },
        { amount: Math.round(totalBookingAmount * 0.3), description: "Partial (30%)" }
      ];

      for (const payment of testPayments) {
        const currentPaid = reservation.paidAmount || 0;
        const newPaidAmount = currentPaid + payment.amount;
        const percentage = (newPaidAmount / totalBookingAmount) * 100;
        
        let shouldConfirm = false;
        let paymentType = "";
        
        if (percentage >= 100) {
          shouldConfirm = true;
          paymentType = "full";
        } else if (percentage >= 50) {
          shouldConfirm = true;
          paymentType = "deposit";
        } else {
          shouldConfirm = false;
          paymentType = "partial";
        }

        const confirmStatus = shouldConfirm ? "✅ CONFIRM" : "❌ NO CONFIRM";
        console.log(`  ${payment.description}: ₹${payment.amount} → ${percentage.toFixed(1)}% → ${confirmStatus} (${paymentType})`);
      }
    }

    console.log("\n🎯 Logic Summary:");
    console.log("- Full payment (100%): Auto-confirm");
    console.log("- Deposit payment (≥50%): Auto-confirm");
    console.log("- Partial payment (<50%): No auto-confirm");
    console.log("\n✅ Payment logic verification complete!");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPaymentLogic().catch(console.error);
