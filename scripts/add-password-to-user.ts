// Script to add password to existing user for testing standard login

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function addPasswordToUser() {
  console.log(
    "🔐 Adding password to existing user for standard login testing...\n"
  );

  try {
    // Find an existing ORG_ADMIN user
    const existingUser = await prisma.user.findFirst({
      include: {
        memberships: {
          where: {
            role: "ORG_ADMIN"
          },
          include: {
            organization: true
          }
        }
      }
    });

    if (!existingUser || existingUser.memberships.length === 0) {
      console.log(
        "❌ No ORG_ADMIN user found. Creating a test organization first..."
      );

      // Create test organization and admin user
      const result = await prisma.$transaction(async (tx) => {
        // Create organization
        const organization = await tx.organization.create({
          data: {
            name: "Test Hotel Chain",
            domain: "testhotelchain"
          }
        });

        // Create admin user
        const adminUser = await tx.user.create({
          data: {
            name: "Test Admin",
            email: "admin@testhotelchain.com",
            phone: "+1 (555) 123-4567"
          }
        });

        // Create user-organization relationship
        const userOrg = await tx.userOrg.create({
          data: {
            userId: adminUser.id,
            organizationId: organization.id,
            role: "ORG_ADMIN"
          }
        });

        return { organization, adminUser, userOrg };
      });

      console.log(`✅ Created test organization: ${result.organization.name}`);
      console.log(`✅ Created admin user: ${result.adminUser.email}`);

      // Now add password to this user
      const testPassword = "TestPass123!";
      const hashedPassword = await hash(testPassword, 12);

      // Update user with password (we need to add password field to User model first)
      console.log(`\n⚠️  Note: User model doesn't have password field yet.`);
      console.log(
        `   You can test standard login after adding password field to schema.`
      );
      console.log(`   Test credentials would be:`);
      console.log(`   Email: ${result.adminUser.email}`);
      console.log(`   Password: ${testPassword}`);

      return;
    }

    // Add password to existing user
    const testPassword = "TestPass123!";
    const hashedPassword = await hash(testPassword, 12);

    console.log(`Found existing ORG_ADMIN user: ${existingUser.email}`);
    console.log(
      `Organization: ${existingUser.memberships[0].organization.name}`
    );

    // Add password to existing user
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { password: hashedPassword }
    });

    console.log(`✅ Password added to user: ${existingUser.email}`);
    console.log(`   Password: ${testPassword}`);
    console.log(
      `   Organization: ${existingUser.memberships[0].organization.name}`
    );
    console.log(`\n🧪 You can now test standard login with these credentials!`);
  } catch (error) {
    console.error("❌ Error adding password to user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addPasswordToUser();
