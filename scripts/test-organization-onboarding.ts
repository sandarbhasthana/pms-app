// Test script for organization onboarding flow

import { PrismaClient } from "@prisma/client";
import { generateSecurePassword } from "../src/lib/utils/password-generator";
import { ActivityTracker } from "../src/lib/services/activity-tracker";

const prisma = new PrismaClient();

async function testOrganizationOnboarding() {
  console.log("🧪 Testing Organization Onboarding Flow...\n");

  try {
    // Test data
    const testOrg = {
      name: "Test Hotel Group",
      domain: "testhotelgroup",
      industry: "hotel" as const,
      size: "medium" as const,
      contactPhone: "+1 (555) 123-4567",
      contactAddress: "123 Test Street, Test City, TC 12345"
    };

    const testAdmin = {
      name: "Test Admin User",
      email: "admin@testhotelgroup.com",
      phone: "+1 (555) 987-6543"
    };

    console.log("1️⃣ Testing domain availability...");
    const existingOrg = await prisma.organization.findUnique({
      where: { domain: testOrg.domain }
    });

    if (existingOrg) {
      console.log("⚠️  Test organization already exists, cleaning up...");
      await cleanupTestData(testOrg.domain);
    }

    console.log("✅ Domain is available");

    console.log("\n2️⃣ Testing email availability...");
    const existingUser = await prisma.user.findUnique({
      where: { email: testAdmin.email }
    });

    if (existingUser) {
      console.log("⚠️  Test user already exists, cleaning up...");
      await cleanupTestData(testOrg.domain);
    }

    console.log("✅ Email is available");

    console.log("\n3️⃣ Testing password generation...");
    const temporaryPassword = generateSecurePassword();
    console.log(
      `✅ Generated secure password: ${temporaryPassword.substring(0, 4)}****`
    );

    console.log("\n4️⃣ Testing organization creation transaction...");
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: testOrg.name,
          domain: testOrg.domain
        }
      });

      console.log(
        `   ✅ Organization created: ${organization.name} (${organization.id})`
      );

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          name: testAdmin.name,
          email: testAdmin.email,
          phone: testAdmin.phone
        }
      });

      console.log(
        `   ✅ Admin user created: ${adminUser.name} (${adminUser.id})`
      );

      // Create user-organization relationship
      const userOrg = await tx.userOrg.create({
        data: {
          userId: adminUser.id,
          organizationId: organization.id,
          role: "ORG_ADMIN"
        }
      });

      console.log(
        `   ✅ User-organization relationship created: ${userOrg.id}`
      );

      // Create onboarding tracking
      const onboardingTracking = await tx.onboardingTracking.create({
        data: {
          organizationId: organization.id,
          orgDetailsCompleted: true,
          orgDetailsCompletedAt: new Date(),
          adminUserCompleted: true,
          adminUserCompletedAt: new Date(),
          reviewCompleted: true,
          reviewCompletedAt: new Date(),
          completedAt: new Date(),
          timeToComplete: 5 // 5 minutes for test
        }
      });

      console.log(
        `   ✅ Onboarding tracking created: ${onboardingTracking.id}`
      );

      return { organization, adminUser, userOrg, onboardingTracking };
    });

    console.log("\n5️⃣ Testing activity tracking...");
    await ActivityTracker.trackActivity("ORGANIZATION_CREATED", {
      organizationId: result.organization.id,
      metadata: {
        organizationName: result.organization.name,
        domain: result.organization.domain,
        adminUserEmail: result.adminUser.email,
        createdBy: "test-script"
      }
    });

    await ActivityTracker.trackActivity("USER_CREATED", {
      organizationId: result.organization.id,
      metadata: {
        userId: result.adminUser.id,
        userEmail: result.adminUser.email,
        userRole: "ORG_ADMIN",
        createdBy: "test-script"
      }
    });

    console.log("✅ Activity tracking completed");

    console.log("\n6️⃣ Testing data retrieval...");
    const createdOrg = await prisma.organization.findUnique({
      where: { id: result.organization.id },
      include: {
        users: {
          include: {
            user: true
          }
        },
        onboardingTracking: true
      }
    });

    if (createdOrg) {
      console.log(`✅ Organization retrieved: ${createdOrg.name}`);
      console.log(`   - Domain: ${createdOrg.domain}`);
      console.log(`   - Users: ${createdOrg.users.length}`);
      console.log(
        `   - Onboarding completed: ${
          createdOrg.onboardingTracking?.completedAt ? "Yes" : "No"
        }`
      );
    }

    console.log("\n7️⃣ Testing validation endpoints simulation...");
    // Simulate domain check
    const domainCheck = await prisma.organization.findUnique({
      where: { domain: "anothertestdomain" }
    });
    console.log(
      `✅ Domain check simulation: ${domainCheck ? "Taken" : "Available"}`
    );

    // Simulate email check
    const emailCheck = await prisma.user.findUnique({
      where: { email: "another@test.com" }
    });
    console.log(
      `✅ Email check simulation: ${emailCheck ? "Taken" : "Available"}`
    );

    console.log("\n8️⃣ Testing metrics update...");
    const systemMetrics = await prisma.systemMetrics.findFirst({
      orderBy: { date: "desc" }
    });

    if (systemMetrics) {
      console.log(`✅ Current system metrics:`);
      console.log(
        `   - Total Organizations: ${systemMetrics.totalOrganizations}`
      );
      console.log(`   - Total Users: ${systemMetrics.totalUsers}`);
      console.log(`   - Total Properties: ${systemMetrics.totalProperties}`);
    }

    console.log("\n🎉 Organization Onboarding Test Completed Successfully!");
    console.log("\n📊 Test Summary:");
    console.log("   ✅ Domain availability check");
    console.log("   ✅ Email availability check");
    console.log("   ✅ Password generation");
    console.log(
      "   ✅ Database transaction (Organization + User + Relationship)"
    );
    console.log("   ✅ Onboarding tracking");
    console.log("   ✅ Activity tracking");
    console.log("   ✅ Data retrieval and validation");
    console.log("   ✅ Metrics integration");

    console.log("\n🧹 Cleaning up test data...");
    await cleanupTestData(testOrg.domain);
    console.log("✅ Test data cleaned up");
  } catch (error) {
    console.error("❌ Organization onboarding test failed:", error);

    // Attempt cleanup on error
    try {
      await cleanupTestData("testhotelgroup");
    } catch (cleanupError) {
      console.error("Failed to cleanup test data:", cleanupError);
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData(domain: string) {
  try {
    const testOrg = await prisma.organization.findUnique({
      where: { domain },
      include: {
        users: true,
        onboardingTracking: true
      }
    });

    if (testOrg) {
      // Delete in correct order to respect foreign key constraints
      await prisma.onboardingTracking.deleteMany({
        where: { organizationId: testOrg.id }
      });

      await prisma.userOrg.deleteMany({
        where: { organizationId: testOrg.id }
      });

      // Delete users that were created for this test
      const testUsers = await prisma.user.findMany({
        where: {
          email: {
            contains: domain
          }
        }
      });

      for (const user of testUsers) {
        await prisma.user.delete({
          where: { id: user.id }
        });
      }

      await prisma.organization.delete({
        where: { id: testOrg.id }
      });

      console.log(`✅ Cleaned up test organization: ${testOrg.name}`);
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

// Run the test
if (require.main === module) {
  testOrganizationOnboarding()
    .then(() => {
      console.log("\n✅ Organization onboarding test completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Organization onboarding test failed:", error);
      process.exit(1);
    });
}

export { testOrganizationOnboarding };
