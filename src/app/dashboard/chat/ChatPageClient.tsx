"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/ui/spinner";

// Dynamic import with SSR disabled - Ably requires client-side only
const ChatInterface = dynamic(
  () =>
    import("@/components/chat/ChatInterface").then((mod) => mod.ChatInterface),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }
);

export function ChatPageClient() {
  return <ChatInterface />;
}

