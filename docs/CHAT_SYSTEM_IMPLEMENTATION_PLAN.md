# In-App Chat System - Implementation Plan

> **Status**: ✅ Ready for Implementation
> **Timeline**: 10 days (5 phases)
> **Cost**: $0/month (Ably free tier)
> **Tech Stack**: Ably + Vercel + PostgreSQL + React

---

## 🎯 Quick Summary

This document outlines the complete implementation plan for a real-time chat system in your property management SaaS application.

**Key Features:**

- ✅ Real-time messaging with WebSockets (Ably)
- ✅ Organization-wide, property-specific, and direct messages
- ✅ Online/offline status tracking
- ✅ Typing indicators
- ✅ Read receipts
- ✅ File attachments (images + documents, 10MB max)
- ✅ In-app + email notifications (60-min delay)
- ✅ 90-day message retention
- ✅ Auto-suggest users based on property/org
- ✅ All staff can create group chats (property-specific)

**Architecture:**

- **Frontend**: React components with Ably Realtime client
- **Backend**: Next.js API routes on Vercel
- **Real-time**: Ably (managed WebSocket service)
- **Database**: PostgreSQL (existing) for metadata
- **Storage**: Ably for message history (90 days)

**Cost:** $0/month (free tier covers 50-100 users)

---

## 📋 Executive Summary

### Current Infrastructure Analysis

Your app already has:

- ✅ **Redis (ioredis)** - Perfect for WebSocket pub/sub
- ✅ **SSE infrastructure** - For real-time notifications
- ✅ **S3 uploads** - For file attachments
- ✅ **Multi-tenant architecture** - Organization/Property isolation
- ✅ **Role-based access control** - User permissions

### Recommendation

Use **Ably** (managed WebSocket service) - works perfectly with Vercel, no custom server needed, built-in scaling and reliability.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  • ChatProvider (Context with Ably client)                   │
│  • useAblyChat (Hook)                                        │
│  • ChatWindow Component                                      │
│  • MessageList, MessageInput, UserList                       │
└─────────────────────────────────────────────────────────────┘
                            ↕ Ably Realtime
┌─────────────────────────────────────────────────────────────┐
│                   VERCEL (Next.js API Routes)                │
├─────────────────────────────────────────────────────────────┤
│  • /api/chat/auth (Ably token authentication)                │
│  • /api/chat/rooms (CRUD operations)                         │
│  • /api/chat/messages (Message history)                      │
│  • /api/chat/upload (File attachments)                       │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    ABLY (Managed Service)                    │
├─────────────────────────────────────────────────────────────┤
│  • WebSocket connections (auto-scaling)                      │
│  • Pub/Sub channels (rooms)                                  │
│  • Presence (online/offline status)                          │
│  • Message history (90-day retention)                        │
│  • Typing indicators (ephemeral messages)                    │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    REDIS LAYER (Optional)                    │
├─────────────────────────────────────────────────────────────┤
│  • Unread counts cache                                       │
│  • User presence cache (supplement Ably)                     │
│  • Rate limiting                                             │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                       │
├─────────────────────────────────────────────────────────────┤
│  • ChatRoom (1-1, group, property, org channels)             │
│  • ChatMessage (metadata, references Ably messages)          │
│  • ChatParticipant (user membership in rooms)                │
│  • ChatReadReceipt (per-user, per-message)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Prisma Schema Additions

Add the following to `prisma/schema.prisma`:

