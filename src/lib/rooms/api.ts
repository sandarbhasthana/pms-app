// src/lib/rooms/api.ts
import { Room } from "@prisma/client";
import { RoomGroup } from "@/types";

export async function getRoomsGroupedByType(
  orgId: string
): Promise<RoomGroup[]> {
  if (!orgId) throw new Error("Organization context not found");

  const res = await fetch(`/api/rooms?orgId=${orgId}`, {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Failed to fetch rooms");

  const rooms: Room[] = await res.json();

  const grouped = rooms.reduce((acc, room) => {
    if (!acc[room.type]) acc[room.type] = [];
    acc[room.type].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  return Object.entries(grouped).map(([type, rooms]) => ({
    type,
    rooms: rooms.map((room) => ({
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
      createdAt: new Date(room.createdAt),
      updatedAt: new Date(room.updatedAt)
    }))
  }));
}
