/**
 * Chat Context Provider
 *
 * Global state management for chat system
 * - Ably connection management
 * - Room list with unread counts
 * - Active room selection
 * - Real-time updates
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo
} from "react";
import { useSession } from "next-auth/react";
import { useAbly } from "@/hooks/useAbly";
import { AblyEvents } from "@/lib/chat/ably-config";
import type { ChatRoomWithDetails, MessageSentEvent } from "@/lib/chat/types";
import type * as Ably from "ably";

export interface ChatContextValue {
  // Ably connection state
  client: Ably.Realtime | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Rooms
  rooms: ChatRoomWithDetails[];
  isLoadingRooms: boolean;
  roomsError: string | null;

  // Active room
  activeRoomId: string | null;
  activeRoom: ChatRoomWithDetails | null;
  setActiveRoomId: (roomId: string | null) => void;

  // Unread counts
  totalUnreadCount: number;
  getUnreadCount: (roomId: string) => number;

  // Actions
  refreshRooms: () => Promise<void>;
  markRoomAsRead: (roomId: string) => Promise<void>;

  // Connection controls
  reconnect: () => void;
  disconnect: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const {
    client,
    isConnected,
    isConnecting,
    error: connectionError,
    reconnect,
    disconnect
  } = useAbly();

  const [rooms, setRooms] = useState<ChatRoomWithDetails[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Fetch rooms from API
  const fetchRooms = useCallback(async () => {
    if (status !== "authenticated" || !session?.user?.orgId) {
      return;
    }

    setIsLoadingRooms(true);
    setRoomsError(null);

    try {
      const response = await fetch(
        `/api/chat/rooms?organizationId=${session.user.orgId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch rooms: ${response.statusText}`);
      }

      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      setRoomsError(
        error instanceof Error ? error.message : "Failed to load rooms"
      );
    } finally {
      setIsLoadingRooms(false);
    }
  }, [session, status]);

  // Load rooms on mount and when session changes
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Subscribe to organization-wide channel for room updates
  useEffect(() => {
    if (!client || !isConnected || !session?.user?.orgId) {
      return;
    }

    const channelName = `org:${session.user.orgId}`;
    const channel = client.channels.get(channelName);

    const handleMessageSent = (message: Ably.Message) => {
      const event = message.data as MessageSentEvent;

      // Update the room's lastMessage and lastMessageAt
      setRooms((prev) =>
        prev.map((room) => {
          if (room.id === event.roomId) {
            return {
              ...room,
              lastMessage: event.message,
              lastMessageAt: event.message.createdAt,
              // Increment unread count if not the active room
              unreadCount:
                room.id !== activeRoomId
                  ? (room.unreadCount || 0) + 1
                  : room.unreadCount
            };
          }
          return room;
        })
      );
    };

    channel.subscribe(AblyEvents.MESSAGE_SENT, handleMessageSent);

    return () => {
      channel.unsubscribe(AblyEvents.MESSAGE_SENT, handleMessageSent);
    };
  }, [client, isConnected, session?.user?.orgId, activeRoomId]);

  // Mark room as read
  const markRoomAsRead = useCallback(async (roomId: string) => {
    // Immediately update local state to clear unread count (optimistic update)
    setRooms((prev) => {
      const room = prev.find((r) => r.id === roomId);

      // Clear unread count immediately
      const updatedRooms = prev.map((r) =>
        r.id === roomId ? { ...r, unreadCount: 0 } : r
      );

      // If there's a last message, mark it as read on the server
      if (room?.lastMessage) {
        fetch(`/api/chat/messages/${room.lastMessage.id}/read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        }).catch((error) => {
          console.error("Error marking room as read:", error);
        });
      }

      return updatedRooms;
    });
  }, []); // No dependencies - uses setRooms callback form

  // Get unread count for a specific room
  const getUnreadCount = useCallback(
    (roomId: string) => {
      const room = rooms.find((r) => r.id === roomId);
      return room?.unreadCount || 0;
    },
    [rooms]
  );

  // Calculate total unread count
  const totalUnreadCount = useMemo(() => {
    return rooms.reduce((total, room) => total + (room.unreadCount || 0), 0);
  }, [rooms]);

  // Get active room
  const activeRoom = useMemo(() => {
    return rooms.find((r) => r.id === activeRoomId) || null;
  }, [rooms, activeRoomId]);

  const value: ChatContextValue = {
    // Connection
    client,
    isConnected,
    isConnecting,
    connectionError,

    // Rooms
    rooms,
    isLoadingRooms,
    roomsError,

    // Active room
    activeRoomId,
    activeRoom,
    setActiveRoomId,

    // Unread counts
    totalUnreadCount,
    getUnreadCount,

    // Actions
    refreshRooms: fetchRooms,
    markRoomAsRead,

    // Connection controls
    reconnect,
    disconnect
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Hook to access chat context
 */
export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }

  return context;
}
