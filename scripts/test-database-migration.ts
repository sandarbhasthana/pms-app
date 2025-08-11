// File: scripts/test-database-migration.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  status: "PASS" | "FAIL" | "WARNING";
  message: string;
  details?: any;
}

class DatabaseMigrationTester {
  private results: TestResult[] = [];

  private addResult(
    test: string,
    status: "PASS" | "FAIL" | "WARNING",
    message: string,
    details?: any
  ) {
    this.results.push({ test, status, message, details });
    const emoji = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️";
    console.log(`${emoji} ${test}: ${message}`);
    if (details) {
      console.log("   Details:", details);
    }
  }

  async testPropertyTableStructure() {
    console.log("\n🔍 Testing Property Table Structure...");

    try {
      // Test if Property table exists and has correct structure
      const properties = await prisma.property.findMany({
        take: 1,
        include: {
          organization: true,
          roomTypes: true,
          rooms: true,
          reservations: true,
          userProperties: true
        }
      });

      this.addResult(
        "Property Table Structure",
        "PASS",
        "Property table exists with all required relationships"
      );

      // Test isDefault field
      const defaultProperties = await prisma.property.findMany({
        where: { isDefault: true }
      });

      this.addResult(
        "Default Properties",
        defaultProperties.length > 0 ? "PASS" : "WARNING",
        `Found ${defaultProperties.length} default properties`
      );
    } catch (error) {
      this.addResult(
        "Property Table Structure",
        "FAIL",
        "Property table structure test failed",
        error
      );
    }
  }

  async testUserPropertyTableStructure() {
    console.log("\n🔍 Testing UserProperty Table Structure...");

    try {
      const userProperties = await prisma.userProperty.findMany({
        take: 1,
        include: {
          user: true,
          property: true
        }
      });

      this.addResult(
        "UserProperty Table Structure",
        "PASS",
        "UserProperty table exists with all required relationships"
      );

      // Test role enum values
      const roleStats = await prisma.userProperty.groupBy({
        by: ["role"],
        _count: { role: true }
      });

      this.addResult(
        "PropertyRole Enum Values",
        roleStats.length > 0 ? "PASS" : "WARNING",
        `Found ${roleStats.length} different property roles`,
        roleStats
      );
    } catch (error) {
      this.addResult(
        "UserProperty Table Structure",
        "FAIL",
        "UserProperty table structure test failed",
        error
      );
    }
  }

  async testDataMigrationIntegrity() {
    console.log("\n🔍 Testing Data Migration Integrity...");

    try {
      // Test that all room types have propertyId
      const roomTypesWithoutProperty = await prisma.roomType.count({
        where: { propertyId: null }
      });

      this.addResult(
        "RoomType PropertyId Migration",
        roomTypesWithoutProperty === 0 ? "PASS" : "FAIL",
        `${roomTypesWithoutProperty} room types without propertyId`
      );

      // Test that all rooms have propertyId
      const roomsWithoutProperty = await prisma.room.count({
        where: { propertyId: null }
      });

      this.addResult(
        "Room PropertyId Migration",
        roomsWithoutProperty === 0 ? "PASS" : "FAIL",
        `${roomsWithoutProperty} rooms without propertyId`
      );

      // Test that all reservations have propertyId
      const reservationsWithoutProperty = await prisma.reservation.count({
        where: { propertyId: null }
      });

      this.addResult(
        "Reservation PropertyId Migration",
        reservationsWithoutProperty === 0 ? "PASS" : "FAIL",
        `${reservationsWithoutProperty} reservations without propertyId`
      );
    } catch (error) {
      this.addResult(
        "Data Migration Integrity",
        "FAIL",
        "Data migration integrity test failed",
        error
      );
    }
  }

