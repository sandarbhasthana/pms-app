# In-App Chat System - Implementation Plan

## 📋 Executive Summary

### Current Infrastructure Analysis

Your app already has:

- ✅ **Redis (ioredis)** - Perfect for WebSocket pub/sub
- ✅ **SSE infrastructure** - For real-time notifications
- ✅ **S3 uploads** - For file attachments
- ✅ **Multi-tenant architecture** - Organization/Property isolation
- ✅ **Role-based access control** - User permissions

### Recommendation

Use **Socket.io** for WebSockets (better than raw WebSockets) + leverage your existing Redis for horizontal scaling.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  • ChatProvider (Context)                                    │
│  • useChatSocket (Hook)                                      │
│  • ChatWindow Component                                      │
│  • MessageList, MessageInput, UserList                       │
└─────────────────────────────────────────────────────────────┘
                            ↕ Socket.io
┌─────────────────────────────────────────────────────────────┐
│                   WEBSOCKET SERVER                           │
├─────────────────────────────────────────────────────────────┤
│  • /api/chat/socket (Custom Server)                          │
│  • Socket.io with Redis Adapter                              │
│  • Authentication Middleware                                 │
│  • Room Management (org/property/direct)                     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    REDIS LAYER                               │
├─────────────────────────────────────────────────────────────┤
│  • Pub/Sub for multi-instance scaling                        │
│  • Online status tracking (sorted sets)                      │
│  • Typing indicators (TTL keys)                              │
│  • Message cache (recent 50 messages per room)               │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                       │
├─────────────────────────────────────────────────────────────┤
│  • ChatRoom (1-1, group, property, org channels)             │
│  • ChatMessage (text, attachments, read receipts)            │
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
npm install socket.io socket.io-client @socket.io/redis-adapter
npm install --save-dev @types/socket.io
```

---

## 🔧 Implementation Phases

### Phase 1: Backend Infrastructure (Days 1-3)

#### 1.1 Socket.io Server Setup

**File: `server/socket-server.ts`**

Create custom server with:

- Socket.io initialization
- Redis adapter integration
- Authentication middleware
- Connection management

**File: `server.js` (Custom Next.js Server)**

Integrate Socket.io with Next.js:

- HTTP server creation
- Socket.io attachment
- Next.js request handler

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

#### 1.3 Redis Services

**File: `src/lib/chat/redis-service.ts`**

Implement:

- **Online Status Tracking**: Redis sorted sets with timestamps
- **Typing Indicators**: Redis keys with 3-second TTL
- **Message Caching**: Recent 50 messages per room
- **Unread Counts**: Redis hash for quick access

**Redis Key Structure:**

```
chat:online:{userId}                    // User online status
chat:typing:{roomId}:{userId}           // Typing indicator (TTL: 3s)
chat:messages:{roomId}                  // Cached messages (list)
chat:unread:{userId}:{roomId}           // Unread count (hash)
chat:presence:{organizationId}          // Online users in org (sorted set)
```

---

### Phase 2: Real-time Features (Days 4-5)

#### 2.1 WebSocket Events

**Client → Server Events:**

```typescript
interface ClientToServerEvents {
  "chat:join_room": (roomId: string) => void;
  "chat:leave_room": (roomId: string) => void;
  "chat:send_message": (data: SendMessageData) => void;
  "chat:typing_start": (roomId: string) => void;
  "chat:typing_stop": (roomId: string) => void;
  "chat:mark_read": (messageId: string) => void;
  "chat:request_history": (roomId: string, before: Date, limit: number) => void;
}

interface SendMessageData {
  roomId: string;
  content: string;
  type: "TEXT" | "IMAGE" | "DOCUMENT";
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
}
```

**Server → Client Events:**

```typescript
interface ServerToClientEvents {
  "chat:message": (message: ChatMessagePayload) => void;
  "chat:user_online": (userId: string, timestamp: Date) => void;
  "chat:user_offline": (userId: string, timestamp: Date) => void;
  "chat:typing": (roomId: string, userId: string, userName: string) => void;
  "chat:typing_stop": (roomId: string, userId: string) => void;
  "chat:read_receipt": (
    messageId: string,
    userId: string,
    readAt: Date
  ) => void;
  "chat:message_history": (roomId: string, messages: ChatMessage[]) => void;
  "chat:error": (error: { code: string; message: string }) => void;
  "chat:room_updated": (room: ChatRoom) => void;
}
```

#### 2.2 Online Status System

**Implementation:**

- Redis sorted set with timestamps
- Heartbeat every 30 seconds from client
- Auto-offline after 60 seconds of inactivity
- Presence broadcast to relevant rooms

**Algorithm:**

```typescript
// On connect
ZADD chat:presence:{orgId} {timestamp} {userId}

