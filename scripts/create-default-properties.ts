// Script to create default properties for existing organizations
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createDefaultProperties() {
  console.log("🏢 Starting default property creation...");

  try {
    // Get all existing organizations
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        domain: true
      }
    });

    console.log(`📋 Found ${organizations.length} organizations`);

    for (const org of organizations) {
      console.log(`\n🔄 Processing organization: ${org.name} (${org.id})`);

      // Check if organization already has properties
      const existingProperties = await prisma.property.findMany({
        where: { organizationId: org.id }
      });

      if (existingProperties.length > 0) {
        console.log(
          `   ✅ Organization already has ${existingProperties.length} properties, skipping...`
        );
        continue;
      }

      // Create default property for this organization
      const defaultProperty = await prisma.property.create({
        data: {
          // Let Prisma generate proper CUID
          organizationId: org.id,
          name: `${org.name} - Main Property`,
          address: "Default Property Address",
          timezone: "UTC",
          currency: "USD",
          isActive: true,
          isDefault: true // NEW: Mark as default property
        }
      });

      console.log(
        `   ✅ Created default property: ${defaultProperty.name} (${defaultProperty.id})`
      );
    }

    console.log("\n🎉 Default property creation completed successfully!");
  } catch (error) {
    console.error("❌ Error creating default properties:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createDefaultProperties().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
