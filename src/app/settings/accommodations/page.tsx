"use client";

import { useEffect, useState } from "react";
import AccommodationsTable from "@/components/settings/accommodations/AccommodationsTable";
import { LoadingSpinner } from "@/components/ui/spinner";
import { RoomGroup } from "@/types";
import { getRoomsGroupedByType } from "@/lib/rooms/api";
import { toast } from "sonner";
import { getCookie } from "cookies-next";

export default function AccommodationsPage() {
  const [groupedRooms, setGroupedRooms] = useState<RoomGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      const orgId = getCookie("orgId");
      if (!orgId || typeof orgId !== "string") {
        toast.error("Missing organization context");
        return;
      }
      const groups = await getRoomsGroupedByType(orgId);
      setGroupedRooms(groups);
    } catch (err) {
      toast.error("Failed to fetch rooms");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleDelete = async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete room");
      setGroupedRooms((prev) =>
        prev.map((group) => ({
          ...group,
          rooms: group.rooms.filter((room) => room.id !== roomId)
        }))
      );
      toast.success("Room deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete room");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-6">Accommodations</h1>
        <LoadingSpinner
          text="Loading Accommodations..."
          size="lg"
          variant={"secondary"}
          fullScreen={true}
          className="text-purple-600"
        />
      </div>
    );
  }

  return (
    <div className="p-0">
      <h1 className="text-xl font-semibold mb-6">Accommodations</h1>
      <AccommodationsTable
        groupedRooms={groupedRooms}
        setGroupedRooms={setGroupedRooms}
        onDelete={handleDelete}
      />
    </div>
  );
}
