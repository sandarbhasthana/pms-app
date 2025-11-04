// components/bookings/BlockRoomSheet.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";

type BlockType = "MAINTENANCE" | "ISSUE" | "RENOVATION" | "CLEANING" | "OTHER";

interface Room {
  id: string;
  name: string;
  type: string;
  roomType?: {
    id: string;
    name: string;
    basePrice: number;
  };
}

interface BlockRoomSheetProps {
  blockData: {
    roomId: string;
    roomName: string;
    startDate: string;
    blockId?: string; // For edit mode
  } | null;
  setBlockData: (data: BlockRoomSheetProps["blockData"]) => void;
  onBlockCreated: () => void;
  organizationId: string;
  propertyId: string;
  onFetchAvailableRooms?: (
    startDate: string,
    endDate: string
  ) => Promise<Room[]>; // For empty mode
}

const BlockRoomSheet: React.FC<BlockRoomSheetProps> = ({
  blockData,
  setBlockData,
  onBlockCreated,
  organizationId,
  propertyId,
  onFetchAvailableRooms
}) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [blockType, setBlockType] = useState<BlockType>("MAINTENANCE");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  // State for empty mode (when no room is pre-selected)
  const isEmptyMode = blockData?.roomId === "";
  const [fetchedRooms, setFetchedRooms] = useState<Room[]>([]);
  const [isFetchingRooms, setIsFetchingRooms] = useState(false);

  // Callback to handle date changes in empty mode and fetch available rooms
  const handleDateChangeInEmptyMode = useCallback(
    async (newStartDate: string, newEndDate: string) => {
      if (!onFetchAvailableRooms || !isEmptyMode) return;

      setIsFetchingRooms(true);
      try {
        const rooms = await onFetchAvailableRooms(newStartDate, newEndDate);
        setFetchedRooms(rooms);
      } catch (error) {
        console.error("Failed to fetch available rooms:", error);
        setFetchedRooms([]);
      } finally {
        setIsFetchingRooms(false);
      }
    },
    [onFetchAvailableRooms, isEmptyMode]
  );

  // Load existing block data for edit mode
  useEffect(() => {
    if (blockData?.blockId) {
      // Fetch block details for editing
      fetch(`/api/room-blocks/${blockData.blockId}`)
        .then((res) => res.json())
        .then((data) => {
          setStartDate(new Date(data.startDate).toISOString().split("T")[0]);
          setEndDate(new Date(data.endDate).toISOString().split("T")[0]);
          setBlockType(data.blockType);
          setReason(data.reason || "");
        })
        .catch((err) => {
          console.error("Failed to load block data:", err);
          toast.error("Failed to load block data");
        });
    } else if (blockData) {
      if (isEmptyMode) {
        // Empty mode - initialize with today and tomorrow
        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        setStartDate(today);
        setEndDate(tomorrowStr);

        // Fetch available rooms for the initial date range
        if (onFetchAvailableRooms) {
          handleDateChangeInEmptyMode(today, tomorrowStr);
        }
      } else {
        // Pre-populated mode - pre-fill start date
        setStartDate(blockData.startDate);
        setEndDate(blockData.startDate);
      }
      setBlockType("MAINTENANCE");
      setReason("");
    }
  }, [
    blockData,
    isEmptyMode,
    onFetchAvailableRooms,
    handleDateChangeInEmptyMode
  ]);

  const handleClose = () => {
    setBlockData(null);
    setStartDate("");
    setEndDate("");
    setBlockType("MAINTENANCE");
    setReason("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!startDate || !endDate) {
        toast.error("Please select start and end dates");
        setLoading(false);
        return;
      }

      if (!blockType) {
        toast.error("Please select a block type");
        setLoading(false);
        return;
      }

      if ((blockType === "ISSUE" || blockType === "OTHER") && !reason.trim()) {
        toast.error("Please provide a reason for this block type");
        setLoading(false);
        return;
      }

      const payload = {
        organizationId,
        propertyId,
        roomId: blockData!.roomId,
        startDate,
        endDate,
        blockType,
        reason: reason.trim()
      };

      let response;
      if (blockData?.blockId) {
        // Update existing block
        response = await fetch(`/api/room-blocks/${blockData.blockId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new block
        response = await fetch("/api/room-blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const error = await response.json();
        if (error.reservations) {
          // Show conflict with existing reservations
          toast.error(
            `${error.error}. Please move or cancel the following reservations first:`,
            {
              description: error.reservations
                .map(
                  (r: {
                    guestName: string;
                    checkIn: string;
                    checkOut: string;
                  }) =>
                    `${r.guestName} (${new Date(
                      r.checkIn
                    ).toLocaleDateString()} - ${new Date(
                      r.checkOut
                    ).toLocaleDateString()})`
                )
                .join(", ")
            }
          );
        } else {
          toast.error(error.error || "Failed to save block");
        }
        setLoading(false);
        return;
      }

      toast.success(
        blockData?.blockId
          ? "Block updated successfully"
          : "Room blocked successfully"
      );
      handleClose();
      onBlockCreated();
    } catch (error) {
      console.error("Error saving block:", error);
      toast.error("Failed to save block");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <Sheet open={!!blockData} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-orange-600 dark:text-orange-400">
            {blockData?.blockId ? "Edit Room Block" : "Block Room"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Room Name (Read-only or Dropdown) */}
          <div>
            <Label htmlFor="roomName">
              Room <span className="text-red-500">*</span>
            </Label>
            {isEmptyMode ? (
              <div>
                <select
                  value={blockData?.roomId || ""}
                  onChange={(e) => {
                    const room = fetchedRooms.find(
                      (r) => r.id === e.target.value
                    );
                    if (room && blockData) {
                      setBlockData({
                        ...blockData,
                        roomId: room.id,
                        roomName: room.name
                      });
                    }
                  }}
                  disabled={!fetchedRooms || fetchedRooms.length === 0}
                  className="w-full h-[40px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:!bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-sm leading-tight"
                >
                  <option value="">
                    {isFetchingRooms
                      ? "Loading rooms..."
                      : fetchedRooms && fetchedRooms.length > 0
                      ? "Select a room"
                      : "No rooms available"}
                  </option>
                  {/* Group rooms by type */}
                  {fetchedRooms &&
                    fetchedRooms.length > 0 &&
                    (() => {
                      // Group rooms by type
                      const grouped = fetchedRooms.reduce((acc, room) => {
                        const type = room.type || "Other";
                        if (!acc[type]) acc[type] = [];
                        acc[type].push(room);
                        return acc;
                      }, {} as Record<string, typeof fetchedRooms>);

                      return Object.entries(grouped).map(([type, rooms]) => (
                        <optgroup key={type} label={type}>
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name}
                            </option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                </select>
                {(!fetchedRooms || fetchedRooms.length === 0) &&
                  !isFetchingRooms && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Please select dates first to see available rooms
                    </p>
                  )}
              </div>
            ) : (
              <Input
                id="roomName"
                value={blockData?.roomName || ""}
                disabled
                className="bg-gray-100 dark:bg-gray-800"
              />
            )}
          </div>

          {/* Start Date */}
          <div>
            <Label htmlFor="startDate">
              Start Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                // In empty mode, fetch available rooms when dates change
                if (isEmptyMode && endDate) {
                  handleDateChangeInEmptyMode(e.target.value, endDate);
                }
              }}
              min={today}
              required
            />
          </div>

          {/* End Date */}
          <div>
            <Label htmlFor="endDate">
              End Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                // In empty mode, fetch available rooms when dates change
                if (isEmptyMode && startDate) {
                  handleDateChangeInEmptyMode(startDate, e.target.value);
                }
              }}
              min={startDate || today}
              required
            />
          </div>

          {/* Block Type */}
          <div>
            <Label htmlFor="blockType">
              Block Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={blockType}
              onValueChange={(value) => setBlockType(value as BlockType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select block type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="ISSUE">Issue</SelectItem>
                <SelectItem value="RENOVATION">Renovation</SelectItem>
                <SelectItem value="CLEANING">Cleaning</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">
              Reason
              {(blockType === "ISSUE" || blockType === "OTHER") && (
                <span className="text-red-500"> *</span>
              )}
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for blocking this room..."
              rows={4}
              required={blockType === "ISSUE" || blockType === "OTHER"}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading
                ? "Saving..."
                : blockData?.blockId
                ? "Update Block"
                : "Block Room"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default BlockRoomSheet;
