import { prisma } from '../src/lib/prisma.js';

async function getOrganizationIds() {
  try {
    const org = await prisma.organization.findFirst({
      include: {
        properties: {
          where: { isDefault: true },
          select: { id: true, name: true }
        }
      }
    });
    
    if (org) {
      console.log('✅ Organization ID:', org.id);
      console.log('✅ Organization Name:', org.name);
      if (org.properties[0]) {
        console.log('✅ Default Property ID:', org.properties[0].id);
        console.log('✅ Default Property Name:', org.properties[0].name);
      }
    } else {
      console.log('❌ No organization found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getOrganizationIds();
