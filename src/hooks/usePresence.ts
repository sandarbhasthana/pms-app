/**
 * usePresence Hook
 *
 * Track user presence (online/offline) in Ably channels
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as Ably from "ably";

export interface PresenceMember {
  clientId: string;
  data?: unknown;
  action: "enter" | "update" | "leave" | "present";
  timestamp: number;
}

export interface UsePresenceOptions {
  /**
   * Ably client instance
   */
  client: Ably.Realtime | null;

  /**
   * Channel name to track presence
   */
  channelName: string;

  /**
   * Initial presence data to set when entering
   */
  initialData?: unknown;

  /**
   * Callback when presence changes
   */
  onPresenceChange?: (members: PresenceMember[]) => void;

  /**
   * Skip presence tracking
   */
  skip?: boolean;
}

/**
 * Hook to track presence in an Ably channel
 */
export function usePresence({
  client,
  channelName,
  initialData,
  onPresenceChange,
  skip = false
}: UsePresenceOptions) {
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [isPresent, setIsPresent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const presenceHandlerRef = useRef(onPresenceChange);

  // Keep presence handler ref up to date
  useEffect(() => {
    presenceHandlerRef.current = onPresenceChange;
  }, [onPresenceChange]);

  // Enter presence and subscribe to presence changes
  useEffect(() => {
    if (!client || skip || !channelName) {
      return;
    }

    let channel: Ably.RealtimeChannel;

    const setupPresence = async () => {
      try {
        // Get channel
        channel = client.channels.get(channelName);
        channelRef.current = channel;

        // Enter presence
        await channel.presence.enter(initialData);
        setIsPresent(true);
        console.log(`👋 Entered presence in channel: ${channelName}`);

        // Get initial presence members
        const presenceSet = await channel.presence.get();
        const initialMembers: PresenceMember[] = presenceSet.map((member) => ({
          clientId: member.clientId,
          data: member.data,
          action: member.action as PresenceMember["action"],
          timestamp: member.timestamp || Date.now()
        }));
        setMembers(initialMembers);

        // Subscribe to presence changes
        const handlePresenceUpdate = (
          presenceMessage: Ably.PresenceMessage
        ) => {
          setMembers((prev) => {
            const updated = [...prev];
            const index = updated.findIndex(
              (m) => m.clientId === presenceMessage.clientId
            );

            if (presenceMessage.action === "leave") {
              // Remove member
              if (index !== -1) {
                updated.splice(index, 1);
              }
            } else {
              // Add or update member
              const member: PresenceMember = {
                clientId: presenceMessage.clientId,
                data: presenceMessage.data,
                action: presenceMessage.action as PresenceMember["action"],
                timestamp: presenceMessage.timestamp || Date.now()
              };

              if (index !== -1) {
                updated[index] = member;
              } else {
                updated.push(member);
              }
            }

            // Call callback
            if (presenceHandlerRef.current) {
              presenceHandlerRef.current(updated);
            }

            return updated;
          });
        };

        channel.presence.subscribe(handlePresenceUpdate);

        setError(null);
      } catch (err) {
        console.error(
          `Error setting up presence for channel ${channelName}:`,
          err
        );
        setError(err instanceof Error ? err.message : "Presence setup failed");
        setIsPresent(false);
      }
    };

    setupPresence();

    // Cleanup
    return () => {
      if (channel) {
        channel.presence.leave().catch((err) => {
          console.error("Error leaving presence:", err);
        });
        channel.presence.unsubscribe();
        setIsPresent(false);
        console.log(`👋 Left presence in channel: ${channelName}`);
      }
    };
  }, [client, channelName, initialData, skip]);

  // Update presence data
  const updatePresence = useCallback(
    async (data: unknown) => {
      if (!channelRef.current) {
        throw new Error("Channel not initialized");
      }

      try {
        await channelRef.current.presence.update(data);
      } catch (err) {
        console.error(
          `Error updating presence in channel ${channelName}:`,
          err
        );
        throw err;
      }
    },
    [channelName]
  );

  return {
    members,
    isPresent,
    error,
    updatePresence
  };
}
