# Right-Click Calendar Cell Context Menu - Final Implementation Plan

## 📋 Executive Summary

Based on thorough code analysis and user requirements, this document outlines the complete implementation plan for replacing left-click instant booking with a context menu system.

---

## 🎯 Confirmed Requirements

### 1. **Click Behavior**
- **Desktop:** Left-click shows context menu (NO right-click for now)
- **Mobile/Tablet:** Single tap shows context menu
- **Result:** NewBookingSheet NO LONGER opens directly on cell click

### 2. **Context Menu Options**

#### **Empty Cell Click:**
1. **Create Booking** - Opens NewBookingSheet
2. **Block Room** - Opens BlockRoomSheet  
3. **Room Information** - Opens RoomInfoSheet (view-only)

#### **Blocked Event Click:**
1. **Unblock Room** - Deletes the block
2. **Edit Block** - Opens BlockRoomSheet in edit mode

### 3. **Database Schema**
- **NEW MODEL:** `RoomBlock` (separate from Reservation)
- **API:** `/api/room-blocks` endpoints

### 4. **Block Rules**
- Start date: Today or future (NOT past)
- No overlapping blocks allowed
- Cannot block if reservation exists (show error + suggest moving reservation)
- Roles allowed: FRONT_DESK, MAINTENANCE, PROPERTY_MGR, HOUSEKEEPING

### 5. **Visual Design**
- **Block styling:** Orange striped pattern, italic labels
- **Menu positioning:** Top-left corner of menu positioned near bottom-right corner of clicked cell (slightly inside)
- **Room Info:** Blog-style layout with image slider, room details, amenities

---

## 🗄️ Database Schema

### New Model: RoomBlock

```prisma
model RoomBlock {
  id             String   @id @default(cuid())
  organizationId String
  propertyId     String
  roomId         String
  startDate      DateTime @db.Date
  endDate        DateTime @db.Date
  blockType      BlockType
  reason         String
  createdBy      String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  organization   Organization @relation(fields: [organizationId], references: [id])
  property       Property     @relation(fields: [propertyId], references: [id])
  room           Room         @relation(fields: [roomId], references: [id])
  user           User         @relation(fields: [createdBy], references: [id])
  
  @@index([organizationId])
  @@index([propertyId])
  @@index([roomId])
  @@index([startDate])
  @@index([endDate])
  @@index([createdBy])
}

enum BlockType {
  MAINTENANCE
  ISSUE
  RENOVATION
  CLEANING
  OTHER
}
```

**Migration Command:**
```bash
npx prisma migrate dev --name add_room_blocks
```

---

## 📁 Files to Create/Modify

### Phase 1: Context Menu Foundation

#### 1. **CalendarCellFlyout.tsx** (NEW)
**Path:** `src/components/bookings/CalendarCellFlyout.tsx`

**Props:**
```typescript
interface CalendarCellFlyoutProps {
  flyout: {
    roomId: string;
    roomName: string;
    date: string;
    x: number;
    y: number;
  } | null;
  flyoutRef: React.RefObject<HTMLDivElement>;
  setFlyout: (flyout: CalendarCellFlyoutProps["flyout"]) => void;
  onCreateBooking: (roomId: string, roomName: string, date: string) => void;
  onBlockRoom: (roomId: string, roomName: string, date: string) => void;
  onRoomInfo: (roomId: string, roomName: string) => void;
}
```

**Features:**
- Positioned at `(x, y)` coordinates with adjustment to keep menu inside cell
- Three menu options with Heroicons
- Theme-aware styling
- Outside click closes menu

#### 2. **Modify handleDateClick** in `/dashboard/bookings/page.tsx`
**Current:** Lines 770-819
**Change:** Instead of `setSelectedSlot()`, show context menu flyout