```prisma
// Enums
enum ChatRoomType {
  DIRECT          // 1-on-1 chat
  GROUP           // Group chat
  PROPERTY        // Property-wide channel
  ORGANIZATION    // Org-wide channel
}

enum MessageType {
  TEXT
  IMAGE
  DOCUMENT
  SYSTEM          // "User joined", "User left"
}

// Models
model ChatRoom {
  id              String          @id @default(cuid())
  type            ChatRoomType
  name            String?         // For group chats
  organizationId  String
  propertyId      String?         // Null for org-wide rooms
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  lastMessageAt   DateTime?

  organization    Organization    @relation(fields: [organizationId], references: [id])
  property        Property?       @relation(fields: [propertyId], references: [id])

  participants    ChatParticipant[]
  messages        ChatMessage[]

  @@index([organizationId])
  @@index([propertyId])
  @@index([lastMessageAt])
}

model ChatParticipant {
  id              String          @id @default(cuid())
  roomId          String
  userId          String
  joinedAt        DateTime        @default(now())
  lastReadAt      DateTime?       // Last time user read messages
  isMuted         Boolean         @default(false)

  room            ChatRoom        @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user            User            @relation(fields: [userId], references: [id])

  @@unique([roomId, userId])
  @@index([userId])
  @@index([roomId])
}

model ChatMessage {
  id              String          @id @default(cuid())
  roomId          String
  senderId        String
  type            MessageType     @default(TEXT)
  content         String?         @db.Text
  attachmentUrl   String?
  attachmentName  String?
  attachmentSize  Int?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  isEdited        Boolean         @default(false)
  isDeleted       Boolean         @default(false)

  room            ChatRoom        @relation(fields: [roomId], references: [id], onDelete: Cascade)
  sender          User            @relation(fields: [senderId], references: [id])
  readReceipts    ChatReadReceipt[]

  @@index([roomId, createdAt])
  @@index([senderId])
}

model ChatReadReceipt {
  id              String          @id @default(cuid())
  messageId       String
  userId          String
  readAt          DateTime        @default(now())

  message         ChatMessage     @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user            User            @relation(fields: [userId], references: [id])

  @@unique([messageId, userId])
  @@index([userId])
  @@index([messageId])
}
```

### Model Relationships

Add to existing models:

```prisma
// Add to User model:
model User {
  // ... existing fields
  chatParticipants  ChatParticipant[]
  chatMessages      ChatMessage[]
  chatReadReceipts  ChatReadReceipt[]
}

// Add to Organization model:
model Organization {
  // ... existing fields
  chatRooms         ChatRoom[]
}

// Add to Property model:
model Property {
  // ... existing fields
  chatRooms         ChatRoom[]
}
```

---

## 📦 Dependencies to Install

```bash
# Ably for real-time messaging
npm install ably

# React Query for data fetching/caching
npm install @tanstack/react-query

# React Window for virtualized lists
npm install react-window

# Additional utilities
npm install date-fns clsx
npm install --save-dev @types/react-window
```

---

## 🔧 Implementation Phases

### Phase 1: Backend Infrastructure (Days 1-3)

#### 1.1 Ably Setup & Configuration

**File: `.env.local`**

Add Ably credentials:

```bash
ABLY_API_KEY=your_ably_api_key
NEXT_PUBLIC_ABLY_PUBLIC_KEY=your_ably_public_key
```

**File: `src/lib/chat/ably-config.ts`**

Create Ably configuration:

- Initialize Ably client
- Configure channels
- Set up authentication

**File: `src/app/api/chat/auth/route.ts`**

Create Ably token authentication endpoint:

- Verify NextAuth session
- Generate Ably token with user context
- Return token for client connection

#### 1.2 Chat API Routes

Create the following API endpoints:

| Endpoint                                     | Method | Description              |
| -------------------------------------------- | ------ | ------------------------ |
| `/api/chat/rooms`                            | POST   | Create new chat room     |
| `/api/chat/rooms`                            | GET    | List user's chat rooms   |
| `/api/chat/rooms/[id]`                       | GET    | Get room details         |
| `/api/chat/rooms/[id]/messages`              | GET    | Get messages (paginated) |
| `/api/chat/messages/[id]/read`               | POST   | Mark message as read     |
| `/api/chat/upload`                           | POST   | Upload file attachment   |
| `/api/chat/rooms/[id]/participants`          | GET    | Get room participants    |
| `/api/chat/rooms/[id]/participants`          | POST   | Add participant          |
| `/api/chat/rooms/[id]/participants/[userId]` | DELETE | Remove participant       |

#### 1.3 Database Schema & Auto-Room Creation

**File: `prisma/schema.prisma`**

Add chat models (already defined above)

**File: `src/lib/chat/room-service.ts`**

Implement auto-room creation:

- **Organization created** → Auto-create `#company-wide` channel
- **Property created** → Auto-create `#{propertyName}-general` channel
- **First DM** → Auto-create direct message room