  async testForeignKeyConstraints() {
    console.log("\n🔍 Testing Foreign Key Constraints...");

    try {
      // Test Property -> Organization relationship
      const propertiesWithInvalidOrg = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Property" p 
        LEFT JOIN "Organization" o ON p."organizationId" = o.id 
        WHERE o.id IS NULL
      `;

      this.addResult(
        "Property-Organization FK",
        (propertiesWithInvalidOrg as any)[0].count === "0" ? "PASS" : "FAIL",
        `${
          (propertiesWithInvalidOrg as any)[0].count
        } properties with invalid organizationId`
      );

      // Test RoomType -> Property relationship
      const roomTypesWithInvalidProperty = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "RoomType" rt
        LEFT JOIN "Property" p ON rt."propertyId" = p.id
        WHERE rt."propertyId" IS NOT NULL AND p.id IS NULL
      `;

      this.addResult(
        "RoomType-Property FK",
        (roomTypesWithInvalidProperty as any)[0].count === "0"
          ? "PASS"
          : "FAIL",
        `${
          (roomTypesWithInvalidProperty as any)[0].count
        } room types with invalid propertyId`
      );

      // Test Room -> Property relationship
      const roomsWithInvalidProperty = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Room" r
        LEFT JOIN "Property" p ON r."propertyId" = p.id
        WHERE r."propertyId" IS NOT NULL AND p.id IS NULL
      `;

      this.addResult(
        "Room-Property FK",
        (roomsWithInvalidProperty as any)[0].count === "0" ? "PASS" : "FAIL",
        `${
          (roomsWithInvalidProperty as any)[0].count
        } rooms with invalid propertyId`
      );
    } catch (error) {
      this.addResult(
        "Foreign Key Constraints",
        "FAIL",
        "Foreign key constraint test failed",
        error
      );
    }
  }

  async testDataConsistency() {
    console.log("\n🔍 Testing Data Consistency...");

    try {
      // Test that each organization has at least one property
      const orgsWithoutProperties = await prisma.organization.count({
        where: {
          properties: {
            none: {}
          }
        }
      });

      this.addResult(
        "Organizations Have Properties",
        orgsWithoutProperties === 0 ? "PASS" : "WARNING",
        `${orgsWithoutProperties} organizations without properties`
      );

      // Test that each organization has exactly one default property
      const orgsWithMultipleDefaults = await prisma.$queryRaw`
        SELECT o.id, o.name, COUNT(p.id) as default_count
        FROM "Organization" o
        LEFT JOIN "Property" p ON o.id = p."organizationId" AND p."isDefault" = true
        GROUP BY o.id, o.name
        HAVING COUNT(p.id) != 1
      `;

      this.addResult(
        "Default Property Uniqueness",
        (orgsWithMultipleDefaults as any[]).length === 0 ? "PASS" : "WARNING",
        `${
          (orgsWithMultipleDefaults as any[]).length
        } organizations with incorrect default property count`,
        orgsWithMultipleDefaults
      );

      // Test property-level data isolation
      const crossPropertyData = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Room" r
        JOIN "RoomType" rt ON r."roomTypeId" = rt.id
        WHERE r."propertyId" != rt."propertyId"
      `;

      this.addResult(
        "Property Data Isolation",
        (crossPropertyData as any)[0].count === "0" ? "PASS" : "FAIL",
        `${
          (crossPropertyData as any)[0].count
        } rooms with mismatched property relationships`
      );
    } catch (error) {
      this.addResult(
        "Data Consistency",
        "FAIL",
        "Data consistency test failed",
        error
      );
    }
  }

  async testPropertyAccessControl() {
    console.log("\n🔍 Testing Property Access Control...");

    try {
      // Test UserProperty assignments
      const userPropertyCount = await prisma.userProperty.count();

      this.addResult(
        "User Property Assignments",
        userPropertyCount > 0 ? "PASS" : "WARNING",
        `${userPropertyCount} user-property assignments found`
      );

      // Test role distribution
      const roleDistribution = await prisma.userProperty.groupBy({
        by: ["role"],
        _count: { role: true }
      });

      this.addResult(
        "Role Distribution",
        roleDistribution.length > 0 ? "PASS" : "WARNING",
        "Property role distribution looks good",
        roleDistribution
      );
    } catch (error) {
      this.addResult(
        "Property Access Control",
        "FAIL",
        "Property access control test failed",
        error
      );
    }
  }

  async runAllTests() {
    console.log("🚀 Starting Database Migration Tests...\n");

    await this.testPropertyTableStructure();
    await this.testUserPropertyTableStructure();
    await this.testDataMigrationIntegrity();
    await this.testForeignKeyConstraints();
    await this.testDataConsistency();
    await this.testPropertyAccessControl();

    this.printSummary();
  }

  private printSummary() {
    console.log("\n📊 Test Summary:");
    console.log("================");

    const passed = this.results.filter((r) => r.status === "PASS").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;
    const warnings = this.results.filter((r) => r.status === "WARNING").length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📝 Total: ${this.results.length}`);

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.results
        .filter((r) => r.status === "FAIL")
        .forEach((r) => {
          console.log(`   - ${r.test}: ${r.message}`);
        });
    }

    if (warnings > 0) {
      console.log("\n⚠️  Warnings:");
      this.results
        .filter((r) => r.status === "WARNING")
        .forEach((r) => {
          console.log(`   - ${r.test}: ${r.message}`);
        });
    }

    console.log(`\n🎯 Overall Status: ${failed === 0 ? "✅ PASS" : "❌ FAIL"}`);
  }
}

async function main() {
  const tester = new DatabaseMigrationTester();

  try {
    await tester.runAllTests();
  } catch (error) {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { DatabaseMigrationTester };
