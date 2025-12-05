/**
 * ChatHeader Component
 *
 * Header for chat window showing room name and participants
 */

"use client";

import { useState } from "react";
import {
  Users,
  Building2,
  Home,
  MessageCircle,
  MoreVertical,
  Trash2,
  BellOff,
  Bell,
  Mail
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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
import type { ChatRoomWithDetails } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { useChat } from "@/contexts/ChatContext";
import { toast } from "sonner";

interface ChatHeaderProps {
  room: ChatRoomWithDetails;
}

export function ChatHeader({ room }: ChatHeaderProps) {
  const { data: session } = useSession();
  const { refreshRooms, setActiveRoomId } = useChat();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMuting, setIsMuting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Get current user's participant info
  const currentParticipant = room.participants.find(
    (p) => p.userId === session?.user?.id
  );
  const isMuted = currentParticipant?.isMuted || false;

  // For DIRECT messages, get the other user
  const otherUser =
    room.type === "DIRECT"
      ? room.participants.find((p) => p.userId !== session?.user?.id)?.user
      : null;

  // Determine room icon based on type
  const RoomIcon =
    room.type === "ORGANIZATION"
      ? Building2
      : room.type === "PROPERTY"
      ? Home
      : room.type === "GROUP"
      ? Users
      : MessageCircle;

  // Get room display name
  const roomName =
    room.type === "DIRECT" && otherUser
      ? otherUser.name || otherUser.email
      : room.name || "Unnamed Room";

  // Get participant count for group chats
  const participantCount = room.participants?.length || 0;

  // Get room description
  const getRoomDescription = () => {
    if (room.type === "ORGANIZATION") {
      return "Organization-wide channel";
    }
    if (room.type === "PROPERTY") {
      return "Property channel";
    }
    if (room.type === "GROUP") {
      return `${participantCount} members`;
    }
    // DIRECT message
    return "Direct message";
  };

  // Get icon background classes
  const getIconClasses = () => {
    if (room.type === "ORGANIZATION") {
      return "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm";
    }
    if (room.type === "PROPERTY") {
      return "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-sm";
    }
    if (room.type === "GROUP") {
      return "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm";
    }
    return "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-sm";
  };

  // Handle delete chat
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/chat/rooms/${room.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete chat");
      }

      toast.success("Chat deleted successfully");
      setShowDeleteDialog(false);
      setActiveRoomId(null);
      await refreshRooms();
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast.error("Failed to delete chat");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle mute/unmute chat
  const handleToggleMute = async () => {
    setIsMuting(true);
    try {
      const response = await fetch(`/api/chat/rooms/${room.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isMuted: !isMuted })
      });

      if (!response.ok) {
        throw new Error("Failed to update mute status");
      }

      toast.success(isMuted ? "Chat unmuted" : "Chat muted");
      await refreshRooms();
    } catch (error) {
      console.error("Error toggling mute:", error);
      toast.error("Failed to update mute status");
    } finally {
      setIsMuting(false);
    }
  };

  // Handle email chat
  const handleEmailChat = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/chat/rooms/${room.id}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to export chat");
      }

      toast.success(data.message || "Chat history sent to your email");
    } catch (error) {
      console.error("Error exporting chat:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to export chat";
      toast.error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="h-16 bg-white dark:bg-[#2d3748] px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {/* Room Icon or Avatar */}
          {room.type === "DIRECT" && otherUser ? (
            <Avatar
              email={otherUser.email}
              name={otherUser.name}
              src={otherUser.image}
              size="lg"
            />
          ) : (
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                getIconClasses()
              )}
            >
              <RoomIcon className="h-5 w-5" />
            </div>
          )}

          {/* Room Info */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {roomName}
              </h2>
              {isMuted && (
                <span title="Muted">
                <BellOff
                  className="h-4 w-4 text-gray-500 dark:text-gray-400"
                />
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getRoomDescription()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              aria-label="More options"
              title="More options"
            >
              <MoreVertical className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={handleToggleMute}
              disabled={isMuting}
              className="cursor-pointer"
            >
              {isMuted ? (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Unmute
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Mute
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleEmailChat}
              disabled={isExporting}
              className="cursor-pointer"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
              className="cursor-pointer"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This will remove you
              from the conversation and you won&apos;t be able to see the
              messages anymore. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