**File: `src/lib/chat/hooks.ts`**

Create Prisma middleware hooks:

```typescript
// On Organization.create → createOrgChannel()
// On Property.create → createPropertyChannel()
```

---

### Phase 2: Real-time Features (Days 4-5)

#### 2.1 Ably Channels & Events

**Channel Structure:**

```typescript
// Channel naming convention
const channels = {
  // Organization-wide channel
  org: `org:${organizationId}:company-wide`,

  // Property-specific channel
  property: `org:${organizationId}:property:${propertyId}:general`,

  // Group chat channel
  group: `org:${organizationId}:group:${groupId}`,

  // Direct message channel (sorted user IDs for consistency)
  direct: `org:${organizationId}:dm:${userId1}-${userId2}`,

  // Presence channel (online status)
  presence: `org:${organizationId}:presence`
};
```

**Message Events:**

```typescript
// Publish message to channel
channel.publish("message", {
  id: messageId,
  senderId: userId,
  content: string,
  type: "TEXT" | "IMAGE" | "DOCUMENT",
  attachmentUrl: string,
  timestamp: Date
});

// Subscribe to messages
channel.subscribe("message", (message) => {
  // Handle incoming message
});

// Typing indicator (ephemeral)
channel.publish("typing", {
  userId: string,
  userName: string,
  isTyping: boolean
});

// Read receipt
channel.publish("read", {
  messageId: string,
  userId: string,
  readAt: Date
});
```

#### 2.2 Online Status System (Ably Presence)

**Implementation:**

Ably has built-in presence - no custom implementation needed!

```typescript
// Enter presence (auto on connect)
const presenceChannel = ably.channels.get(`org:${orgId}:presence`);
await presenceChannel.presence.enter({
  userId: user.id,
  userName: user.name,
  role: user.role
});

// Subscribe to presence changes
presenceChannel.presence.subscribe("enter", (member) => {
  // User came online
  console.log(`${member.data.userName} is online`);
});

presenceChannel.presence.subscribe("leave", (member) => {
  // User went offline
  console.log(`${member.data.userName} is offline`);
});

// Get all online users
const onlineUsers = await presenceChannel.presence.get();
```

**Features:**

- ✅ Auto-detect disconnects (no heartbeat needed)
- ✅ Handles network issues gracefully
- ✅ Real-time presence updates
- ✅ No Redis needed for presence

#### 2.3 Typing Indicators

**Implementation:**

Use Ably's ephemeral messages (not persisted):

```typescript
// User starts typing (debounced 500ms)
const handleTyping = debounce(() => {
  channel.publish("typing", {
    userId: user.id,
    userName: user.name,
    isTyping: true
  });
}, 500);

// User stops typing
const handleStopTyping = () => {
  channel.publish("typing", {
    userId: user.id,
    userName: user.name,
    isTyping: false
  });
};

// Subscribe to typing events
channel.subscribe("typing", (message) => {
  const { userId, userName, isTyping } = message.data;

  if (isTyping) {
    showTypingIndicator(userName);
    // Auto-hide after 3 seconds
    setTimeout(() => hideTypingIndicator(userId), 3000);
  } else {
    hideTypingIndicator(userId);
  }
});
```

**Features:**

- ✅ Ephemeral (not stored in history)
- ✅ Debounced on client (500ms)
- ✅ Auto-hide after 3 seconds
- ✅ No Redis needed

---

### Phase 3: Frontend Components (Days 6-8)

#### 3.1 Core Components Structure

```
src/components/chat/
├── ChatProvider.tsx          # Context provider with Ably client
├── ChatWindow.tsx            # Main chat interface
├── ChatSidebar.tsx           # Room list with unread counts
├── MessageList.tsx           # Virtualized message list
├── MessageItem.tsx           # Individual message component
├── MessageInput.tsx          # Rich text input with attachments
├── UserStatusBadge.tsx       # Online/offline indicator
├── TypingIndicator.tsx       # "User is typing..." component
├── FileUploadPreview.tsx     # File preview before upload
├── ChatHeader.tsx            # Room header with participants
├── NewChatDialog.tsx         # Create new group chat
└── hooks/
    ├── useAblyChat.ts        # Ably connection hook
    ├── useChatRooms.ts       # Room management hook
    ├── useChatMessages.ts    # Message management hook
    ├── usePresence.ts        # Online status hook
    └── useTypingIndicator.ts # Typing indicator hook
```

