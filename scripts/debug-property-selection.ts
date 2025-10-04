/**
 * Debug Property Selection Issue
 *
 * Tests the property selection flow and identifies redirect issues
 */

import { prisma } from "../src/lib/prisma";

async function debugPropertySelection() {
  console.log("🔍 Debugging property selection flow...\n");

  try {
    // Check if we have test users and properties
    console.log("📋 Checking test data...");

    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                properties: true
              }
            }
          }
        }
      }
    });

    console.log(`✅ Found ${users.length} users`);

    // Find a user with multiple properties
    const userWithMultipleProperties = users.find((user) =>
      user.memberships.some(
        (membership) => membership.organization.properties.length > 1
      )
    );

    if (userWithMultipleProperties) {
      console.log(`\n🎯 Testing user: ${userWithMultipleProperties.email}`);

      const membership = userWithMultipleProperties.memberships[0];
      const properties = membership.organization.properties;

      console.log(`📋 Available properties (${properties.length}):`);
      properties.forEach((prop, i) => {
        console.log(
          `  ${i + 1}. ${prop.name} (${prop.id}) - Default: ${prop.isDefault}`
        );
      });

      // Simulate property selection
      const selectedProperty = properties[0];
      console.log(`\n🏠 Simulating selection of: ${selectedProperty.name}`);

      console.log("🍪 Cookies that would be set:");
      console.log(`  - orgId=${membership.organizationId}`);
      console.log(`  - propertyId=${selectedProperty.id}`);

      // Check what the middleware would see
      console.log("\n🔍 Middleware would see:");
      console.log(`  - token.orgId: ${membership.organizationId}`);
      console.log(`  - token.propertyCount: ${properties.length}`);
      console.log(`  - propertyIdCookie: ${selectedProperty.id}`);
      console.log(`  - orgIdCookie: ${membership.organizationId}`);

      // Determine middleware behavior
      if (properties.length > 1) {
        const hasPropertyCookie = true; // Simulated
        const hasOrgCookie = true; // Simulated

        if (hasPropertyCookie && hasOrgCookie) {
          console.log("✅ Middleware should ALLOW dashboard access");
        } else {
          console.log("❌ Middleware would REDIRECT to property selector");
        }
      }
    } else {
      console.log("⚠️  No user with multiple properties found");
    }

    // Check for single property users
    const singlePropertyUser = users.find((user) =>
      user.memberships.some(
        (membership) => membership.organization.properties.length === 1
      )
    );

    if (singlePropertyUser) {
      console.log(`\n🎯 Single property user: ${singlePropertyUser.email}`);
      const membership = singlePropertyUser.memberships[0];
      const property = membership.organization.properties[0];

      console.log(`📋 Single property: ${property.name} (${property.id})`);
      console.log("✅ Middleware should auto-redirect to dashboard");
    }
  } catch (error) {
    console.error("❌ Error debugging property selection:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPropertySelection().catch(console.error);
