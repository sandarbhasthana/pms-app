/**
 * MessageInput Component
 *
 * Text input with file upload support
 */

"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  roomId: string;
}

export function MessageInput({ roomId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!message.trim() && !selectedFile) return;
    if (isSending) return;

    setIsSending(true);

    try {
      let attachmentUrl: string | undefined;
      let messageType: "TEXT" | "IMAGE" | "DOCUMENT" = "TEXT";

      // Upload file if selected
      if (selectedFile) {
        const uploadResponse = await fetch("/api/chat/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size
          })
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const {
          presignedUrl,
          publicUrl,
          messageType: type
        } = await uploadResponse.json();

        // Upload to S3
        const s3Response = await fetch(presignedUrl, {
          method: "PUT",
          body: selectedFile,
          headers: {
            "Content-Type": selectedFile.type
          }
        });

        if (!s3Response.ok) {
          throw new Error("Failed to upload file");
        }

        attachmentUrl = publicUrl;
        messageType = type;
      }

      // Send message
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message.trim() || selectedFile?.name || "",
          type: messageType,
          attachmentUrl
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Clear input
      setMessage("");
      removeFile();

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="bg-white dark:bg-[#2d3748] p-4 shadow-lg">
      {/* File Preview */}
      {selectedFile && (
        <div className="mb-3 flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <Paperclip className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
            {selectedFile.name}
          </span>
          <button
            type="button"
            onClick={removeFile}
            title="Remove file"
            className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded transition-colors"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isSending}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-2xl border-2 border-gray-200 dark:border-gray-600 px-4 py-3 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
            "bg-gray-50 dark:!bg-[#1a202c] text-gray-900 dark:!text-[#f0f8f9]",
            "placeholder:text-gray-400 dark:placeholder:text-gray-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200"
          )}
          style={{ maxHeight: "120px" }}
        />

        {/* File Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
          aria-label="Attach file"
        >
          <Paperclip className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={sendMessage}
          disabled={isSending || (!message.trim() && !selectedFile)}
          className={cn(
            "p-3 rounded-full transition-all duration-200",
            "bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          )}
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />
    </div>
  );
}
