/**
 * Chat Room Service
 *
 * Business logic for chat room operations
 */

import { prisma } from "@/lib/prisma";

/**
 * Create organization-wide channel (#company-wide)
 * Called when a new organization is created
 */
export async function createOrgChannel(organizationId: string) {
  // Check if org channel already exists
  const existing = await prisma.chatRoom.findFirst({
    where: {
      organizationId,
      type: "ORGANIZATION"
    }
  });

  if (existing) {
    return existing;
  }

  // Create org channel
  const room = await prisma.chatRoom.create({
    data: {
      type: "ORGANIZATION",
      name: "#company-wide",
      organizationId,
      propertyId: null
    }
  });

  // Add all users in the organization as participants
  const orgUsers = await prisma.userOrg.findMany({
    where: { organizationId },
    select: { userId: true }
  });

  if (orgUsers.length > 0) {
    await prisma.chatParticipant.createMany({
      data: orgUsers.map((u) => ({
        roomId: room.id,
        userId: u.userId
      })),
      skipDuplicates: true
    });
  }

  return room;
}

/**
 * Create property-specific channel (#{propertyName}-general)
 * Called when a new property is created
 */
export async function createPropertyChannel(propertyId: string) {
  // Get property details
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      name: true,
      organizationId: true
    }
  });

  if (!property) {
    throw new Error("Property not found");
  }

  // Check if property channel already exists
  const existing = await prisma.chatRoom.findFirst({
    where: {
      propertyId,
      type: "PROPERTY"
    }
  });

  if (existing) {
    return existing;
  }

  // Create property channel
  const channelName = `#${property.name
    .toLowerCase()
    .replace(/\s+/g, "-")}-general`;

  const room = await prisma.chatRoom.create({
    data: {
      type: "PROPERTY",
      name: channelName,
      organizationId: property.organizationId,
      propertyId: property.id
    }
  });

  // Add all staff assigned to this property as participants
  const propertyStaff = await prisma.userProperty.findMany({
    where: { propertyId },
    select: { userId: true }
  });

  if (propertyStaff.length > 0) {
    await prisma.chatParticipant.createMany({
      data: propertyStaff.map((s) => ({
        roomId: room.id,
        userId: s.userId
      })),
      skipDuplicates: true
    });
  }

  return room;
}

/**
 * Create or get direct message room between two users
 */
export async function createDirectMessageRoom(
  organizationId: string,
  userId1: string,
  userId2: string
) {
  // Sort user IDs to ensure consistent room lookup
  const [user1, user2] = [userId1, userId2].sort();

  // Check if DM room already exists
  const existing = await prisma.chatRoom.findFirst({
    where: {
      organizationId,
      type: "DIRECT",
      participants: {
        every: {
          userId: { in: [user1, user2] }
        }
      }
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      }
    }
  });

  if (existing && existing.participants.length === 2) {
    return existing;
  }

  // Create new DM room
  const room = await prisma.chatRoom.create({
    data: {
      type: "DIRECT",
      name: null, // DM rooms don't have names
      organizationId,
      propertyId: null,
      participants: {
        create: [{ userId: user1 }, { userId: user2 }]
      }
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      }
    }
  });

  return room;
}
