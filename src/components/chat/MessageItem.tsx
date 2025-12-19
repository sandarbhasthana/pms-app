/**
 * MessageItem Component
 *
 * Individual message display with avatar, content, and timestamp
 */

"use client";

import { format } from "date-fns";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ChatMessageWithSender } from "@/lib/chat/types";
import { File } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";

interface MessageItemProps {
  message: ChatMessageWithSender;
  showAvatar: boolean;
}

export function MessageItem({ message, showAvatar }: MessageItemProps) {
  const { data: session } = useSession();
  const senderName = message.sender?.name || "Unknown User";
  const senderEmail = message.sender?.email || undefined;
  const isOwnMessage = message.senderId === session?.user?.id;

  const timestamp = format(new Date(message.createdAt), "h:mm a");

  return (
    <div
      className={cn(
        "flex gap-3 mb-4",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className="shrink-0">
        {showAvatar ? (
          <Avatar email={senderEmail} name={senderName} size="lg" />
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          "flex flex-col max-w-[70%]",
          isOwnMessage ? "items-end" : "items-start"
        )}
      >
        {showAvatar && (
          <div
            className={cn(
              "flex items-baseline gap-2 mb-1 px-1",
              isOwnMessage ? "flex-row-reverse" : "flex-row"
            )}
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {isOwnMessage ? "You" : senderName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {timestamp}
            </span>
          </div>
        )}

        {/* Text Message */}
        {message.type === "TEXT" && (
          <div
            className={
              isOwnMessage
                ? "px-4 py-2 rounded-2xl text-sm wrap-break-word bg-purple-600 text-white rounded-tr-sm"
                : "px-4 py-2 rounded-2xl text-sm wrap-break-word bg-purple-100 dark:bg-purple-900/30 text-gray-900 dark:text-gray-100 rounded-tl-sm"
            }
          >
            {message.content}
          </div>
        )}

        {/* Image Message */}
        {message.type === "IMAGE" && message.attachmentUrl && (
          <div
            className={cn(
              "rounded-2xl overflow-hidden",
              isOwnMessage ? "rounded-tr-sm" : "rounded-tl-sm"
            )}
          >
            <Image
              src={message.attachmentUrl}
              alt="Attachment"
              width={384}
              height={384}
              className="max-w-sm"
              // ✅ OPTIMIZED: S3 images configured in next.config.ts remotePatterns
            />
            {message.content && (
              <div
                className={cn(
                  "px-4 py-2 text-sm",
                  isOwnMessage
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                )}
              >
                {message.content}
              </div>
            )}
          </div>
        )}

        {/* Document Message */}
        {message.type === "DOCUMENT" && message.attachmentUrl && (
          <a
            href={message.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={
              isOwnMessage
                ? "inline-flex items-center gap-2 px-4 py-3 rounded-2xl transition-colors bg-purple-600 hover:bg-purple-700 text-white rounded-tr-sm"
                : "inline-flex items-center gap-2 px-4 py-3 rounded-2xl transition-colors bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/40 text-gray-900 dark:text-gray-100 rounded-tl-sm"
            }
          >
            <File className="h-5 w-5" />
            <span className="text-sm">
              {message.content || "Download file"}
            </span>
          </a>
        )}

        {/* System Message */}
        {message.type === "SYSTEM" && (
          <div className="text-xs text-gray-500 dark:text-gray-400 italic px-1">
            {message.content}
          </div>
        )}

        {/* Deleted Message */}
        {message.isDeleted && (
          <div className="text-xs text-gray-400 dark:text-gray-500 italic px-1">
            This message was deleted
          </div>
        )}
      </div>
    </div>
  );
}
