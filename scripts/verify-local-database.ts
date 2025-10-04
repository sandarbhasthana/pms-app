/**
 * Verify Local Database Connection and Data
 */

import { prisma } from "../src/lib/prisma";

async function verifyLocalDatabase() {
  console.log("🔍 Verifying local database connection and data...\n");

  try {
    // Test basic connection
    console.log("📡 Testing database connection...");
    await prisma.$connect();
    console.log("✅ Database connection successful");

    // Check organizations
    const orgCount = await prisma.organization.count();
    console.log(`📊 Organizations: ${orgCount}`);

    if (orgCount > 0) {
      const orgs = await prisma.organization.findMany({
        include: {
          properties: {
            select: {
              id: true,
              name: true,
              isDefault: true
            }
          }
        }
      });

      orgs.forEach(org => {
        console.log(`  🏢 ${org.name}`);
        console.log(`     Properties (${org.properties.length}):`);
        org.properties.forEach(prop => {
          console.log(`       - ${prop.name} ${prop.isDefault ? '(Default)' : ''}`);
        });
      });
    }

    // Check users
    const userCount = await prisma.user.count();
    console.log(`\n👥 Users: ${userCount}`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          email: true,
          name: true
        },
        take: 5
      });

      console.log("Sample users:");
      users.forEach(user => {
        console.log(`  👤 ${user.email}`);
      });
    }

    // Check reservations
    const reservationCount = await prisma.reservation.count();
    console.log(`\n📅 Reservations: ${reservationCount}`);

    console.log("\n🎉 Local database verification complete!");

  } catch (error) {
    console.error("❌ Database verification failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLocalDatabase().catch(console.error);
