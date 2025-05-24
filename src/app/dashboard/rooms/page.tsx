// File: src/app/dashboard/rooms/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
  imageUrl?: string;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/rooms");
        const data = await res.json();

        if (Array.isArray(data)) {
          setRooms(data);
          toast.success(`Showing ${data.length} room(s)`);
        } else if (Array.isArray(data.rooms)) {
          setRooms(data.rooms);
          toast.success(`Showing ${data.count} room(s)`);
        } else if (data.error) {
          throw new Error(data.error);
        } else {
          throw new Error("Unexpected response format");
        }
      } catch (err) {
        console.error(err);
        toast.error((err as Error).message || "Failed to load rooms");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="text-center mt-10">Loading rooms...</p>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Rooms</h1>
        <Link href="/dashboard/rooms/new">
          <Button>Add Room</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {rooms.length === 0 ? (
          <p className="text-center text-gray-500">No rooms available.</p>
        ) : (
          rooms.map((room) => (
            <Card key={room.id}>
              <CardContent className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium">{room.name}</h2>
                  <p className="text-sm text-gray-500">
                    {room.type} — Capacity: {room.capacity}
                  </p>
                </div>
                <Link href={`/dashboard/rooms/${room.id}/edit`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
