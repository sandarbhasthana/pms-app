/**
 * NewMessageDialog Component
 *
 * Dialog to start a new 1-1 conversation with a user
 */

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { MessageSquarePlus, Loader2, Search } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export function NewMessageDialog() {
  const { data: session } = useSession();
  const { setActiveRoomId, refreshRooms } = useChat();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim() || !session?.user?.orgId) {
      setUsers([]);
      return;
    }

    setIsSearching(true);
    try {
      const url = `/api/users/search?q=${encodeURIComponent(
        query
      )}&organizationId=${session.user.orgId}`;
      console.log("Searching users with URL:", url);

      const response = await fetch(url);
      console.log("Search response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Search results:", data);
        // Filter out current user
        const filteredUsers = data.filter(
          (u: User) => u.id !== session.user.id
        );
        console.log("Filtered users:", filteredUsers);
        setUsers(filteredUsers);
      } else {
        const errorText = await response.text();
        console.error("Search failed:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartConversation = async (recipientId: string) => {
    if (!session?.user?.orgId) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: session.user.orgId,
          recipientId
        })
      });

      if (response.ok) {
        const room = await response.json();
        await refreshRooms();
        setActiveRoomId(room.id);
        setOpen(false);
        setSearchQuery("");
        setUsers([]);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="w-full outline-1 !outline-purple-800 text-purple-800 hover:bg-purple-800 hover:!text-[#f0f8f9] dark:!outline-[#f0f8f9] dark:!bg-purple-600 dark:!text-[#f0f8f9] dark:hover:!bg-purple-500" type="button">
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* User List */}
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : users.length > 0 ? (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleStartConversation(user.id)}
                  disabled={isCreating}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  type="button"
                >
                  <Avatar email={user.email} name={user.name} size="md" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  </div>
                </button>
              ))
            ) : searchQuery.trim() ? (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                No users found
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                Start typing to search for users
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
