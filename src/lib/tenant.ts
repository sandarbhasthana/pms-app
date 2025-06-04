// File: src/lib/tenant.ts
import { prisma } from "./prisma";

export async function withTenantContext<T>(
  orgId: string,
  fn: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  // apply the RLS setting
  await prisma.$executeRawUnsafe(`SET app.organization_id = '${orgId}'`);
  // run the user's queries under that context
  return fn(prisma);
}
