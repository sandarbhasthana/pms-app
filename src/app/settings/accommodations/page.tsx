"use client";

import { useEffect, useState } from "react";
import AccommodationsTable from "@/components/settings/accommodations/AccommodationsTable";
import { LoadingSpinner } from "@/components/ui/spinner";
import { RoomGroup } from "@/types";
import { getRoomsGroupedByType } from "@/lib/rooms/api";
import { toast } from "sonner";
import { getCookie } from "cookies-next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose
} from "@/components/ui/sheet";
import { ChevronLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AccommodationDetailsForm } from "@/components/settings/accommodations/AccommodationDetailsForm";

export default function AccommodationsPage() {
  const [groupedRooms, setGroupedRooms] = useState<RoomGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<RoomGroup | null>(null);

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

      if (!res.ok) {
        if (res.status === 409) {
          // Handle reservation conflict
          try {
            const errorData = await res.json();
            toast.error(
              errorData.message ||
                "Cannot delete room with existing reservations"
            );
            return;
          } catch {
            toast.error("Cannot delete room with existing reservations");
            return;
          }
        }
        throw new Error("Failed to delete room");
      }

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

  // Handle saving new room type
  const handleSaveNewRoomType = async (formData: {
    title: string;
    abbreviation: string;
    privateOrDorm: string;
    physicalOrVirtual: string;
    maxOccupancy: number;
    maxAdults: number;
    maxChildren: number;
    adultsIncluded: number;
    childrenIncluded: number;
    description: string;
    amenities: string[];
    customAmenities: string[];
    rooms: Array<{
      name: string;
      description: string;
      doorlockId: string;
    }>;
  }) => {
    try {
      // Create the new room type first
      const orgId = getCookie("orgId");
      if (!orgId) {
        toast.error("Missing organization context");
        return;
      }

      // Save room type data via the room type API
      const roomTypeResponse = await fetch("/api/room-types/by-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId as string
        },
        body: JSON.stringify({
          name: formData.title,
          abbreviation: formData.abbreviation,
          privateOrDorm: formData.privateOrDorm,
          physicalOrVirtual: formData.physicalOrVirtual,
          maxOccupancy: parseInt(formData.maxOccupancy.toString()) || 1,
          maxAdults: parseInt(formData.maxAdults.toString()) || 1,
          maxChildren: parseInt(formData.maxChildren.toString()) || 0,
          adultsIncluded: parseInt(formData.adultsIncluded.toString()) || 1,
          childrenIncluded: parseInt(formData.childrenIncluded.toString()) || 0,
          description: formData.description,
          amenities: formData.amenities || [],
          customAmenities: formData.customAmenities || [],
          featuredImageUrl: null,
          additionalImageUrls: []
        })
      });

      if (!roomTypeResponse.ok) {
        throw new Error("Failed to create room type");
      }

      // Create rooms if any were added
      if (formData.rooms && formData.rooms.length > 0) {
        const roomPromises = formData.rooms.map(async (room) => {
          if (room.name.trim()) {
            // Only create rooms with names
            const roomResponse = await fetch("/api/rooms", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: room.name,
                type: formData.title,
                capacity: 1,
                description: room.description || "",
                doorlockId: room.doorlockId || ""
              })
            });

            if (!roomResponse.ok) {
              throw new Error(`Failed to create room ${room.name}`);
            }
            return roomResponse.json();
          }
        });

        await Promise.all(roomPromises.filter(Boolean));
      }

      // Refresh the room list
      await fetchRooms();

      // Close dialog and show success
      setOpen(false);
      setSelectedGroup(null);
      toast.success("Room type created successfully");
    } catch (error) {
      console.error("Failed to create room type:", error);
      toast.error("Failed to create room type");
    }
  };
  // Handle closing the sheet
  const handleClose = () => {
    setOpen(false);
    setSelectedGroup(null);
  };

  // 1️⃣ Prepare “New Room Type” mode
  const handleAddNew = () => {
    setSelectedGroup({ type: "", rooms: [] });
    setOpen(true);
  };

  if (loading) {
    return <LoadingSpinner text="Loading Accommodations..." fullScreen />;
  }

  return (
    <div className="p-0">
      <h1 className="text-xl font-semibold mb-6">Accommodations</h1>
      <AccommodationsTable
        groupedRooms={groupedRooms}
        setGroupedRooms={setGroupedRooms}
        onDelete={handleDelete}
        onAddRoom={handleAddNew}
      />

      {/* Add Room Type Sheet */}
      <Sheet open={open} onOpenChange={() => {}}>
        <SheetClose asChild>
          <div />
        </SheetClose>
        <SheetContent className="fixed top-16 text-lg bottom-0 left-0 right-0 w-full h-[calc(100vh-4rem)] overflow-y-auto bg-gray-100! dark:bg-[#121212]! text-gray-900! dark:text-[#f0f8ff]! [&_label]:text-base [&_input]:text-base [&_textarea]:text-base **:data-[slot=select-trigger]:text-base **:data-[slot=select-item]:text-base">
          <SheetHeader className="relative">
            {/* Close button in top right corner */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-0 right-0 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            {/* Back button */}
            <button
              type="button"
              onClick={handleClose}
              className="mb-4 w-[5%] flex items-center gap-2 p-2 rounded-md bg-purple-400 dark:bg-purple-500 hover:bg-purple-300/50 text-black dark:text-white cursor-pointer"
            >
              <ChevronLeftIcon className="h-6 w-6" /> Back
            </button>
            <SheetTitle className="text-3xl">Accommodation Details</SheetTitle>
            <SheetDescription className="text-md">
              {selectedGroup?.type
                ? `Edit settings for room type "${selectedGroup.type}" and its rooms.`
                : "Create a new room type and configure its settings and rooms."}
            </SheetDescription>
          </SheetHeader>

          {selectedGroup && (
            <AccommodationDetailsForm
              group={selectedGroup}
              onCancel={handleClose}
              onSave={handleSaveNewRoomType}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