#### 3.2 ChatProvider Implementation

**File: `src/components/chat/ChatProvider.tsx`**

Features:

- Ably client initialization with token auth
- Auto-reconnect (built-in to Ably)
- Connection state management
- Channel subscriptions
- Context for child components

**Key State:**

```typescript
interface ChatContextState {
  ably: Ably.Realtime | null;
  isConnected: boolean;
  isConnecting: boolean;
  rooms: ChatRoom[];
  activeRoomId: string | null;
  onlineUsers: Map<string, PresenceData>; // userId -> presence data
  typingUsers: Map<string, Set<string>>; // roomId -> Set<userId>
  sendMessage: (
    roomId: string,
    content: string,
    type: MessageType
  ) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
}
```

#### 3.3 Message List Features

- **Infinite Scroll**: Load older messages on scroll up
- **Virtualization**: Use `react-window` for performance
- **Message Grouping**: Group by date and sender
- **Read Receipts**: Show checkmarks (sent/delivered/read)
- **Optimistic Updates**: Show message immediately, update on confirmation

#### 3.4 Message Input Features

- **Rich Text**: Basic formatting (bold, italic, links)
- **File Attachments**: Drag & drop or click to upload
- **Emoji Picker**: Optional emoji support
- **Typing Indicator**: Debounced typing events
- **Message Queue**: Queue messages during disconnect

---

### Phase 4: Performance Optimization (Days 9-10)

#### 4.1 Lazy Loading Strategy

```typescript
// Lazy load chat module
const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow"), {
  loading: () => <ChatLoadingSkeleton />,
  ssr: false
});

// Code splitting for chat bundle
// Estimated bundle size: ~150KB (gzipped: ~45KB)
```

#### 4.2 Caching Strategy

**Multi-Layer Caching:**

1. **Redis Cache** (Server-side)

   - Recent 50 messages per room
   - TTL: 5 minutes
   - Invalidate on new message

2. **React Query Cache** (Client-side)

   - Message history
   - Room list
   - Stale-while-revalidate pattern

3. **IndexedDB** (Optional, for offline support)
   - Store messages locally
   - Sync on reconnect

**Cache Keys:**

```typescript
// React Query keys
["chat", "rooms", userId][("chat", "messages", roomId, page)][
  ("chat", "participants", roomId)
];
```

#### 4.3 Connection Management

**Auto-Reconnect Logic:**

```typescript
const reconnectConfig = {
  maxAttempts: 10,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 1.5 // Exponential backoff
};

// Reconnect delays: 1s, 1.5s, 2.25s, 3.37s, 5s, 7.5s, 11.25s, ...
```

**Message Queue During Disconnect:**

- Queue messages in localStorage
- Retry on reconnect
- Show pending status in UI
- Max queue size: 50 messages

#### 4.4 Performance Metrics

**Target Metrics:**

- Initial load: < 2 seconds
- Message send latency: < 100ms
- Typing indicator latency: < 200ms
- Memory usage: < 50MB (for 1000 messages)
- Bundle size: < 150KB (gzipped: < 45KB)

**Optimization Techniques:**

- Debounce typing events (500ms)
- Throttle scroll events (100ms)
- Virtualize message list (render only visible)
- Lazy load images
- Compress large messages
- Limit active connections (1 per tab)

---

## 🎨 UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard Header                    [🔔] [💬] [👤]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┬──────────────────────────────────┐   │
│  │  Chat Rooms  │  Messages                         │   │
│  ├──────────────┤                                   │   │
│  │ 🟢 John Doe  │  John Doe          10:30 AM      │   │
│  │   Hey there! │  ┌─────────────────────────┐     │   │
│  │              │  │ Hey, how's it going?    │     │   │
│  │ 🔴 Jane S.   │  └─────────────────────────┘     │   │
│  │   Typing...  │                                   │   │
│  │              │  You                 10:31 AM     │   │
│  │ # Property 1 │      ┌─────────────────────────┐ │   │
│  │   5 unread   │      │ All good! Working on... │ │   │
│  │              │      └─────────────────────────┘ │   │
│  │ # Org Chat   │                                   │   │
│  │              │  John is typing...               │   │
│  │              │                                   │   │
│  │              │  ┌─────────────────────────────┐ │   │
│  │              │  │ [📎] Type a message...      │ │   │
│  │              │  └─────────────────────────────┘ │   │
│  └──────────────┴──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Visual Indicators

