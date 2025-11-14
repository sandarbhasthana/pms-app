/**
 * FloatingChatButton Component
 *
 * Floating chat icon in bottom-right corner
 * Shows unread count for active room only
 * Hidden on /dashboard/chat page
 */

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";
import { FloatingChatWindow } from "./FloatingChatWindow";

export function FloatingChatButton() {
  const pathname = usePathname();
  const { activeRoomId, getUnreadCount } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Hide on chat page
  if (pathname === "/dashboard/chat") {
    return null;
  }

  // Only show if there's an active room
  if (!activeRoomId) {
    return null;
  }

  // Get unread count for active room only
  const unreadCount = getUnreadCount(activeRoomId);

  // Toggle chat window
  const toggleChat = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(!isOpen);
    }
  };

  // Minimize chat window
  const minimizeChat = () => {
    setIsMinimized(true);
  };

  // Close chat window
  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating Chat Window */}
      {isOpen && !isMinimized && (
        <FloatingChatWindow onMinimize={minimizeChat} onClose={closeChat} />
      )}

      {/* Floating Button */}
      <button
        type="button"
        onClick={toggleChat}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-14 h-14 rounded-full shadow-lg",
          "bg-purple-primary hover:bg-purple-600 text-white",
          "flex items-center justify-center",
          "transition-all duration-200",
          "hover:scale-110",
          isOpen && !isMinimized && "hidden"
        )}
        aria-label="Open chat"
      >
        <MessageSquare className="h-6 w-6" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Minimized Bar */}
      {isMinimized && (
        <div
          className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={toggleChat}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-purple-primary flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Chat
              </p>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {unreadCount} new {unreadCount === 1 ? "message" : "messages"}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Close chat"
              title="Close chat"
              onClick={(e) => {
                e.stopPropagation();
                closeChat();
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
