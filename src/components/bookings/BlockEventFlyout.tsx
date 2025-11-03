// components/bookings/BlockEventFlyout.tsx

"use client";

import React, { useEffect, useState } from "react";
import { LockOpenIcon, PencilIcon } from "@heroicons/react/24/outline";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface BlockEventFlyoutProps {
  flyout: {
    blockId: string;
    roomId: string;
    roomName: string;
    blockType: string;
    reason: string;
    x: number;
    y: number;
  } | null;
  flyoutRef: React.RefObject<HTMLDivElement | null>;
  setFlyout: (flyout: BlockEventFlyoutProps["flyout"]) => void;
  onUnblock: (blockId: string) => void;
  onEdit: (blockId: string, roomId: string, roomName: string) => void;
}

const BlockEventFlyout: React.FC<BlockEventFlyoutProps> = ({
  flyout,
  flyoutRef,
  setFlyout,
  onUnblock,
  onEdit
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Close flyout when clicking outside
  useEffect(() => {
    if (!flyout) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        flyoutRef.current &&
        !flyoutRef.current.contains(event.target as Node)
      ) {
        setFlyout(null);
      }
    };

    // Add small delay to prevent immediate close from the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [flyout, flyoutRef, setFlyout]);

  if (!flyout) return null;

  // flyout menu positioning - position near click point
  const left = flyout.x + 50;
  const top = flyout.y - 55;

  const handleUnblockClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmUnblock = () => {
    setShowDeleteConfirm(false);
    setFlyout(null);
    onUnblock(flyout.blockId);
  };

  const handleEditClick = () => {
    setFlyout(null);
    onEdit(flyout.blockId, flyout.roomId, flyout.roomName);
  };

  // Format block type for display
  const formatBlockType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <>
      <div
        ref={flyoutRef}
        className="absolute bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 text-sm min-w-[220px]"
        style={{ top, left }}
      >
        {/* Block Info Header - Show reason if available */}
        {flyout.reason && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600 bg-orange-50 dark:bg-orange-900/20 rounded-t-xl">
            <div className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1">
              {formatBlockType(flyout.blockType)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">
              {flyout.reason}
            </div>
          </div>
        )}

        <ul>
          {/* Unblock Room */}
          <li>
            <button
              type="button"
              onClick={handleUnblockClick}
              className="flex items-center w-full text-left px-4 py-3 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-xl"
            >
              <LockOpenIcon className="h-5 w-5 mr-3 text-green-600 dark:text-green-400" />
              Unblock Room
            </button>
          </li>

          {/* Edit Block */}
          <li className="border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={handleEditClick}
              className="flex items-center w-full text-left px-4 py-3 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-xl"
            >
              <PencilIcon className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400" />
              Edit Block
            </button>
          </li>
        </ul>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock Room?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unblock{" "}
              <strong>{flyout.roomName}</strong>? This will make the room
              available for booking again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnblock}
              className="bg-green-600 hover:bg-green-700"
            >
              Unblock Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BlockEventFlyout;
