"use client";

import { FC, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { SortableItem } from "../SortableItem";
import { RoomGroup, Room } from "@/types";
import { toast } from "sonner";
import {
  TrashIcon,
  ChevronLeftIcon,
  XMarkIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose
} from "@/components/ui/sheet";
import { AccommodationDetailsForm } from "./AccommodationDetailsForm";
import { FormValues as Details } from "./AccommodationDetailsForm";
import { notifyCalendarRefresh } from "@/lib/calendar/refresh";
import { getCookie } from "cookies-next";
import { Button } from "@/components/ui/button";

interface AccommodationsTableProps {
  groupedRooms: RoomGroup[];
  setGroupedRooms: (r: RoomGroup[]) => void;
  onDelete: (id: string) => void;
  onAddRoom: () => void;
}

const AccommodationsTable: FC<AccommodationsTableProps> = ({
  groupedRooms,
  setGroupedRooms,
  onDelete,
  onAddRoom
}) => {
  const sensors = useSensors(useSensor(PointerSensor));

  // Create unique group identifiers for drag and drop
  const groupIds = groupedRooms.map(
    (group, index) => `group-${index}-${group.type}`
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find the indices of the dragged groups
    const oldIndex = groupIds.findIndex((id) => id === active.id);
    const newIndex = groupIds.findIndex((id) => id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    console.log(`🔄 Moving room type from position ${oldIndex} to ${newIndex}`);
    console.log(
      `📋 Before:`,
      groupedRooms.map((g) => g.type)
    );

    // Move the entire room groups
    const reorderedGroups = arrayMove(groupedRooms, oldIndex, newIndex);

    console.log(
      `📋 After:`,
      reorderedGroups.map((g) => g.type)
    );

    setGroupedRooms(reorderedGroups);
  };

  const getAbbreviation = (type: string) =>
    type
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 3);

  const totalRooms = groupedRooms.reduce(
    (sum, group) => sum + group.rooms.length,
    0
  );

  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<RoomGroup | null>(null);

  const handleTypeClick = (group: RoomGroup) => {
    setSelectedGroup(group);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedGroup(null);
  };

  // New: call this when the form “Save” is clicked
  const handleSave = async (data: Details) => {
    if (!selectedGroup) return;
    try {
      // Separate existing rooms from new rooms and identify deleted rooms
      const existingRoomIds = new Set(selectedGroup.rooms.map((r) => r.id));
      const submittedRoomIds = new Set(data.rooms.map((r) => r.id));

      const existingRooms = data.rooms.filter((r) => existingRoomIds.has(r.id));
      const newRooms = data.rooms.filter((r) => !existingRoomIds.has(r.id));
      const deletedRoomIds = selectedGroup.rooms
        .filter((r) => !submittedRoomIds.has(r.id))
        .map((r) => r.id);

      let updatedRooms: Room[] = [];
      let createdRooms: Room[] = [];

      // 1) Delete removed rooms if any
      if (deletedRoomIds.length > 0) {
        console.log("Deleting rooms:", deletedRoomIds);
        const deletePromises = deletedRoomIds.map(async (roomId) => {
          const res = await fetch(`/api/rooms/${roomId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" }
          });

          if (!res.ok) {
            if (res.status === 409) {
              // Handle reservation conflict
              try {
                const errorData = await res.json();
                throw new Error(
                  `RESERVATION_CONFLICT:${errorData.message}:${roomId}`
                );
              } catch {
                throw new Error(
                  `RESERVATION_CONFLICT:Cannot delete room with existing reservations:${roomId}`
                );
              }
            } else {
              const errorText = await res.text();
              throw new Error(`Failed to delete room ${roomId}: ${errorText}`);
            }
          }
          return roomId;
        });

        try {
          await Promise.all(deletePromises);
          console.log("Successfully deleted rooms:", deletedRoomIds);
        } catch (error) {
          // Handle reservation conflict errors gracefully
          if (
            error instanceof Error &&
            error.message.startsWith("RESERVATION_CONFLICT:")
          ) {
            const [, message, roomId] = error.message.split(":");
            const roomName =
              selectedGroup.rooms.find((r) => r.id === roomId)?.name ||
              "Unknown";
            throw new Error(`Cannot delete room "${roomName}": ${message}`);
          }
          throw error; // Re-throw other errors
        }
      }

      // 2) Update existing rooms if any
      if (existingRooms.length > 0) {
        const roomsRes = await fetch("/api/rooms/bulk-update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            existingRooms.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description,
              doorlockId: r.doorlockId
            }))
          )
        });
        if (!roomsRes.ok) throw new Error("Failed to update existing rooms");
        const { rooms } = (await roomsRes.json()) as { rooms: Room[] };
        updatedRooms = rooms;
      }

      // 3) Create new rooms if any
      if (newRooms.length > 0) {
        const createPromises = newRooms.map(async (r) => {
          const res = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: r.name,
              type: selectedGroup.type,
              capacity: 1, // Default capacity
              description: r.description,
              doorlockId: r.doorlockId
            })
          });
          if (!res.ok) throw new Error("Failed to create new room");
          return await res.json();
        });
        createdRooms = await Promise.all(createPromises);
      }

      // 4) Update room type/abbreviation in database if changed
      if (data.abbreviation !== selectedGroup.abbreviation) {
        // Note: You might need to add an API endpoint to update room type abbreviations
        // For now, we'll just update the local state
        console.log("Room type abbreviation updated:", data.abbreviation);
      }

      // 5) Combine all remaining rooms
      const allRooms = [...updatedRooms, ...createdRooms];

      // 6) Update local groupedRooms state
      const updatedGroups: RoomGroup[] = groupedRooms.map((g: RoomGroup) =>
        g.type === selectedGroup.type
          ? {
              ...g,
              // carry forward any new abbreviation
              abbreviation: data.abbreviation,
              rooms: allRooms
            }
          : g
      );

      setGroupedRooms(updatedGroups);

      // 7) Notify calendar pages to refresh their resources
      const orgId = getCookie("orgId");
      await notifyCalendarRefresh(
        typeof orgId === "string" ? orgId : undefined
      );

      toast.success(`Room type "${selectedGroup.type}" saved successfully!`);
      setOpen(false);
      setSelectedGroup(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    }
  };

  return (
    <>
      {/* Add New Room */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={onAddRoom}
          type="button"
          title="Add Room Type"
          variant="outline"
          className="border-[#ab2aea]! cursor-pointer text-[#ab2aea]! hover:bg-[#ab2aea]! hover:text-white! transition-all! duration-200!"
        >
          <PlusIcon className="h-4 w-4 mr-2 text-[#121212] dark:text-[#f0f8ff]" />
          Add Room Type
        </Button>
      </div>
      <div className="overflow-x-auto border rounded-md text-sm">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="min-w-full table-fixed divide-y border-0">
            <thead className="bg-linear-to-r from-[#7210a2] to-[#9333ea] text-white text-center shadow-md">
              <tr className="h-14">
                <th className="w-[2%] px-1.5 py-3"></th>
                <th
                  className="w-[16%] px-3 py-4 text-center text-sm font-medium tracking-wider uppercase border-r border-purple-400/30"
                  title="Type of room available"
                >
                  Room Types
                </th>
                <th className="w-[12%] px-3 py-4 text-center text-sm font-medium tracking-wider uppercase border-r border-purple-400/30">
                  Call Sign
                </th>
                <th className="w-[16%] px-3 py-4 text-center text-sm font-medium tracking-wider uppercase border-r border-purple-400/30">
                  On-Prem/Off-Prem
                </th>
                <th className="w-[12%] px-3 py-4 text-center text-sm font-medium tracking-wider uppercase border-r border-purple-400/30">
                  Count
                </th>
                <th className="w-[16%] px-3 py-4 text-center text-sm font-medium tracking-wider uppercase border-r border-purple-400/30">
                  Total Count
                </th>
                <th className="w-[5%] px-3 py-4 text-center text-sm font-medium tracking-wider uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <SortableContext
              items={groupIds}
              strategy={verticalListSortingStrategy}
            >
              <tbody className="text-sm">
                {groupedRooms.map((group, index) => (
                  <SortableItem key={groupIds[index]} id={groupIds[index]}>
                    <td
                      className="w-[16%] px-4 py-3 text-center text-purple-600 dark:text-purple-400 font-semibold hover:underline hover:text-purple-900 dark:hover:text-purple-200 cursor-pointer"
                      onClick={() => handleTypeClick(group)}
                    >
                      {group.type}
                    </td>
                    <td className="w-[12%] px-4 py-3 text-center">
                      {group.abbreviation ?? getAbbreviation(group.type)}
                    </td>
                    <td className="w-[16%] px-4 py-3 text-center">Physical</td>
                    <td className="w-[12%] px-4 py-3 text-center">
                      {group.rooms.length}
                    </td>
                    <td className="w-[16%] px-4 py-3 text-center">
                      {group.rooms.length}
                    </td>
                    <td className="w-[5%] px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onDelete(group.rooms[0].id)}
                        className="p-1.5 rounded border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 cursor-pointer"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </SortableItem>
                ))}

                <tr className="font-semibold border-t-2 border-purple-400/30 bg-linear-to-r from-[#7210a2] to-[#9333ea] text-white h-12 shadow-md">
                  <td className="w-[2%] px-0.5 py-3"></td>
                  <td className="w-[16%] px-4 py-3 text-center text-sm font-medium tracking-wider uppercase">
                    Total
                  </td>
                  <td className="w-[12%] px-4 py-3"></td>
                  <td className="w-[16%] px-4 py-3"></td>
                  <td className="w-[12%] px-4 py-3 text-center font-bold">
                    {totalRooms}
                  </td>
                  <td className="w-[16%] px-4 py-3 text-center font-bold">
                    {totalRooms}
                  </td>
                  <td className="w-[5%] px-4 py-3"></td>
                </tr>
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>

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
            <SheetDescription className="text-sm">
              Edit settings for room type “{selectedGroup?.type}” and its rooms.
            </SheetDescription>
          </SheetHeader>

          {selectedGroup && (
            <AccommodationDetailsForm
              group={selectedGroup}
              onCancel={handleClose}
              onSave={handleSave}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AccommodationsTable;
