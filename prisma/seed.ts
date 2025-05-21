// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Create a default organization
  const org = await prisma.organization.upsert({
    where: { domain: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      domain: 'default',
    },
  });

  // 2. Create a super-admin user
  const user = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      name: 'Super Admin',
    },
  });

  // 3. Link user to org with SUPER_ADMIN role
  await prisma.userOrg.upsert({
    where: {
      userId_organizationId: { userId: user.id, organizationId: org.id }
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: UserRole.SUPER_ADMIN,
    },
  });

  console.log('✅ Seeded default org and super-admin user.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