**New Logic:**
```typescript
const handleDateClick = useCallback((arg: DateClickArg) => {
  arg.jsEvent.preventDefault();
  arg.jsEvent.stopPropagation();
  
  const roomId = arg.resource?.id;
  const roomName = arg.resource?.title;
  const date = arg.date.toLocaleDateString("en-CA");
  
  // Check past date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (arg.date < today) {
    toast.error("Cannot create bookings in the past.");
    return;
  }
  
  // Only allow on individual rooms (not room types)
  if (roomId && roomName && arg.resource?.getParent()) {
    // Show context menu flyout
    setCellFlyout({
      roomId,
      roomName,
      date,
      x: arg.jsEvent.clientX,
      y: arg.jsEvent.clientY
    });
  }
}, []);
```

---

### Phase 2: Room Blocking System

#### 3. **BlockRoomSheet.tsx** (NEW)
**Path:** `src/components/bookings/BlockRoomSheet.tsx`

**Props:**
```typescript
interface BlockRoomSheetProps {
  blockData: {
    roomId: string;
    roomName: string;
    startDate: string;
    blockId?: string; // For edit mode
  } | null;
  setBlockData: (data: BlockRoomSheetProps["blockData"]) => void;
  onBlockCreated: () => void;
}
```

**Form Fields:**
- Room (read-only, pre-filled)
- Start Date (pre-filled from clicked cell, editable)
- End Date (date picker)
- Block Type (dropdown: MAINTENANCE, ISSUE, RENOVATION, CLEANING, OTHER)
- Reason (textarea, required for ISSUE and OTHER)

**Validation:**
- End date >= start date
- Start date >= today
- Check for overlapping blocks
- Check for existing reservations

#### 4. **API Routes** (NEW)

**POST `/api/room-blocks/route.ts`**
```typescript
// Create new block
// Validate: no overlaps, no existing reservations, date >= today
// Return: Created block object
```

**GET `/api/room-blocks/route.ts`**
```typescript
// Fetch all blocks for property
// Query: ?propertyId=xxx
// Return: Array of blocks
```

**DELETE `/api/room-blocks/[id]/route.ts`**
```typescript
// Delete block by ID
// Validate: User has permission
// Return: Success message
```

**PUT `/api/room-blocks/[id]/route.ts`**
```typescript
// Update block (edit mode)
// Validate: same as create
// Return: Updated block object
```

---

### Phase 3: Room Information Display

#### 5. **RoomInfoSheet.tsx** (NEW)
**Path:** `src/components/bookings/RoomInfoSheet.tsx`

**Props:**
```typescript
interface RoomInfoSheetProps {
  roomId: string | null;
  setRoomId: (id: string | null) => void;
}
```

**Layout:**
1. **Image Slider** (top) - All room images with navigation
2. **Room Overview** - Name, type, size
3. **Capacity** - Max occupancy, adults, children
4. **Amenities** - Standard + custom (chips/badges)
5. **Pricing** - Base, weekday, weekend prices
6. **Additional Info** - Description, door lock ID

**Data Source:** `GET /api/rooms/[id]` (already exists)

---

### Phase 4: Calendar Integration

#### 6. **Modify `/dashboard/bookings/page.tsx`**

**Add State:**
```typescript
const [cellFlyout, setCellFlyout] = useState<{
  roomId: string;
  roomName: string;
  date: string;
  x: number;
  y: number;
} | null>(null);

const [blockData, setBlockData] = useState<{
  roomId: string;
  roomName: string;
  startDate: string;
  blockId?: string;
} | null>(null);

const [roomInfoId, setRoomInfoId] = useState<string | null>(null);

const [blocks, setBlocks] = useState<RoomBlock[]>([]);
```

**Fetch Blocks:**
```typescript
useEffect(() => {
  if (propertyId) {
    fetch(`/api/room-blocks?propertyId=${propertyId}`)
      .then(res => res.json())
      .then(data => setBlocks(data))
      .catch(err => console.error(err));
  }
}, [propertyId]);
```

**Add Blocks to Calendar Events:**
```typescript
const blockEvents = blocks.map(block => ({
  id: `block-${block.id}`,
  resourceId: block.roomId,
  start: block.startDate,
  end: block.endDate,
  title: block.blockType,
  display: 'auto',
  backgroundColor: '#fb923c', // Orange
  textColor: '#1f2937',
  classNames: ['block-event'],
  extendedProps: {
    isBlock: true,
    blockId: block.id,
    blockType: block.blockType,
    reason: block.reason
  }
}));
```

