// File: src/script/debug-users.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Debugging user data...");

  try {
    // Get all users
    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: {
            organization: true
          }
        }
      }
    });

    console.log(`📊 Found ${users.length} users in database:`);
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Memberships: ${user.memberships.length}`);
      
      user.memberships.forEach((membership, mIndex) => {
        console.log(`     ${mIndex + 1}. Org: ${membership.organization.name} (${membership.organizationId})`);
        console.log(`        Role: ${membership.role}`);
      });
    });

    // Check if there are any rate change logs
    const rateLogs = await prisma.rateChangeLog.findMany({
      take: 5,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        roomType: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n📝 Found ${rateLogs.length} recent rate change logs:`);
    rateLogs.forEach((log, index) => {
      console.log(`\n${index + 1}. Rate Change:`);
      console.log(`   ID: ${log.id}`);
      console.log(`   Room Type: ${log.roomType.name}`);
      console.log(`   New Price: ${log.newPrice}`);
      console.log(`   User: ${log.user.name} (${log.user.email})`);
      console.log(`   User ID: ${log.userId}`);
      console.log(`   Date: ${log.createdAt}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