**Online Status:**

- 🟢 **Green dot** = Online (active in last 60s)
- 🟡 **Yellow dot** = Away (inactive 5-15 min)
- 🔴 **Red dot** = Offline (>15 min)

**Message Status:**

- ✓ **Single check** = Sent to server
- ✓✓ **Double check** = Delivered to recipient
- ✓✓ **Blue checks** = Read by recipient

**Room Types:**

- 👤 **Direct message** = User avatar
- 👥 **Group chat** = Group icon
- 🏢 **Property channel** = # Property Name
- 🌐 **Organization channel** = # Org Name

### Responsive Design

**Desktop (>1024px):**

- Two-column layout (sidebar + messages)
- Sidebar width: 300px
- Message area: Remaining width

**Tablet (768px - 1024px):**

- Collapsible sidebar
- Full-width messages when sidebar collapsed

**Mobile (<768px):**

- Single view (rooms OR messages)
- Slide transition between views
- Floating action button for new chat

---

## ⚡ Performance Considerations

### 1. Prevent App Slowdown

**Lazy Loading:**

```typescript
// Only load chat when user clicks chat icon
const ChatModule = dynamic(() => import("@/components/chat"), {
  loading: () => <Skeleton />,
  ssr: false
});
```

**Bundle Optimization:**

- Separate chunk for chat module
- Tree-shake unused Socket.io features
- Compress with Brotli

**Resource Management:**

- Disconnect socket when tab inactive >5 min
- Pause message polling when chat closed
- Limit concurrent image loads (3 max)

### 2. Message Optimization

**Pagination:**

- Load 50 messages per page
- Infinite scroll for older messages
- Prefetch next page on scroll

**Caching:**

- Redis: Recent 50 messages (5 min TTL)
- React Query: All loaded messages
- IndexedDB: Offline support (optional)

**Compression:**

- Gzip large messages (>1KB)
- Binary protocol for attachments
- WebP format for images

### 3. Connection Efficiency

**Single WebSocket:**

- One connection for all rooms
- Multiplexing via room IDs
- Binary frames for large data

**Smart Heartbeat:**

- Only when tab active
- Adaptive interval (30s-60s)
- Piggyback on user activity

**Disconnect Strategy:**

- Auto-disconnect after 5 min inactivity
- Reconnect on user interaction
- Queue messages during disconnect

---

## 🔒 Security & Privacy

### 1. Authentication & Authorization

**Socket Authentication:**

```typescript
// Verify NextAuth session on socket connect
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const session = await verifySession(token);

  if (!session) {
    return next(new Error("Unauthorized"));
  }

  socket.userId = session.user.id;
  socket.orgId = session.user.orgId;
  next();
});
```

**Room Access Control:**

- Verify user has access to organization
- Check property-level permissions
- Validate participant membership

**Rate Limiting:**

- 10 messages per minute per user
- 100 typing events per minute
- 1000 read receipts per minute

### 2. Data Isolation

**Multi-Tenant Security:**

- Enforce organization boundaries
- Property-level room isolation
- RLS (Row Level Security) in database

**Message Encryption:**