**Handle Block Event Click:**
```typescript
const handleEventClick = useCallback((arg: EventClickArg) => {
  const { isBlock, blockId } = arg.event.extendedProps;
  
  if (isBlock) {
    // Show block flyout menu
    setBlockFlyout({
      blockId,
      roomId: arg.event.getResources()[0].id,
      roomName: arg.event.getResources()[0].title,
      x: arg.jsEvent.clientX,
      y: arg.jsEvent.clientY
    });
  } else {
    // Existing reservation flyout logic
    // ... (keep current implementation)
  }
}, []);
```

---

## 🎨 CSS Styling

### Block Event Styling

```css
/* Add to globals.css */
.fc-event.block-event {
  background: repeating-linear-gradient(
    45deg,
    #fb923c,
    #fb923c 10px,
    #fdba74 10px,
    #fdba74 20px
  ) !important;
  font-style: italic !important;
  border: 1px solid #ea580c !important;
}

.dark .fc-event.block-event {
  background: repeating-linear-gradient(
    45deg,
    #c2410c,
    #c2410c 10px,
    #ea580c 10px,
    #ea580c 20px
  ) !important;
  border: 1px solid #9a3412 !important;
}
```

---

## ✅ Implementation Checklist

### Phase 1: Context Menu (3-4 hours)
- [ ] Create `CalendarCellFlyout.tsx` component
- [ ] Add state for cell flyout in bookings page
- [ ] Modify `handleDateClick` to show flyout instead of opening NewBookingSheet
- [ ] Test flyout positioning on desktop and mobile
- [ ] Test outside click closes flyout
- [ ] Verify menu positioning near bottom-right of cell

### Phase 2: Room Blocking (4-5 hours)
- [ ] Create database migration for `RoomBlock` model
- [ ] Run migration: `prisma migrate dev --name add_room_blocks`
- [ ] Create `POST /api/room-blocks/route.ts`
- [ ] Create `GET /api/room-blocks/route.ts`
- [ ] Create `DELETE /api/room-blocks/[id]/route.ts`
- [ ] Create `PUT /api/room-blocks/[id]/route.ts`
- [ ] Create `BlockRoomSheet.tsx` component
- [ ] Add validation for overlapping blocks
- [ ] Add validation for existing reservations
- [ ] Test block creation and display

### Phase 3: Room Information (2-3 hours)
- [ ] Create `RoomInfoSheet.tsx` component
- [ ] Implement image slider
- [ ] Add room details sections
- [ ] Test with different room types
- [ ] Verify all data displays correctly

### Phase 4: Calendar Integration (2-3 hours)
- [ ] Fetch blocks in bookings page
- [ ] Add blocks to calendar events
- [ ] Style blocks with striped pattern
- [ ] Handle block event clicks
- [ ] Create `BlockEventFlyout.tsx` for blocked events
- [ ] Test unblock functionality
- [ ] Test edit block functionality

### Phase 5: Testing & Polish (2-3 hours)
- [ ] Test on desktop (Chrome, Firefox, Safari)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Test on tablet (iPad, Android tablet)
- [ ] Verify dark mode works correctly
- [ ] Test all permission checks
- [ ] Test edge cases (past dates, overlaps, etc.)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Performance testing

---

## 🚀 Total Estimated Time: 13-18 hours

---

## 📝 Notes

1. **Breaking Change:** This removes direct left-click booking, which may require user training
2. **Mobile UX:** Menu positioning must be tested thoroughly on small screens
3. **Performance:** Fetching blocks should be optimized (consider caching)
4. **Permissions:** All API endpoints must validate user roles
5. **Audit Trail:** Consider adding audit logs for block creation/deletion

---

## 🔄 Rollback Plan

If issues arise, revert `handleDateClick` to original implementation:
```typescript
// Restore line 806 in /dashboard/bookings/page.tsx
setSelectedSlot({ roomId, roomName, date: dateTab });
```

This will restore direct left-click booking behavior.

