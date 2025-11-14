/**
 * ChatInterface Component
 *
 * Main chat interface with room list and chat window
 * Teams-style layout with unified conversation list
 */

"use client";

import { useChat } from "@/contexts/ChatContext";
import { ChatRoomList } from "./ChatRoomList";
import { ChatWindow } from "./ChatWindow";
import { NewMessageDialog } from "./NewMessageDialog";
import { Loader2 } from "lucide-react";

export function ChatInterface() {
  const { isConnecting, connectionError, activeRoomId } = useChat();

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-gray-100 dark:!bg-gray-950">
      {/* Left Sidebar - Room List */}
      <div className="w-80 bg-white dark:!bg-gray-900 flex flex-col">
        <div className="p-4 space-y-3 bg-gray-50 dark:!bg-gray-800/50">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:!text-gray-100">
              Teams
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              All conversations
            </p>
          </div>
          <NewMessageDialog />
        </div>

        <ChatRoomList />
      </div>

      {/* Right Panel - Chat Window */}
      <div className="flex-1 flex flex-col bg-[#f0f8f9] dark:!bg-gray-700">
        {isConnecting ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-primary mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connecting to chat...
              </p>
            </div>
          </div>
        ) : connectionError ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                Connection Error
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {connectionError}
              </p>
            </div>
          </div>
        ) : !activeRoomId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-purple-primary dark:!text-[#f0f8f9]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Select a conversation
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        ) : (
          <ChatWindow />
        )}
      </div>
    </div>
  );
}
