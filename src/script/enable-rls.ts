// File: src/script/enable-rls.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const statements = [
    `ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY "Tenant can access own rooms"
     ON "Room"
     USING ("organizationId" = current_setting('app.organization_id'))`,

    `ALTER TABLE "Reservation" ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY "Tenant can access own reservations"
     ON "Reservation"
     USING ("organizationId" = current_setting('app.organization_id'))`,

    `ALTER TABLE "Channel" ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY "Tenant can access own channels"
     ON "Channel"
     USING ("organizationId" = current_setting('app.organization_id'))`,

    `ALTER TABLE "UserOrg" ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY "Tenant can access own user-org memberships"
     ON "UserOrg"
     USING ("organizationId" = current_setting('app.organization_id'))`
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ Executed: ${sql.split("\n")[0]}`);
    } catch (err: unknown) {
      console.error(
        "❌ Error:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  await prisma.$disconnect();
}

main();
