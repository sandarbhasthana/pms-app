/**
 * MessageList Component
 *
 * Virtualized list of messages with real-time updates
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { MessageItem } from "./MessageItem";
import { useChat } from "@/contexts/ChatContext";
import { useAblyChannel } from "@/hooks/useAblyChannel";
import { AblyEvents } from "@/lib/chat/ably-config";
import type { ChatMessageWithSender, MessageSentEvent } from "@/lib/chat/types";
import type * as Ably from "ably";

interface MessageListProps {
  roomId: string;
}

export function MessageList({ roomId }: MessageListProps) {
  const { client, activeRoom, markRoomAsRead } = useChat();
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markedAsReadRef = useRef<string | null>(null); // Track which room we've marked as read

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`);

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Load messages on mount and when room changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Mark room as read when room is opened (only once per room change)
  useEffect(() => {
    // Only mark as read if:
    // 1. Messages have finished loading
    // 2. We haven't already marked this room as read
    if (!isLoading && markedAsReadRef.current !== roomId) {
      markedAsReadRef.current = roomId; // Mark as done before calling API
      markRoomAsRead(roomId);
    }
  }, [roomId, isLoading, markRoomAsRead]);

  // Get channel name for the active room
  const getChannelName = useCallback(() => {
    if (!activeRoom) return null;

    if (activeRoom.type === "ORGANIZATION") {
      return `org:${activeRoom.organizationId}`;
    } else if (activeRoom.type === "PROPERTY" && activeRoom.propertyId) {
      return `org:${activeRoom.organizationId}:property:${activeRoom.propertyId}`;
    } else if (activeRoom.type === "GROUP") {
      return `org:${activeRoom.organizationId}:group:${roomId}`;
    } else {
      // DIRECT message
      return `org:${activeRoom.organizationId}:room:${roomId}`;
    }
  }, [activeRoom, roomId]);

  const channelName = getChannelName();

  // Subscribe to Ably channel for real-time messages
  useAblyChannel({
    client,
    channelName: channelName || "",
    eventName: AblyEvents.MESSAGE_SENT,
    skip: !channelName,
    onMessage: useCallback(
      (message: Ably.Message) => {
        const event = message.data as MessageSentEvent;
        if (event.roomId === roomId) {
          // Add new message to the list
          setMessages((prev) => {
            // Check if message already exists (avoid duplicates)
            if (prev.some((m) => m.id === event.message.id)) {
              return prev;
            }
            return [...prev, event.message];
          });
        }
      },
      [roomId]
    )
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">
            Failed to load messages
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{error}</p>
          <button
            type="button"
            onClick={fetchMessages}
            className="mt-4 px-4 py-2 text-sm bg-purple-primary text-white rounded-md hover:bg-purple-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No messages yet
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Start the conversation!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-6 py-6 bg-gray-50 dark:!bg-gray-900"
    >
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showAvatar =
          !prevMessage || prevMessage.senderId !== message.senderId;

        return (
          <MessageItem
            key={message.id}
            message={message}
            showAvatar={showAvatar}
          />
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
