// File: src/lib/hooks/useNotificationStream.ts

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface NotificationStreamMessage {
  type: "notification" | "connection" | "heartbeat" | "error";
  id?: string;
  eventType?: string;
  priority?: string;
  subject?: string;
  message?: string;
  data?: Record<string, string | number | boolean | null>;
  organizationId?: string;
  propertyId?: string;
  timestamp: string;
  userId?: string;
}

export interface UseNotificationStreamOptions {
  organizationId?: string;
  propertyId?: string;
  onNotification?: (notification: NotificationStreamMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

export interface NotificationStreamState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: NotificationStreamMessage | null;
  connectionCount: number;
}

/**
 * React hook for connecting to the real-time notification stream
 * Uses Server-Sent Events (SSE) for reliable real-time communication
 */
export function useNotificationStream(
  options: UseNotificationStreamOptions = {}
) {
  const { data: session } = useSession();
  const {
    organizationId,
    propertyId,
    onNotification,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectDelay = 3000
  } = options;

  const [state, setState] = useState<NotificationStreamState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    connectionCount: 0
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Function refs to avoid circular dependencies
  const connectRef = useRef<() => void>(() => {});
  const disconnectRef = useRef<() => void>(() => {});

  // Store callbacks in refs to prevent dependency issues
  const callbacksRef = useRef({
    onConnect,
    onNotification,
    onDisconnect,
    onError
  });

  // Update callbacks ref when they change
  callbacksRef.current = {
    onConnect,
    onNotification,
    onDisconnect,
    onError
  };
  const maxReconnectAttempts = 5;

  /**
   * Connect to the notification stream
   */
  const connect = useCallback(() => {
    if (!session?.user?.id || eventSourceRef.current) {
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Build SSE URL with query parameters
      const url = new URL("/api/notifications/stream", window.location.origin);
      if (organizationId)
        url.searchParams.set("organizationId", organizationId);
      if (propertyId) url.searchParams.set("propertyId", propertyId);

      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      // Handle connection opened
      eventSource.addEventListener("connected", () => {
        console.log("✅ Notification stream connected");
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          connectionCount: prev.connectionCount + 1
        }));
        reconnectAttemptsRef.current = 0;
        callbacksRef.current.onConnect?.();
      });

      // Handle notifications
      eventSource.addEventListener("notification", (event) => {
        try {
          const notification: NotificationStreamMessage = JSON.parse(
            event.data
          );
          console.log("📨 Received notification:", notification);

          setState((prev) => ({ ...prev, lastMessage: notification }));
          callbacksRef.current.onNotification?.(notification);
        } catch (error) {
          console.error("Failed to parse notification:", error);
        }
      });

      // Handle heartbeat
      eventSource.addEventListener("heartbeat", () => {
        // Heartbeat received, connection is alive
        console.debug("💓 Heartbeat received");
      });

      // Handle errors
      eventSource.onerror = (event) => {
        console.error("❌ Notification stream error:", event);

        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: "Connection error"
        }));

        callbacksRef.current.onError?.(event);

        // Attempt reconnection if enabled
        if (
          autoReconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          console.log(
            `🔄 Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            disconnectRef.current?.();
            connectRef.current?.();
          }, reconnectDelay * reconnectAttemptsRef.current); // Exponential backoff
        }
      };

      // Handle connection closed
      eventSource.addEventListener("close", () => {
        console.log("🔌 Notification stream closed");
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));
        callbacksRef.current.onDisconnect?.();
      });
    } catch (error) {
      console.error("Failed to create EventSource:", error);
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : "Connection failed"
      }));
    }
  }, [
    session?.user?.id,
    organizationId,
    propertyId,
    autoReconnect,
    reconnectDelay
  ]); // Remove callback dependencies to prevent infinite loops

  /**
   * Disconnect from the notification stream
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false
    }));
  }, []);

  // Assign functions to refs to avoid circular dependencies
  connectRef.current = connect;
  disconnectRef.current = disconnect;

  /**
   * Manually trigger reconnection
   */
  const reconnect = useCallback(() => {
    disconnectRef.current?.();
    reconnectAttemptsRef.current = 0;
    setTimeout(() => connectRef.current?.(), 1000);
  }, []); // No dependencies needed since we use refs

  // Auto-connect when session is available
  useEffect(() => {
    if (session?.user?.id) {
      connectRef.current?.();
    }

    return () => {
      disconnectRef.current?.();
    };
  }, [session?.user?.id]); // Only depend on session

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectRef.current?.();
    };
  }, []); // Empty dependency array for cleanup only

  return {
    ...state,
    connect,
    disconnect,
    reconnect
  };
}

/**
 * Hook for displaying notification toasts
 * Automatically shows toast notifications for incoming messages
 */
export function useNotificationToasts(
  options: UseNotificationStreamOptions = {}
) {
  const [notifications, setNotifications] = useState<
    NotificationStreamMessage[]
  >([]);

  const handleNotification = useCallback(
    (notification: NotificationStreamMessage) => {
      if (notification.type === "notification") {
        setNotifications((prev) => [...prev, notification]);

        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notification.id)
          );
        }, 5000);
      }
    },
    []
  );

  const stream = useNotificationStream({
    ...options,
    onNotification: handleNotification
  });

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    ...stream,
    notifications,
    dismissNotification,
    clearAllNotifications
  };
}
