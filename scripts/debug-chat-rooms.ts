/**
 * Debug Chat Rooms
 * Check which rooms exist and who is a participant
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Debugging chat rooms...\n');

  // Get all chat rooms
  const rooms = await prisma.chatRoom.findMany({
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  console.log(`📋 Found ${rooms.length} chat room(s):\n`);

  for (const room of rooms) {
    console.log(`\n🏠 Room: ${room.name} (${room.type})`);
    console.log(`   ID: ${room.id}`);
    console.log(`   Organization: ${room.organizationId}`);
    console.log(`   Property: ${room.propertyId || 'N/A'}`);
    console.log(`   Participants (${room.participants.length}):`);
    
    for (const participant of room.participants) {
      console.log(`      - ${participant.user.name} (${participant.user.email})`);
    }
  }

  // Get all users
  console.log('\n\n👥 All users in the system:\n');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  for (const user of users) {
    console.log(`   - ${user.name} (${user.email}) - ID: ${user.id}`);
  }

  // Get user-property relationships
  console.log('\n\n🏨 User-Property relationships:\n');
  const userProperties = await prisma.userProperty.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      property: {
        select: {
          name: true,
        },
      },
    },
  });

  for (const up of userProperties) {
    console.log(`   - ${up.user.name} → ${up.property.name}`);
  }
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

