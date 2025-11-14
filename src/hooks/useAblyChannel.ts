/**
 * useAblyChannel Hook
 *
 * Subscribe to Ably channels and handle real-time messages
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as Ably from "ably";

export interface UseAblyChannelOptions {
  /**
   * Ably client instance
   */
  client: Ably.Realtime | null;

  /**
   * Channel name to subscribe to
   */
  channelName: string;

  /**
   * Event name to listen for (optional, listens to all events if not provided)
   */
  eventName?: string;

  /**
   * Callback when message is received
   */
  onMessage?: (message: Ably.Message) => void;

  /**
   * Skip subscription (useful for conditional subscriptions)
   */
  skip?: boolean;
}

/**
 * Hook to subscribe to an Ably channel and receive messages
 */
export function useAblyChannel({
  client,
  channelName,
  eventName,
  onMessage,
  skip = false
}: UseAblyChannelOptions) {
  const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const messageHandlerRef = useRef(onMessage);

  // Keep message handler ref up to date
  useEffect(() => {
    messageHandlerRef.current = onMessage;
  }, [onMessage]);

  // Subscribe to channel
  useEffect(() => {
    if (!client || skip || !channelName) {
      return;
    }

    try {
      // Get or create channel
      const ch = client.channels.get(channelName);
      channelRef.current = ch;
      setChannel(ch);

      // Message handler
      const handleMessage = (message: Ably.Message) => {
        if (messageHandlerRef.current) {
          messageHandlerRef.current(message);
        }
      };

      // Subscribe to channel
      if (eventName) {
        ch.subscribe(eventName, handleMessage);
      } else {
        ch.subscribe(handleMessage);
      }

      setIsSubscribed(true);
      setError(null);

      // Cleanup
      return () => {
        if (eventName) {
          ch.unsubscribe(eventName, handleMessage);
        } else {
          ch.unsubscribe(handleMessage);
        }
        setIsSubscribed(false);
      };
    } catch (err) {
      console.error(`Error subscribing to channel ${channelName}:`, err);
      setError(err instanceof Error ? err.message : "Subscription failed");
      setIsSubscribed(false);
    }
  }, [client, channelName, eventName, skip]);

  // Publish message to channel
  const publish = useCallback(
    async (eventName: string, data: unknown) => {
      if (!channelRef.current) {
        throw new Error("Channel not initialized");
      }

      try {
        await channelRef.current.publish(eventName, data);
      } catch (err) {
        console.error(`Error publishing to channel ${channelName}:`, err);
        throw err;
      }
    },
    [channelName]
  );

  // Get channel history
  const getHistory = useCallback(
    async (options?: { limit?: number; start?: number; end?: number }) => {
      if (!channelRef.current) {
        throw new Error("Channel not initialized");
      }

      try {
        const result = await channelRef.current.history(options);
        return result.items;
      } catch (err) {
        console.error(`Error getting history for channel ${channelName}:`, err);
        throw err;
      }
    },
    [channelName]
  );

  return {
    channel,
    isSubscribed,
    error,
    publish,
    getHistory
  };
}
