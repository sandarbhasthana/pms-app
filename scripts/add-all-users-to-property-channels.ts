/**
 * Add All Organization Users to Property Channels
 * 
 * This script adds all users in an organization to all property channels
 * in that organization (not just users assigned to that specific property)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Adding all org users to property channels...\n');

  // Get all organizations
  const organizations = await prisma.organization.findMany();

  for (const org of organizations) {
    console.log(`\n🏢 Processing organization: ${org.name}`);

    // Get all users in this organization
    const orgUsers = await prisma.userOrg.findMany({
      where: { organizationId: org.id },
      select: { userId: true },
    });

    const userIds = orgUsers.map((u) => u.userId);
    console.log(`   Found ${userIds.length} users in organization`);

    // Get all property channels in this organization
    const propertyChannels = await prisma.chatRoom.findMany({
      where: {
        organizationId: org.id,
        type: 'PROPERTY',
      },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    console.log(`   Found ${propertyChannels.length} property channel(s)`);

    // Add all org users to each property channel
    for (const channel of propertyChannels) {
      console.log(`\n   📢 Channel: ${channel.name}`);
      
      const existingParticipantIds = channel.participants.map((p) => p.userId);
      const newUserIds = userIds.filter((id) => !existingParticipantIds.includes(id));

      if (newUserIds.length === 0) {
        console.log(`      ✅ All users already participants`);
        continue;
      }

      console.log(`      Adding ${newUserIds.length} new participant(s)...`);

      await prisma.chatParticipant.createMany({
        data: newUserIds.map((userId) => ({
          roomId: channel.id,
          userId,
        })),
        skipDuplicates: true,
      });

      console.log(`      ✅ Added ${newUserIds.length} participant(s)`);
    }
  }

  console.log('\n\n✅ Complete! All organization users added to property channels.');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