// On heartbeat (every 30s)
ZADD chat:presence:{orgId} {timestamp} {userId}

// Check offline users (run every 60s)
ZREMRANGEBYSCORE chat:presence:{orgId} 0 {timestamp - 60s}

// Get online users
ZRANGEBYSCORE chat:presence:{orgId} {timestamp - 60s} +inf
```

#### 2.3 Typing Indicators

**Implementation:**

- Redis key with 3-second TTL
- Debounced on client (500ms)
- Broadcast to room participants only

**Flow:**

```typescript
// User starts typing
SET chat:typing:{roomId}:{userId} "1" EX 3
PUBLISH chat:typing:{roomId} {userId, userName}

// User stops typing (explicit)
DEL chat:typing:{roomId}:{userId}
PUBLISH chat:typing_stop:{roomId} {userId}

// Auto-expire after 3s (TTL)
```

---

### Phase 3: Frontend Components (Days 6-8)

#### 3.1 Core Components Structure

```
src/components/chat/
├── ChatProvider.tsx          # Context provider with socket connection
├── ChatWindow.tsx            # Main chat interface
├── ChatSidebar.tsx           # Room list with unread counts
├── MessageList.tsx           # Virtualized message list
├── MessageItem.tsx           # Individual message component
├── MessageInput.tsx          # Rich text input with attachments
├── UserStatusBadge.tsx       # Online/offline indicator
├── TypingIndicator.tsx       # "User is typing..." component
├── FileUploadPreview.tsx     # File preview before upload
├── ChatHeader.tsx            # Room header with participants
└── hooks/
    ├── useChatSocket.ts      # Socket connection hook
    ├── useChatRooms.ts       # Room management hook
    ├── useChatMessages.ts    # Message management hook
    └── useTypingIndicator.ts # Typing indicator hook
