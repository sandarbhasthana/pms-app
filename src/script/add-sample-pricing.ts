// File: src/script/add-sample-pricing.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🏨 Adding sample pricing to existing room types...");

  try {
    // Get all room types without pricing
    const roomTypes = await prisma.roomType.findMany({
      where: {
        basePrice: null
      },
      include: {
        rooms: true
      }
    });

    console.log(`📊 Found ${roomTypes.length} room types without pricing`);

    if (roomTypes.length === 0) {
      console.log("✅ All room types already have pricing set up");
      return;
    }

    // Add sample pricing based on room type names
    for (const roomType of roomTypes) {
      let basePrice = 100; // Default base price
      let weekdayPrice = null;
      let weekendPrice = null;

      // Set different prices based on room type name
      if (roomType.name.toLowerCase().includes('standard')) {
        basePrice = 80;
        weekdayPrice = 75;
        weekendPrice = 90;
      } else if (roomType.name.toLowerCase().includes('deluxe')) {
        basePrice = 120;
        weekdayPrice = 110;
        weekendPrice = 140;
      } else if (roomType.name.toLowerCase().includes('suite') || roomType.name.toLowerCase().includes('executive')) {
        basePrice = 200;
        weekdayPrice = 180;
        weekendPrice = 250;
      } else if (roomType.name.toLowerCase().includes('presidential')) {
        basePrice = 500;
        weekdayPrice = 450;
        weekendPrice = 600;
      }

      await prisma.roomType.update({
        where: { id: roomType.id },
        data: {
          basePrice,
          weekdayPrice,
          weekendPrice,
          currency: "INR",
          availability: 1,
          minLOS: null,
          maxLOS: null,
          closedToArrival: false,
          closedToDeparture: false
        }
      });

      console.log(`✅ Updated ${roomType.name}: Base ₹${basePrice}, Weekday ₹${weekdayPrice}, Weekend ₹${weekendPrice}`);
    }

    console.log("\n🎉 Sample pricing added successfully!");
    console.log("\n📋 Summary:");
    console.log(`- Updated ${roomTypes.length} room types with base pricing`);
    console.log("- Pricing hierarchy: Room Type → Individual Room → Daily Override");
    console.log("- You can now test the bulk rates update functionality");

  } catch (error) {
    console.error("❌ Failed to add sample pricing:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
