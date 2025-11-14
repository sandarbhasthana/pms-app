/**
 * ChatHeader Component
 *
 * Header for chat window showing room name and participants
 */

"use client";

import {
  Users,
  Building2,
  Home,
  MessageCircle,
  MoreVertical
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/avatar";
import type { ChatRoomWithDetails } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  room: ChatRoomWithDetails;
}

export function ChatHeader({ room }: ChatHeaderProps) {
  const { data: session } = useSession();

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

  return (
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
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {roomName}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {getRoomDescription()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <button
        type="button"
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        aria-label="More options"
        title="More options"
      >
        <MoreVertical className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  );
}
