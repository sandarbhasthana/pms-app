/**
 * Ably Configuration
 * 
 * This file contains the Ably client configuration for the chat system.
 * We use token authentication for security instead of exposing API keys to clients.
 */

import * as Ably from 'ably';

/**
 * Server-side Ably client (uses full API key with secret)
 * Only use this on the server side (API routes, server components)
 */
export function getServerAblyClient(): Ably.Realtime {
  const apiKey = process.env.ABLY_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ABLY_API_KEY is not defined in environment variables. ' +
      'Please add it to your .env.local file. ' +
      'See docs/ABLY_SETUP_GUIDE.md for instructions.'
    );
  }

  return new Ably.Realtime({
    key: apiKey,
    // Enable presence for online/offline status
    clientId: 'server',
    // Auto-connect
    autoConnect: true,
    // Recover connection state
    recover: true,
  });
}

/**
 * Get Ably REST client for server-side operations
 * Use this for publishing messages, managing channels, etc.
 */
export function getServerAblyRestClient(): Ably.Rest {
  const apiKey = process.env.ABLY_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ABLY_API_KEY is not defined in environment variables. ' +
      'Please add it to your .env.local file. ' +
      'See docs/ABLY_SETUP_GUIDE.md for instructions.'
    );
  }

  return new Ably.Rest({
    key: apiKey,
  });
}

/**
 * Channel naming conventions
 * These functions ensure consistent channel names across the app
 */
export const AblyChannels = {
  /**
   * Organization-wide channel (e.g., #company-wide)
   */
  org: (organizationId: string) => `org:${organizationId}:company-wide`,

  /**
   * Property-specific channel (e.g., #sunrise-hotel-general)
   */
  property: (organizationId: string, propertyId: string) =>
    `org:${organizationId}:property:${propertyId}:general`,

  /**
   * Group chat channel
   */
  group: (organizationId: string, groupId: string) =>
    `org:${organizationId}:group:${groupId}`,

  /**
   * Direct message channel (1-on-1)
   * User IDs are sorted to ensure consistent channel names
   */
  direct: (organizationId: string, userId1: string, userId2: string) => {
    const [user1, user2] = [userId1, userId2].sort();
    return `org:${organizationId}:dm:${user1}-${user2}`;
  },

  /**
   * Presence channel for online/offline status
   */
  presence: (organizationId: string) => `org:${organizationId}:presence`,

  /**
   * Typing indicator channel (per room)
   */
  typing: (roomId: string) => `room:${roomId}:typing`,
};

/**
 * Ably event names
 * Consistent event names for pub/sub
 */
export const AblyEvents = {
  // Message events
  MESSAGE_SENT: 'message:sent',
  MESSAGE_EDITED: 'message:edited',
  MESSAGE_DELETED: 'message:deleted',

  // Read receipt events
  MESSAGE_READ: 'message:read',

  // Typing events
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Room events
  ROOM_CREATED: 'room:created',
  ROOM_UPDATED: 'room:updated',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',

  // Presence events (built-in Ably events)
  PRESENCE_ENTER: 'enter',
  PRESENCE_LEAVE: 'leave',
  PRESENCE_UPDATE: 'update',
};

/**
 * Ably client options for browser
 */
export const clientOptions: Ably.ClientOptions = {
  // Token auth endpoint (we'll create this next)
  authUrl: '/api/chat/auth',
  authMethod: 'POST',
  // Enable presence
  echoMessages: false, // Don't echo our own messages
  // Auto-connect
  autoConnect: true,
  // Recover connection state
  recover: true,
  // Disconnect after 15 seconds of inactivity
  disconnectedRetryTimeout: 15000,
  // Suspend after 30 seconds
  suspendedRetryTimeout: 30000,
};

