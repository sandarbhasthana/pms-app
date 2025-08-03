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
     USING ("organizationId" = current_setting('app.organization_id'))`,

    // Add RLS for rates-related tables
    `ALTER TABLE "RoomType" ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY "Tenant can access own room types"
     ON "RoomType"
     USING ("organizationId" = current_setting('app.organization_id'))`,

    `ALTER TABLE "DailyRate" ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY "Tenant can access own daily rates"
     ON "DailyRate"
     USING (EXISTS (
       SELECT 1 FROM "RoomType" rt
       WHERE rt.id = "DailyRate"."roomTypeId"
       AND rt."organizationId" = current_setting('app.organization_id')
     ))`,

    `ALTER TABLE "RateChangeLog" ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY "Tenant can access own rate change logs"
     ON "RateChangeLog"
     USING (EXISTS (
       SELECT 1 FROM "RoomType" rt
       WHERE rt.id = "RateChangeLog"."roomTypeId"
       AND rt."organizationId" = current_setting('app.organization_id')
     ))`,

    `ALTER TABLE "SeasonalRate" ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY "Tenant can access own seasonal rates"
     ON "SeasonalRate"
     USING (
       "roomTypeId" IS NULL OR EXISTS (
         SELECT 1 FROM "RoomType" rt
         WHERE rt.id = "SeasonalRate"."roomTypeId"
         AND rt."organizationId" = current_setting('app.organization_id')
       )
     )`,

    `ALTER TABLE "RoomPricing" ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY "Tenant can access own room pricing"
     ON "RoomPricing"
     USING (EXISTS (
       SELECT 1 FROM "Room" r
       WHERE r.id = "RoomPricing"."roomId"
       AND r."organizationId" = current_setting('app.organization_id')
     ))`
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