- TLS for transport (wss://)
- Optional E2E encryption for sensitive data
- Encrypted attachments in S3

### 3. Content Moderation

**Input Validation:**

- XSS prevention (sanitize HTML)
- SQL injection protection (Prisma)
- File type validation (whitelist)

**File Upload Security:**

- Max size: 10MB per file
- Allowed types: images, PDF, Word, Excel
- Virus scanning (optional, via ClamAV)

**Content Filtering:**

- Profanity filter (optional)
- Spam detection
- Link validation

---

## 📊 Monitoring & Analytics

### 1. Metrics to Track

**Connection Metrics:**

- Active connections (gauge)
- Connection errors (counter)
- Reconnection rate (rate)
- Average connection duration (histogram)

**Message Metrics:**

- Messages per second (rate)
- Message delivery latency (histogram)
- Failed deliveries (counter)
- Message size distribution (histogram)

**Performance Metrics:**

- Socket.io event loop lag
- Redis response time
- Database query time
- Memory usage per connection

### 2. Logging Strategy

**Log Levels:**

- **ERROR**: Connection failures, message delivery errors
- **WARN**: Rate limit violations, slow queries
- **INFO**: User connections, room joins
- **DEBUG**: Message events, typing indicators

**Log Structure:**

```typescript
{
  timestamp: '2025-01-11T10:30:00Z',
  level: 'INFO',
  event: 'chat:message',
  userId: 'user_123',
  roomId: 'room_456',
  messageId: 'msg_789',
  latency: 45, // ms
  metadata: { /* additional context */ }
}
```

### 3. Alerting

**Critical Alerts:**

- Connection failure rate >5%
- Message delivery failure rate >1%
- Redis connection lost
- Database connection pool exhausted

**Warning Alerts:**

- Average latency >500ms
- Memory usage >80%
- Disk usage >90%
- Rate limit violations >100/min

---

## 🚀 Deployment Considerations

### 1. Deployment Solution: Ably + Vercel ✅

**✅ Solution Chosen:** Ably (Managed WebSocket Service)

**Why Ably?**

- ✅ **Works perfectly with Vercel** - No custom server needed
- ✅ **Built-in scaling** - Auto-scales to millions of connections
- ✅ **99.999% uptime SLA** - Enterprise reliability
- ✅ **Global edge network** - Low latency worldwide
- ✅ **Generous free tier** - 6M messages/month, 200 concurrent connections
- ✅ **Built-in features** - Presence, history, push notifications
- ✅ **No infrastructure management** - Focus on features, not DevOps

**Pricing:**

- **Free Tier**: 6M messages/month, 200 concurrent connections
- **Estimated Usage** (50 users, moderate activity):
  - ~500K messages/month
  - ~50 concurrent connections
  - **Cost: $0/month** (within free tier)
- **Growth Plan** ($29/month): 20M messages, 500 connections
- **Scale Plan** ($99/month): 100M messages, 2000 connections

**No Cons:**

- ❌ ~~Vendor lock-in~~ - Ably uses standard protocols, easy to migrate
- ❌ ~~Cost at scale~~ - Free tier covers most small-medium businesses
- ❌ ~~Less control~~ - Full control via Ably API and webhooks

### 2. Final Architecture (Ably + Vercel)

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Next.js)                      │
│  • UI Components (React)                                 │
│  • API Routes (REST)                                     │
│  • Ably Token Auth (/api/chat/auth)                      │
│  • Static Assets                                         │
└─────────────────────────────────────────────────────────┘
                            ↕ HTTPS/WSS
┌─────────────────────────────────────────────────────────┐
│                    Ably (Managed)                        │
│  • WebSocket connections (auto-scaling)                  │
│  • Pub/Sub channels (rooms)                              │
│  • Presence (online/offline status)                      │
│  • Message history (90-day retention)                    │
│  • Push notifications                                    │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│              Upstash Redis (Optional)                    │
│  • Unread counts cache                                   │
│  • Rate limiting                                         │
│  • Session data                                          │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                  PostgreSQL (Your DB)                    │
│  • Chat rooms & participants                             │
│  • Message metadata (references Ably)                    │
│  • User data                                             │
│  • Read receipts                                         │
└─────────────────────────────────────────────────────────┘
```

### 3. Scaling Strategy

**Ably Auto-Scaling (Built-in):**

- ✅ **Automatic horizontal scaling** - No configuration needed
- ✅ **Global edge network** - 15+ regions worldwide
- ✅ **Connection state recovery** - Handles network issues
- ✅ **Message ordering** - Guaranteed delivery order
- ✅ **Presence scaling** - Handles thousands of online users

**Database Scaling:**

- Optimize queries with proper indexes
- Use connection pooling (Prisma)
- Consider read replicas for high traffic

**Cost Estimation:**

- **Ably**: $0/month (free tier covers 50-100 users)
- **Upstash Redis**: $0/month (free tier, optional)
- **PostgreSQL**: Existing (no extra cost)
- **Vercel**: Existing (no extra cost)
- **Total: $0/month** 🎉

**When to Upgrade:**

- **200+ concurrent users** → Ably Growth Plan ($29/month)
- **500+ concurrent users** → Ably Scale Plan ($99/month)
- **Enterprise (1000+ users)** → Custom pricing

---

## ✅ Configuration Decisions (FINALIZED)

### 1. Deployment Platform

- ✅ **Vercel** with **Ably** (managed WebSocket service)
- No custom server needed
- Built-in scaling and 99.999% uptime SLA

### 2. Chat Scope

- ✅ **Organization-wide channels** (e.g., `#company-wide`)
- ✅ **Property-specific channels** (e.g., `#sunrise-hotel-general`)
- ✅ **Direct messages** (1-on-1 conversations)
- ✅ **Group chats** (property-specific only, all staff can create)
- 🔮 **Future**: Cross-property groups (add setting/toggle)

