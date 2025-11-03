// components/bookings/BlockRoomSheet.tsx
"use client";

import React, { useState, useEffect } from "react";
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
}

const BlockRoomSheet: React.FC<BlockRoomSheetProps> = ({
  blockData,
  setBlockData,
  onBlockCreated,
  organizationId,
  propertyId
}) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [blockType, setBlockType] = useState<BlockType>("MAINTENANCE");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

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
      // New block - pre-fill start date
      setStartDate(blockData.startDate);
      setEndDate(blockData.startDate);
      setBlockType("MAINTENANCE");
      setReason("");
    }
  }, [blockData]);

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
          {/* Room Name (Read-only) */}
          <div>
            <Label htmlFor="roomName">Room</Label>
            <Input
              id="roomName"
              value={blockData?.roomName || ""}
              disabled
              className="bg-gray-100 dark:bg-gray-800"
            />
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
              onChange={(e) => setStartDate(e.target.value)}
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
              onChange={(e) => setEndDate(e.target.value)}
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
