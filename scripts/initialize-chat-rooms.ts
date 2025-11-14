/**
 * Initialize Chat Rooms for Existing Organizations and Properties
 * 
 * This script creates default chat channels for existing organizations and properties
 * that were created before the chat system was implemented.
 * 
 * Run with: npx tsx scripts/initialize-chat-rooms.ts
 */

import { PrismaClient } from '@prisma/client';
import { createOrgChannel, createPropertyChannel } from '../src/lib/chat/room-service';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting chat room initialization...\n');

  try {
    // 1. Get all organizations
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    console.log(`📋 Found ${organizations.length} organization(s)\n`);

    // 2. Create #company-wide channel for each organization
    for (const org of organizations) {
      console.log(`🏢 Processing organization: ${org.name}`);
      
      try {
        const orgChannel = await createOrgChannel(org.id);
        console.log(`   ✅ Created/verified #company-wide channel (${orgChannel.id})`);
      } catch (error) {
        console.error(`   ❌ Error creating org channel:`, error);
      }
    }

    console.log('\n');

    // 3. Get all properties
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
    });

    console.log(`📋 Found ${properties.length} property/properties\n`);

    // 4. Create #{propertyName}-general channel for each property
    for (const property of properties) {
      console.log(`🏨 Processing property: ${property.name}`);
      
      try {
        const propertyChannel = await createPropertyChannel(property.id);
        const channelName = propertyChannel.name;
        console.log(`   ✅ Created/verified ${channelName} channel (${propertyChannel.id})`);
      } catch (error) {
        console.error(`   ❌ Error creating property channel:`, error);
      }
    }

    console.log('\n');

    // 5. Summary
    const totalRooms = await prisma.chatRoom.count();
    const orgRooms = await prisma.chatRoom.count({ where: { type: 'ORGANIZATION' } });
    const propertyRooms = await prisma.chatRoom.count({ where: { type: 'PROPERTY' } });

    console.log('✅ Chat room initialization complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Total chat rooms: ${totalRooms}`);
    console.log(`   - Organization channels: ${orgRooms}`);
    console.log(`   - Property channels: ${propertyRooms}`);
    console.log(`   - Group/DM rooms: ${totalRooms - orgRooms - propertyRooms}`);

  } catch (error) {
    console.error('❌ Error during initialization:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

