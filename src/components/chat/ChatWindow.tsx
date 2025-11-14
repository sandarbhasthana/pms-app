/**
 * ChatWindow Component
 *
 * Main chat window with header, message list, and input
 */

"use client";

import { useChat } from "@/contexts/ChatContext";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

export function ChatWindow() {
  const { activeRoom } = useChat();

  if (!activeRoom) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <ChatHeader room={activeRoom} />

      {/* Message List */}
      <div className="flex-1 overflow-hidden bg-gray-50 dark:!bg-gray-900">
        <MessageList roomId={activeRoom.id} />
      </div>

      {/* Message Input */}
      <MessageInput roomId={activeRoom.id} />
    </div>
  );
}