```

#### 3.2 ChatProvider Implementation

**File: `src/components/chat/ChatProvider.tsx`**

Features:

- Socket.io connection management
- Auto-reconnect with exponential backoff
- Connection state management
- Event listener registration
- Context for child components

**Key State:**

```typescript
interface ChatContextState {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  rooms: ChatRoom[];
  activeRoomId: string | null;
  onlineUsers: Set<string>;
  typingUsers: Map<string, Set<string>>; // roomId -> Set<userId>
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

### 1. Vercel Deployment Challenge

**⚠️ Problem:** Vercel doesn't support WebSockets natively (serverless functions)

**Solutions:**

#### Option A: Separate WebSocket Server (Recommended)

- Deploy Socket.io server on Railway/Render/AWS
- Next.js app on Vercel (API routes + UI)
- Connect via wss://chat.yourdomain.com

**Pros:**

- Full WebSocket support
- Horizontal scaling
- Independent deployment

**Cons:**

- Additional infrastructure
- Cross-origin setup
- Extra cost (~$5-20/month)

#### Option B: Managed Service (Easiest)

- Use Pusher, Ably, or Socket.io Cloud
- No server management
- Built-in scaling

**Pros:**

- Zero infrastructure
- Instant setup
- Generous free tier

**Cons:**

- Vendor lock-in
- Cost at scale (~$50-200/month)
- Less control

#### Option C: Polling Fallback

- Use long-polling for Vercel
- WebSockets for self-hosted
- Graceful degradation

**Pros:**

- Works on Vercel
- No extra infrastructure

**Cons:**

- Higher latency (1-2s)
- More server load
- Not true real-time

### 2. Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Next.js)                      │
│  • UI Components                                         │
│  • API Routes (REST)                                     │
│  • Static Assets                                         │
└─────────────────────────────────────────────────────────┘
                            ↕ HTTPS
┌─────────────────────────────────────────────────────────┐
│              Railway/Render (Socket.io Server)           │
│  • WebSocket connections                                 │
│  • Real-time events                                      │
│  • Redis adapter                                         │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                    Upstash Redis                         │
│  • Pub/Sub                                               │
│  • Online status                                         │
│  • Message cache                                         │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                  PostgreSQL (Supabase)                   │
│  • Persistent storage                                    │
│  • Message history                                       │
│  • User data                                             │
└─────────────────────────────────────────────────────────┘
```

### 3. Scaling Strategy

**Horizontal Scaling:**

- Multiple Socket.io instances
- Redis adapter for pub/sub
- Load balancer with sticky sessions (optional)

**Vertical Scaling:**

- Increase server resources
- Optimize Redis memory
- Database connection pooling

**Cost Estimation:**

- Railway/Render: $5-20/month (1-2 instances)
- Upstash Redis: Free tier (10K commands/day)
- PostgreSQL: Existing (no extra cost)
- **Total: ~$5-20/month**

---

## 🎯 Questions for You

Before implementation, please clarify:

### 1. Deployment Platform

- [ ] Are you deploying on Vercel?
- [ ] Willing to use separate WebSocket server (Railway/Render)?
- [ ] Or prefer managed service (Pusher/Ably)?

### 2. Chat Scope

- [ ] Organization-wide chat?
- [ ] Property-specific chat?
- [ ] Direct messages between users?
- [ ] All of the above?

### 3. User Discovery

How should users find others to chat with?

- [ ] Search by name/email/role
- [ ] Auto-suggest based on property assignment
- [ ] Only within assigned properties
- [ ] Organization directory

### 4. Message History

How long to keep messages?

- [ ] Forever (unlimited)
- [ ] 90 days
- [ ] 1 year
- [ ] Configurable per organization

### 5. File Attachments

What file types to support?

- [ ] Images only (PNG, JPG, GIF)
- [ ] Documents (PDF, Word, Excel)
- [ ] All files (with size limit)
- **Suggested size limit:** 10MB per file

### 6. Notifications

Should chat messages trigger:

- [ ] In-app notifications (toast)
- [ ] Email notifications (if offline)
- [ ] SMS notifications (urgent only)
- [ ] Push notifications (mobile)

### 7. Advanced Features (Optional)

- [ ] Message editing/deletion
- [ ] Message reactions (emoji)
- [ ] Voice messages
- [ ] Video calls (future)
- [ ] Screen sharing (future)

### 8. Privacy & Compliance

- [ ] End-to-end encryption required?
- [ ] GDPR compliance needed?
- [ ] Message retention policy?
- [ ] Data export functionality?

---

## 📝 Implementation Checklist

### Phase 1: Backend (Days 1-3)

- [ ] Install dependencies (Socket.io, Redis adapter)
- [ ] Create Prisma schema (ChatRoom, ChatMessage, etc.)
- [ ] Run database migration
- [ ] Set up Socket.io server
- [ ] Implement authentication middleware
- [ ] Create Redis services (online status, typing)
- [ ] Build REST API routes
- [ ] Test WebSocket connections

### Phase 2: Real-time (Days 4-5)

- [ ] Implement WebSocket events
- [ ] Build online status system
- [ ] Add typing indicators
- [ ] Create read receipt system
- [ ] Test message delivery
- [ ] Test reconnection logic
- [ ] Load testing (100+ concurrent users)

### Phase 3: Frontend (Days 6-8)

- [ ] Create ChatProvider context
- [ ] Build ChatWindow component
- [ ] Implement MessageList (virtualized)
- [ ] Create MessageInput with attachments
- [ ] Add UserStatusBadge
- [ ] Build ChatSidebar with room list
- [ ] Implement file upload preview
- [ ] Add typing indicator UI
- [ ] Test responsive design

### Phase 4: Optimization (Days 9-10)

- [ ] Lazy load chat module
- [ ] Implement React Query caching
- [ ] Add Redis message cache
- [ ] Optimize bundle size
- [ ] Test performance metrics
- [ ] Add error boundaries
- [ ] Implement offline queue
- [ ] Final testing & bug fixes

### Phase 5: Deployment

- [ ] Set up WebSocket server (Railway/Render)
- [ ] Configure environment variables
- [ ] Set up Redis (Upstash)
- [ ] Deploy to production
- [ ] Test production environment
- [ ] Monitor metrics
- [ ] Document for team

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
