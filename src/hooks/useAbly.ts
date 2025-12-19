/**
 * useAbly Hook
 *
 * Manages Ably Realtime connection with automatic token refresh
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as Ably from "ably";
import { useSession } from "next-auth/react";

export interface AblyConnectionState {
  client: Ably.Realtime | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

/**
 * Hook to manage Ably Realtime connection
 * Automatically connects when user is authenticated
 * Handles token refresh and reconnection
 */
export function useAbly() {
  const { data: session, status } = useSession();
  const [state, setState] = useState<AblyConnectionState>({
    client: null,
    isConnected: false,
    isConnecting: false,
    error: null
  });

  const clientRef = useRef<Ably.Realtime | null>(null);
  const isInitializing = useRef(false);

  // Initialize Ably client
  const initializeClient = useCallback(async () => {
    if (isInitializing.current || clientRef.current) {
      return;
    }

    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    isInitializing.current = true;
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Create Ably client with token auth
      const client = new Ably.Realtime({
        authUrl: "/api/chat/auth",
        authMethod: "POST",
        authHeaders: {
          "Content-Type": "application/json"
        },
        authParams: {
          organizationId: session.user.orgId
        },
        autoConnect: true,
        echoMessages: true // Receive our own messages for instant UI updates
      });

      // Connection state listeners
      client.connection.on("connected", () => {
        setState((prev) => ({
          ...prev,
          client,
          isConnected: true,
          isConnecting: false,
          error: null
        }));
      });

      client.connection.on("connecting", () => {
        setState((prev) => ({ ...prev, isConnecting: true }));
      });

      client.connection.on("disconnected", () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));
      });

      client.connection.on("suspended", () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));
      });

      client.connection.on("failed", (stateChange) => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: stateChange.reason?.message || "Connection failed"
        }));
      });

      client.connection.on("closed", () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));
      });

      clientRef.current = client;
    } catch {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: "Failed to initialize"
      }));
    } finally {
      isInitializing.current = false;
    }
  }, [session, status]);

  // Initialize on mount and when session changes
  useEffect(() => {
    initializeClient();

    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
    };
  }, [initializeClient]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.connect();
    } else {
      initializeClient();
    }
  }, [initializeClient]);

  // Manual disconnect function
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.close();
    }
  }, []);

  return {
    ...state,
    reconnect,
    disconnect
  };
}
