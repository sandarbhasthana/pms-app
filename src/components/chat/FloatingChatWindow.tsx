/**
 * FloatingChatWindow Component
 *
 * Messenger-style floating chat window
 * Fixed size (400x600), minimizable, closable
 */

"use client";

import { Minus, X } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

interface FloatingChatWindowProps {
  onMinimize: () => void;
  onClose: () => void;
}

export function FloatingChatWindow({
  onMinimize,
  onClose
}: FloatingChatWindowProps) {
  const { activeRoom } = useChat();

  if (!activeRoom) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] bg-white dark:bg-gray-900 border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
      {/* Custom Header with Minimize/Close */}
      <div className="h-14 border-b border-border bg-white dark:bg-gray-900 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {activeRoom.name || "Chat"}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          {/* Minimize Button */}
          <button
            type="button"
            onClick={onMinimize}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            aria-label="Minimize"
            title="Minimize chat"
          >
            <Minus className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            aria-label="Close"
            title="Close chat"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-hidden">
        <MessageList roomId={activeRoom.id} />
      </div>

      {/* Message Input */}
      <MessageInput roomId={activeRoom.id} />
    </div>
  );
}
