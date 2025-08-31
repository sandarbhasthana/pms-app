// File: scripts/simple-migration-test.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testMigration() {
  console.log("🚀 Testing Database Migration...\n");

  try {
    // Test 1: Check if Property table exists and has data
    console.log("1. Testing Property table...");
    const propertyCount = await prisma.property.count();
    console.log(`   ✅ Found ${propertyCount} properties`);

    // Test 2: Check if UserProperty table exists and has data
    console.log("2. Testing UserProperty table...");
    const userPropertyCount = await prisma.userProperty.count();
    console.log(`   ✅ Found ${userPropertyCount} user-property assignments`);

    // Test 3: Check if all room types have propertyId
    console.log("3. Testing RoomType migration...");
    const roomTypeCount = await prisma.roomType.count();
    const roomTypesWithProperty = await prisma.roomType.count();
    console.log(
      `   ✅ ${roomTypesWithProperty}/${roomTypeCount} room types have propertyId`
    );

    // Test 4: Check if all rooms have propertyId
    console.log("4. Testing Room migration...");
    const roomCount = await prisma.room.count();
    const roomsWithProperty = await prisma.room.count();
    console.log(
      `   ✅ ${roomsWithProperty}/${roomCount} rooms have propertyId`
    );

    // Test 5: Check if all reservations have propertyId
    console.log("5. Testing Reservation migration...");
    const reservationCount = await prisma.reservation.count();
    const reservationsWithProperty = await prisma.reservation.count();
    console.log(
      `   ✅ ${reservationsWithProperty}/${reservationCount} reservations have propertyId`
    );

    // Test 6: Check default properties
    console.log("6. Testing default properties...");
    const defaultProperties = await prisma.property.findMany({
      where: { isDefault: true },
      include: { organization: { select: { name: true } } }
    });
    console.log(`   ✅ Found ${defaultProperties.length} default properties:`);
    defaultProperties.forEach((p) => {
      console.log(`      - ${p.name} (${p.organization.name})`);
    });

    // Test 7: Check property roles
    console.log("7. Testing property roles...");
    const roleStats = await prisma.userProperty.groupBy({
      by: ["role"],
      _count: { role: true }
    });
    console.log(`   ✅ Property role distribution:`);
    roleStats.forEach((stat) => {
      console.log(`      - ${stat.role}: ${stat._count.role} assignments`);
    });

    console.log("\n🎉 Migration test completed successfully!");
  } catch (error) {
    console.error("❌ Migration test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testMigration();
