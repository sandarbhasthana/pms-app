// File: src/script/migrate-pricing-to-roomtype.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RoomWithPricing {
  id: string;
  roomTypeId: string | null;
  pricing: {
    id: string;
    basePrice: number;
    weekdayPrice: number | null;
    weekendPrice: number | null;
    currency: string;
    availability: number | null;
    minLOS: number | null;
    maxLOS: number | null;
    closedToArrival: boolean;
    closedToDeparture: boolean;
  } | null;
}

interface RoomTypePricing {
  basePrice: number;
  weekdayPrice: number | null;
  weekendPrice: number | null;
  currency: string;
  availability: number | null;
  minLOS: number | null;
  maxLOS: number | null;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  count: number;
}

async function main() {
  console.log("🔄 Starting pricing migration from RoomPricing to RoomType...");

  try {
    // Get all rooms with their pricing and room type
    const roomsWithPricing: RoomWithPricing[] = await prisma.room.findMany({
      include: {
        pricing: true
      }
    });

    console.log(`📊 Found ${roomsWithPricing.length} rooms to analyze`);

    // Group rooms by room type and analyze pricing patterns
    const roomTypeGroups = new Map<string, RoomWithPricing[]>();
    
    for (const room of roomsWithPricing) {
      if (room.roomTypeId && room.pricing) {
        if (!roomTypeGroups.has(room.roomTypeId)) {
          roomTypeGroups.set(room.roomTypeId, []);
        }
        roomTypeGroups.get(room.roomTypeId)!.push(room);
      }
    }

    console.log(`📋 Found ${roomTypeGroups.size} room types with pricing data`);

    // Process each room type
    for (const [roomTypeId, rooms] of roomTypeGroups) {
      console.log(`\n🏨 Processing room type: ${roomTypeId}`);
      console.log(`   Rooms with pricing: ${rooms.length}`);

      // Calculate the most common pricing for this room type
      const pricingCounts = new Map<string, RoomTypePricing>();

      for (const room of rooms) {
        if (!room.pricing) continue;

        const pricingKey = JSON.stringify({
          basePrice: room.pricing.basePrice,
          weekdayPrice: room.pricing.weekdayPrice,
          weekendPrice: room.pricing.weekendPrice,
          currency: room.pricing.currency,
          availability: room.pricing.availability,
          minLOS: room.pricing.minLOS,
          maxLOS: room.pricing.maxLOS,
          closedToArrival: room.pricing.closedToArrival,
          closedToDeparture: room.pricing.closedToDeparture
        });

        if (pricingCounts.has(pricingKey)) {
          pricingCounts.get(pricingKey)!.count++;
        } else {
          pricingCounts.set(pricingKey, {
            basePrice: room.pricing.basePrice,
            weekdayPrice: room.pricing.weekdayPrice,
            weekendPrice: room.pricing.weekendPrice,
            currency: room.pricing.currency,
            availability: room.pricing.availability,
            minLOS: room.pricing.minLOS,
            maxLOS: room.pricing.maxLOS,
            closedToArrival: room.pricing.closedToArrival,
            closedToDeparture: room.pricing.closedToDeparture,
            count: 1
          });
        }
      }

      // Find the most common pricing
      let mostCommonPricing: RoomTypePricing | null = null;
      let maxCount = 0;

      for (const pricing of pricingCounts.values()) {
        if (pricing.count > maxCount) {
          maxCount = pricing.count;
          mostCommonPricing = pricing;
        }
      }

      if (mostCommonPricing) {
        console.log(`   Most common pricing (${maxCount}/${rooms.length} rooms):`);
        console.log(`   Base: ${mostCommonPricing.basePrice} ${mostCommonPricing.currency}`);
        
        // Update the room type with the most common pricing
        await prisma.roomType.update({
          where: { id: roomTypeId },
          data: {
            basePrice: mostCommonPricing.basePrice,
            weekdayPrice: mostCommonPricing.weekdayPrice,
            weekendPrice: mostCommonPricing.weekendPrice,
            currency: mostCommonPricing.currency,
            availability: mostCommonPricing.availability,
            minLOS: mostCommonPricing.minLOS,
            maxLOS: mostCommonPricing.maxLOS,
            closedToArrival: mostCommonPricing.closedToArrival,
            closedToDeparture: mostCommonPricing.closedToDeparture
          }
        });

        // Remove RoomPricing records for rooms that match the room type pricing
        const roomsToCleanup: string[] = [];
        
        for (const room of rooms) {
          if (!room.pricing) continue;

          const roomPricingMatches = 
            room.pricing.basePrice === mostCommonPricing.basePrice &&
            room.pricing.weekdayPrice === mostCommonPricing.weekdayPrice &&
            room.pricing.weekendPrice === mostCommonPricing.weekendPrice &&
            room.pricing.currency === mostCommonPricing.currency &&
            room.pricing.availability === mostCommonPricing.availability &&
            room.pricing.minLOS === mostCommonPricing.minLOS &&
            room.pricing.maxLOS === mostCommonPricing.maxLOS &&
            room.pricing.closedToArrival === mostCommonPricing.closedToArrival &&
            room.pricing.closedToDeparture === mostCommonPricing.closedToDeparture;

          if (roomPricingMatches) {
            roomsToCleanup.push(room.pricing.id);
          }
        }

        if (roomsToCleanup.length > 0) {
          await prisma.roomPricing.deleteMany({
            where: {
              id: { in: roomsToCleanup }
            }
          });
          console.log(`   ✅ Removed ${roomsToCleanup.length} redundant RoomPricing records`);
        }

        const remainingOverrides = rooms.length - roomsToCleanup.length;
        if (remainingOverrides > 0) {
          console.log(`   📝 Kept ${remainingOverrides} individual room pricing overrides`);
        }
      }
    }

    console.log("\n🎉 Pricing migration completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`- Processed ${roomTypeGroups.size} room types`);
    console.log("- Room type base pricing has been set");
    console.log("- Redundant individual room pricing has been removed");
    console.log("- Individual pricing overrides have been preserved");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
});
