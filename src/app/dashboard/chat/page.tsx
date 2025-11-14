/**
 * Chat Page
 * 
 * Main chat interface with unified conversation list
 * Similar to Microsoft Teams layout
 */

import { ChatInterface } from "@/components/chat/ChatInterface";

export const metadata = {
  title: "Teams - Chat",
  description: "Team communication and messaging",
};

export default function ChatPage() {
  return <ChatInterface />;
}