### 3. Room Structure & Auto-Creation

- ✅ **Auto-create** `#company-wide` when organization is created
- ✅ **Auto-create** `#{propertyName}-general` when property is created
- ✅ **Auto-create** direct message rooms on first message
- ✅ **All staff** can create group chats (not just managers)
- ✅ **Property-specific groups only** (no cross-property for now)

### 4. Naming Convention

- Organization channel: `#company-wide`
- Property channels: `#{propertyName}-general`
- Group chats: Custom names (set by creator)
- Direct messages: User names

### 5. User Discovery

- ✅ **Auto-suggest** based on property/organization assignment
- Show users from same property first
- Then show users from same organization
- Include recent conversation partners

### 6. Message History

- ✅ **90 days** retention
- Auto-delete messages older than 90 days
- Reduces storage costs and complies with data policies

### 7. File Attachments

- ✅ **Images**: PNG, JPG, GIF, WebP
- ✅ **Documents**: PDF, Word (.docx, .doc)
- ✅ **Max size**: 10MB per file
- ❌ **Not supported**: Videos, executables, archives

### 8. Notifications

- ✅ **In-app push notifications** (toast/banner) - immediate
- ✅ **Email notifications** - only if unread after 60 minutes
- Smart batching to avoid email spam

### 9. Advanced Features (Future Roadmap)

#### 🔮 Cross-Property Groups (Priority Feature)

**Implementation Plan:**

1. **Add Organization Setting:**

   ```prisma
   model Organization {
     // ... existing fields
     allowCrossPropertyGroups Boolean @default(false)
   }
   ```

2. **Update ChatRoom Model:**

   ```prisma
   model ChatRoom {
     // ... existing fields
     allowedPropertyIds String[] // Empty = all properties, or specific IDs
   }
   ```

3. **UI Changes:**

   - Add toggle in Organization Settings: "Allow cross-property group chats"
   - When creating group chat, show property selector (if enabled)
   - Filter user suggestions based on selected properties

4. **Permission Logic:**
   ```typescript
   // Can user create cross-property group?
   const canCreateCrossPropertyGroup =
     org.allowCrossPropertyGroups &&
     (user.role === "ORG_ADMIN" || user.role === "PROPERTY_MGR");
   ```

**Use Cases:**

- Regional managers coordinating across multiple properties
- Department heads (e.g., all housekeeping managers)
- IT support team serving multiple properties
- Executive team discussions

**TODO:**

- [ ] Add `allowCrossPropertyGroups` field to Organization model
- [ ] Update group creation UI with property selector
- [ ] Add permission checks in API routes
- [ ] Update user discovery to include cross-property users
- [ ] Add property badges in group member list

---

#### 🔮 Other Future Features

- 🔮 Message editing/deletion
- 🔮 Message reactions (emoji)
- 🔮 Voice messages
- 🔮 Video calls
- 🔮 Screen sharing

### 10. Privacy & Compliance

- ✅ TLS encryption for transport
- ✅ 90-day message retention policy
- ✅ Multi-tenant data isolation
- 🔮 GDPR compliance (data export) - future

