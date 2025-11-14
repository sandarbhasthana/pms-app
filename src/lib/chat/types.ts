/**
 * Chat System Types
 * 
 * Shared TypeScript types for the chat system
 */

import { ChatRoomType, MessageType } from '@prisma/client';

/**
 * Chat Room with participants and last message
 */
export interface ChatRoomWithDetails {
  id: string;
  type: ChatRoomType;
  name: string | null;
  organizationId: string;
  propertyId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
  participants: ChatParticipantWithUser[];
  lastMessage?: ChatMessageWithSender;
  unreadCount?: number;
}

/**
 * Chat Participant with user details
 */
export interface ChatParticipantWithUser {
  id: string;
  roomId: string;
  userId: string;
  joinedAt: Date;
  lastReadAt: Date | null;
  isMuted: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

/**
 * Chat Message with sender details
 */
export interface ChatMessageWithSender {
  id: string;
  roomId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  isDeleted: boolean;
  sender: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  readReceipts?: ChatReadReceiptWithUser[];
}

/**
 * Read Receipt with user details
 */
export interface ChatReadReceiptWithUser {
  id: string;
  messageId: string;
  userId: string;
  readAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

/**
 * API Request/Response Types
 */

// Create Room Request
export interface CreateRoomRequest {
  type: ChatRoomType;
  name?: string;
  organizationId: string;
  propertyId?: string;
  participantIds: string[]; // User IDs to add to the room
}

// Create Direct Message Request
export interface CreateDirectMessageRequest {
  organizationId: string;
  recipientId: string; // The other user's ID
}

// Send Message Request
export interface SendMessageRequest {
  roomId: string;
  content?: string;
  type?: MessageType;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
}

// Update Message Request
export interface UpdateMessageRequest {
  content: string;
}

// Mark as Read Request
export interface MarkAsReadRequest {
  messageIds: string[];
}

// Add Participants Request
export interface AddParticipantsRequest {
  userIds: string[];
}

// Paginated Messages Response
export interface PaginatedMessagesResponse {
  messages: ChatMessageWithSender[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Room List Response
export interface RoomListResponse {
  rooms: ChatRoomWithDetails[];
  total: number;
}

/**
 * Ably Real-time Event Payloads
 */

// Message sent event
export interface MessageSentEvent {
  message: ChatMessageWithSender;
  roomId: string;
}

// Message edited event
export interface MessageEditedEvent {
  messageId: string;
  content: string;
  roomId: string;
  editedAt: Date;
}

// Message deleted event
export interface MessageDeletedEvent {
  messageId: string;
  roomId: string;
  deletedAt: Date;
}

// Message read event
export interface MessageReadEvent {
  messageId: string;
  userId: string;
  roomId: string;
  readAt: Date;
}

// Typing event
export interface TypingEvent {
  userId: string;
  userName: string;
  roomId: string;
  isTyping: boolean;
}

// User joined room event
export interface UserJoinedEvent {
  userId: string;
  userName: string;
  roomId: string;
  joinedAt: Date;
}

// User left room event
export interface UserLeftEvent {
  userId: string;
  userName: string;
  roomId: string;
  leftAt: Date;
}

