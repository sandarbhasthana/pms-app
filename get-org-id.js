const { PrismaClient } = require('@prisma/client');

async function getOrgId() {
  const prisma = new PrismaClient();
  try {
    const org = await prisma.organization.findFirst();
    console.log('Organization ID:', org?.id);
    console.log('Organization Name:', org?.name);
    console.log('Organization Domain:', org?.domain);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getOrgId();
