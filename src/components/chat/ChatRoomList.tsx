/**
 * ChatRoomList Component
 *
 * Unified list of all conversations (1-1, group, property, org channels)
 * Similar to Microsoft Teams conversation list
 */

"use client";

import { useChat } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";
import { Loader2, Users, Building2, Home, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useSession } from "next-auth/react";

export function ChatRoomList() {
  const { data: session } = useSession();
  const { rooms, isLoadingRooms, activeRoomId, setActiveRoomId } = useChat();

  if (isLoadingRooms) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          No conversations yet
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {rooms.map((room) => {
        const isActive = room.id === activeRoomId;
        const hasUnread = (room.unreadCount || 0) > 0;

        // For DIRECT messages, get the other user
        const otherUser =
          room.type === "DIRECT"
            ? room.participants.find((p) => p.userId !== session?.user?.id)
                ?.user
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

        // Get last message preview
        const lastMessageText = room.lastMessage?.content || "No messages yet";
        const lastMessageTime = room.lastMessage?.createdAt
          ? formatDistanceToNow(new Date(room.lastMessage.createdAt), {
              addSuffix: true
            })
          : "";

        return (
          <button
            key={room.id}
            type="button"
            onClick={() => setActiveRoomId(room.id)}
            className={cn(
              "w-full px-4 py-3 flex items-start gap-3 transition-all duration-200",
              isActive
                ? "bg-purple-50 dark:bg-purple-500/20 border-l-4 border-l-purple-600"
                : "hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-l-transparent"
            )}
          >
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
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                  room.type === "ORGANIZATION"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm"
                    : room.type === "PROPERTY"
                    ? "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-sm"
                    : room.type === "GROUP"
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm"
                    : "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-sm"
                )}
              >
                <RoomIcon className="h-5 w-5" />
              </div>
            )}

            {/* Room Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h3
                  className={cn(
                    "text-sm truncate",
                    hasUnread
                      ? "font-semibold text-gray-900 dark:text-gray-100"
                      : "font-medium text-gray-700 dark:text-gray-300"
                  )}
                >
                  {roomName}
                </h3>
                {lastMessageTime && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                    {lastMessageTime}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p
                  className={cn(
                    "text-xs truncate",
                    hasUnread
                      ? "font-medium text-gray-700 dark:text-gray-300"
                      : "text-gray-500 dark:text-gray-400"
                  )}
                >
                  {lastMessageText}
                </p>

                {hasUnread && (
                  <span className="ml-2 flex-shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                    {room.unreadCount! > 99 ? "99+" : room.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
