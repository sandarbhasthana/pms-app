// src/lib/rooms/api.ts
import { Room, RoomType } from "@prisma/client";
import { RoomGroup } from "@/types";

export async function getRoomsGroupedByType(
  orgId: string
): Promise<RoomGroup[]> {
  if (!orgId) throw new Error("Organization context not found");

  const [roomsRes, roomTypesRes] = await Promise.all([
    fetch(`/api/rooms?orgId=${orgId}`, { cache: "no-store" }),
    fetch(`/api/room-types?orgId=${orgId}`, { cache: "no-store" })
  ]);

  if (!roomsRes.ok) throw new Error("Failed to fetch rooms");

  const rooms: Room[] = await roomsRes.json();

  // Room types are optional - if the API fails, we'll continue without them
  let roomTypesMap: Record<string, RoomType> = {};
  if (roomTypesRes.ok) {
    try {
      const roomTypes: RoomType[] = await roomTypesRes.json();
      roomTypesMap = roomTypes.reduce((acc, rt) => {
        acc[rt.name] = rt;
        return acc;
      }, {} as Record<string, RoomType>);
    } catch (error) {
      console.warn("Failed to fetch room types:", error);
    }
  }

  const grouped = rooms.reduce((acc, room) => {
    if (!acc[room.type]) acc[room.type] = [];
    acc[room.type].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  // Natural/numeric sorting function for room names
  const naturalSort = (a: string, b: string): number => {
    return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base"
    });
  };

  return Object.entries(grouped).map(([type, rooms]) => ({
    type,
    abbreviation: roomTypesMap[type]?.abbreviation || undefined,
    roomTypeData: roomTypesMap[type]
      ? {
          ...roomTypesMap[type],
          createdAt: new Date(roomTypesMap[type].createdAt),
          updatedAt: new Date(roomTypesMap[type].updatedAt)
        }
      : undefined,
    rooms: rooms
      .map((room) => ({
        id: room.id,
        name: room.name,
        type: room.type,
        capacity: room.capacity,
        imageUrl: room.imageUrl,
        organizationId: room.organizationId,
        pricingId: room.pricingId,
        sizeSqFt: room.sizeSqFt,
        description: room.description,
        doorlockId: room.doorlockId,
        roomTypeId: room.roomTypeId,
        createdAt: new Date(room.createdAt),
        updatedAt: new Date(room.updatedAt)
      }))
      .sort((a, b) => naturalSort(a.name, b.name))
  }));
}