---

## 📝 Implementation Checklist

### Phase 1: Backend (Days 1-3) - 🔄 IN PROGRESS

- [/] **Sign up for Ably account (free tier)** - 🔄 IN PROGRESS
  - ✅ Added Ably config to `.env.example`
  - ✅ Created `docs/ABLY_SETUP_GUIDE.md` with step-by-step instructions
  - ⏳ **ACTION REQUIRED**: Follow guide to sign up and get API keys
- [ ] Install dependencies (ably, react-query, react-window)
- [ ] Add Ably credentials to `.env.local`
- [ ] Create Prisma schema (ChatRoom, ChatMessage, ChatParticipant, ChatReadReceipt)
- [ ] Run database migration (`prisma migrate dev`)
- [ ] Create Ably token auth endpoint (`/api/chat/auth/route.ts`)
- [ ] Build REST API routes (rooms, messages, participants)
- [ ] Implement auto-room creation hooks (org/property channels)
- [ ] Test Ably connection and token auth

### Phase 2: Real-time (Days 4-5)

- [ ] Set up Ably channels (org, property, group, direct)
- [ ] Implement Ably Presence for online status
- [ ] Add typing indicators (ephemeral messages)
- [ ] Create read receipt system
- [ ] Implement message publishing/subscribing
- [ ] Test message delivery and ordering
- [ ] Test auto-reconnection (Ably handles this)
- [ ] Test with multiple users/tabs

### Phase 3: Frontend (Days 6-8)

- [ ] Create ChatProvider with Ably client
- [ ] Build useAblyChat hook
- [ ] Build ChatWindow component
- [ ] Implement MessageList (virtualized with react-window)
- [ ] Create MessageInput with attachments
- [ ] Add UserStatusBadge (online/offline/away)
- [ ] Build ChatSidebar with room list and unread counts
- [ ] Implement file upload preview (images + documents)
- [ ] Add typing indicator UI
- [ ] Create NewChatDialog (for group chats)
- [ ] Add user discovery/search (property-based)
- [ ] Test responsive design (desktop/tablet/mobile)

### Phase 4: Optimization & Notifications (Days 9-10)

- [ ] Lazy load chat module (dynamic import)
- [ ] Implement React Query caching
- [ ] Optimize bundle size (tree-shaking)
- [ ] Add error boundaries
- [ ] Implement in-app notifications (toast)
- [ ] Create email notification system (60-min delay)
- [ ] Add notification preferences UI
- [ ] Test performance metrics (load time, latency)
- [ ] Test with 50+ concurrent users
- [ ] Final testing & bug fixes

### Phase 5: Deployment & Documentation

- [ ] Add Ably credentials to Vercel environment variables
- [ ] Deploy to Vercel production
- [ ] Test production environment (real users)
- [ ] Set up Ably monitoring dashboard
- [ ] Configure email notifications (SendGrid)
- [ ] Test 90-day message retention
- [ ] Create user documentation (how to use chat)
- [ ] Create developer documentation (architecture, APIs)
- [ ] Train team on chat features

---

## 📚 Additional Resources

### Documentation

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Redis Pub/Sub Guide](https://redis.io/docs/manual/pubsub/)
- [React Query Guide](https://tanstack.com/query/latest)
- [Next.js Custom Server](https://nextjs.org/docs/advanced-features/custom-server)

### Example Implementations

- [Socket.io Chat Example](https://github.com/socketio/socket.io/tree/main/examples/chat)
- [Next.js + Socket.io](https://github.com/vercel/next.js/tree/canary/examples/custom-server)
- [Redis Adapter Example](https://socket.io/docs/v4/redis-adapter/)

### Performance Tools

- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
- [Redis CLI](https://redis.io/docs/ui/cli/)

---

## 🎉 Next Steps

1. **Review this document** and answer the questions above
2. **Approve the architecture** or suggest changes
3. **Confirm deployment strategy** (Vercel + separate server vs managed service)
4. **Set timeline** for implementation
5. **Start Phase 1** - Backend infrastructure

Once you provide answers to the questions, I'll start implementing the chat system! 🚀
