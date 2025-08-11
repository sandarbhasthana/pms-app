// Script to verify properties and show current state
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyProperties() {
  console.log("🔍 Verifying properties and current state...\n");

  try {
    // Get all organizations with their properties
    const organizations = await prisma.organization.findMany({
      include: {
        properties: true,
        _count: {
          select: {
            roomTypes: true,
            rooms: true,
            reservations: true
          }
        }
      }
    });

    console.log(`📊 Database State Summary:`);
    console.log(`   Organizations: ${organizations.length}`);

    for (const org of organizations) {
      console.log(`\n🏢 Organization: ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Domain: ${org.domain || "N/A"}`);
      console.log(`   Properties: ${org.properties.length}`);
      console.log(`   Room Types: ${org._count.roomTypes}`);
      console.log(`   Rooms: ${org._count.rooms}`);
      console.log(`   Reservations: ${org._count.reservations}`);

      if (org.properties.length > 0) {
        console.log(`   📋 Properties:`);
        for (const property of org.properties) {
          console.log(`      - ${property.name} (${property.id})`);
          console.log(`        Address: ${property.address || "N/A"}`);
          console.log(`        Active: ${property.isActive}`);
          console.log(`        Default: ${property.isDefault}`);
        }
      }
    }

    console.log("\n✅ Verification completed!");
  } catch (error) {
    console.error("❌ Error during verification:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
verifyProperties().catch((error) => {
  console.error("Verification failed:", error);
  process.exit(1);
});
