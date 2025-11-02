# Right-Click Calendar Cell Context Menu Implementation Plan

## 📋 Overview

Replace the current left-click instant booking sheet with a right-click context menu that provides three options:
1. **Create Booking** - Opens NewBookingSheet
2. **Block Room** - Creates a maintenance/unavailability block
3. **Room Information** - Displays room details

---

## 🎯 Goals

1. **Prevent accidental booking sheet opens** - Remove left-click trigger
2. **Add right-click context menu** - Show flyout with 3 options
3. **Implement room blocking** - Create maintenance/issue blocks
4. **Display room information** - Show room type details in a modal

---

## 🏗️ Architecture

### 1. **Calendar Cell Click Handling**

**Current Implementation:**
- `handleDateClick` in `/dashboard/bookings/page.tsx` (lines 770-867)
- Triggered by `dateClick` event in FullCalendar
- Immediately opens NewBookingSheet with selected slot

**New Implementation:**
- Disable left-click opening of NewBookingSheet
- Add right-click handler using FullCalendar's native event handling
- Show context menu flyout at cursor position

---

### 2. **Context Menu Flyout Component**

**New Component:** `src/components/bookings/CalendarCellFlyout.tsx`

**Features:**
- Positioned at cursor location (x, y coordinates)
- Three menu options with icons
- Closes on outside click or option selection
- Theme-aware styling (light/dark mode)

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
  setFlyout: (flyout: CalendarCellFlyoutProps['flyout']) => void;
  onCreateBooking: (roomId: string, roomName: string, date: string) => void;
  onBlockRoom: (roomId: string, roomName: string, date: string) => void;
  onRoomInfo: (roomId: string, roomName: string) => void;
}
```

**Menu Options:**
1. **Create Booking** 
   - Icon: `PlusCircleIcon` (blue)
   - Action: Opens NewBookingSheet
   
2. **Block Room**
   - Icon: `LockClosedIcon` (orange)
   - Action: Opens BlockRoomSheet
   
3. **Room Information**
   - Icon: `InformationCircleIcon` (purple)
   - Action: Opens RoomInfoModal

---

### 3. **Room Blocking System**

#### 3.1 Database Schema

**Option A: Extend Reservation Model (Recommended)**
- Add `blockType` field to Reservation model
- Values: `null` (regular booking), `MAINTENANCE`, `ISSUE`, `OTHER`
- Add `blockReason` field (string)
- Blocks are reservations with `blockType !== null`

**Option B: New RoomBlock Model**
- Separate table for room blocks
- Similar structure to Reservation but simpler
- Fields: `id`, `roomId`, `startDate`, `endDate`, `blockType`, `reason`, `createdBy`, `createdAt`

**Recommendation:** Use Option A (extend Reservation) because:
- Reuses existing calendar rendering logic
- Blocks show up automatically in availability checks
- Simpler to maintain (one model for all room unavailability)

#### 3.2 Block Types

```typescript
enum BlockType {
  MAINTENANCE = "MAINTENANCE",
  ISSUE = "ISSUE",
  RENOVATION = "RENOVATION",
  CLEANING = "CLEANING",
  OTHER = "OTHER"
}
```

#### 3.3 API Endpoints

**POST `/api/room-blocks`**
- Create a new room block
- Body: `{ roomId, startDate, endDate, blockType, reason }`
- Returns: Created block object

**GET `/api/room-blocks?propertyId=xxx`**
- Fetch all blocks for a property
- Used for calendar display

**DELETE `/api/room-blocks/[id]`**
- Remove a block
- Only allowed for future blocks

#### 3.4 BlockRoomSheet Component

**New Component:** `src/components/bookings/BlockRoomSheet.tsx`

**Features:**
- Similar UI to NewBookingSheet but simpler
- Fields:
  - Room (pre-filled, read-only)
  - Start Date (pre-filled from clicked cell)
  - End Date (date picker)
  - Block Type (dropdown)
  - Reason (textarea)
- Validation:
  - End date must be >= start date
  - Cannot block past dates
  - Reason required for ISSUE and OTHER types
- Visual indicator: Orange/red theme to distinguish from bookings

**Calendar Display:**
- Blocks shown with distinct styling (striped pattern or different color)
- Block events have `display: 'background'` or custom rendering
- Tooltip shows block type and reason on hover

---

### 4. **Room Information Display**

#### 4.1 Data Source

**API Endpoint:** `GET /api/rooms/[id]`
- Already exists (lines 32-47 in `src/app/api/rooms/[id]/route.ts`)
- Returns room with `roomType`, `pricing`, and `property` included

**Room Data Structure:**
```typescript
interface RoomDetails {
  id: string;
  name: string;
  type: string;
  capacity: number;
  imageUrl?: string;
  description?: string;
  sizeSqFt?: number;
  doorlockId?: string;
  roomType?: {
    name: string;
    maxOccupancy: number;
    maxAdults: number;
    maxChildren: number;
    description?: string;
    amenities: string[];
    customAmenities: string[];
    featuredImageUrl?: string;
  };
  pricing?: {
    basePrice: number;
    weekdayPrice?: number;
    weekendPrice?: number;
    currency: string;
  };
}
```

#### 4.2 RoomInfoModal Component

**New Component:** `src/components/bookings/RoomInfoModal.tsx`

**Features:**
- Modal/Sheet display (use Sheet for consistency)
- Sections:
  1. **Room Overview**
     - Room number/name
     - Room type
     - Featured image (if available)
  
  2. **Capacity & Occupancy**
     - Max occupancy
     - Max adults
     - Max children
     - Size (sq ft)
  
  3. **Amenities**
     - Standard amenities (chips/badges)
     - Custom amenities
  
  4. **Pricing**
     - Base price
     - Weekday price
     - Weekend price
     - Currency
  
  5. **Additional Info**
     - Description
     - Door lock ID (if applicable)

**Styling:**
- Clean, card-based layout
- Icons for each section
- Theme-aware colors
- Responsive design

---

## 📝 Implementation Steps

### Phase 1: Context Menu Foundation (2-3 hours)

1. **Create CalendarCellFlyout Component**
   - [ ] Create `src/components/bookings/CalendarCellFlyout.tsx`
   - [ ] Implement positioning logic (x, y coordinates)
   - [ ] Add three menu options with icons
   - [ ] Handle outside click to close
   - [ ] Add theme-aware styling

2. **Update Calendar Click Handling**
   - [ ] Modify `handleDateClick` in `/dashboard/bookings/page.tsx`
   - [ ] Change from left-click to right-click detection
   - [ ] Store flyout state (roomId, roomName, date, x, y)
   - [ ] Prevent default context menu on calendar cells

3. **Integrate Flyout with Calendar**
   - [ ] Add flyout state to bookings page
   - [ ] Pass handlers to CalendarCellFlyout
   - [ ] Test flyout positioning and closing behavior

### Phase 2: Room Blocking System (3-4 hours)

1. **Database Schema Updates**
   - [ ] Add migration to extend Reservation model
   - [ ] Add `blockType` field (enum: MAINTENANCE, ISSUE, RENOVATION, CLEANING, OTHER)
   - [ ] Add `blockReason` field (string)
   - [ ] Run migration: `prisma migrate dev`

2. **API Endpoints**
   - [ ] Create `src/app/api/room-blocks/route.ts` (POST, GET)
   - [ ] Create `src/app/api/room-blocks/[id]/route.ts` (DELETE)
   - [ ] Add validation and error handling
   - [ ] Test endpoints with Postman/Thunder Client

3. **BlockRoomSheet Component**
   - [ ] Create `src/components/bookings/BlockRoomSheet.tsx`
   - [ ] Implement form with validation
   - [ ] Add date range picker
   - [ ] Add block type dropdown
   - [ ] Add reason textarea
   - [ ] Implement submit handler
   - [ ] Add success/error toasts

4. **Calendar Integration**
   - [ ] Fetch blocks in bookings page
   - [ ] Add blocks to calendar events
   - [ ] Style blocks differently (striped pattern, distinct color)
   - [ ] Add tooltip showing block details
   - [ ] Test block creation and display

### Phase 3: Room Information Display (2-3 hours)

1. **RoomInfoModal Component**
   - [ ] Create `src/components/bookings/RoomInfoModal.tsx`
   - [ ] Implement data fetching from `/api/rooms/[id]`
   - [ ] Design layout with sections
   - [ ] Add loading and error states
   - [ ] Style with theme-aware colors

2. **Integration**
   - [ ] Add modal state to bookings page
   - [ ] Connect "Room Information" menu option
   - [ ] Test with different room types
   - [ ] Verify all data displays correctly

### Phase 4: Testing & Polish (1-2 hours)

1. **Functional Testing**
   - [ ] Test right-click on all calendar cells
   - [ ] Test all three menu options
   - [ ] Test block creation with different types
   - [ ] Test room info display for various rooms
   - [ ] Test edge cases (past dates, overlapping blocks)

2. **UI/UX Polish**
   - [ ] Ensure consistent styling across components
   - [ ] Add smooth animations/transitions
   - [ ] Verify dark mode compatibility
   - [ ] Test responsive behavior on mobile
   - [ ] Add keyboard shortcuts (ESC to close)

3. **Documentation**
   - [ ] Update user documentation
   - [ ] Add code comments
   - [ ] Document API endpoints

---

## 🎨 Visual Design

### Context Menu Flyout
```
┌─────────────────────────────┐
│ 📅 Create Booking           │ ← Blue icon
├─────────────────────────────┤
│ 🔒 Block Room               │ ← Orange icon
├─────────────────────────────┤
│ ℹ️  Room Information         │ ← Purple icon
└─────────────────────────────┘
```

### Block Display on Calendar
- **Color:** Orange/amber background with striped pattern
- **Text:** Block type (e.g., "MAINTENANCE")
- **Tooltip:** Full reason on hover
- **Opacity:** Slightly transparent to distinguish from bookings

---

## 🔧 Technical Considerations

### 1. Right-Click Detection
- Use `onContextMenu` event on calendar cells
- Prevent default browser context menu
- Capture mouse coordinates for flyout positioning

### 2. Calendar Event Rendering
- Blocks should not be draggable
- Blocks should not be clickable (no flyout menu on block events)
- Use custom event rendering for blocks

### 3. Availability Logic
- Update room availability checks to exclude blocked dates
- Blocks should prevent new bookings on those dates
- Show "Room Blocked" message when trying to book blocked dates

### 4. Permissions
- Only PROPERTY_MGR and above can create/delete blocks
- All roles can view blocks
- Add role checks in API endpoints

---

## 📊 Database Migration

```prisma
// Add to Reservation model in schema.prisma
model Reservation {
  // ... existing fields ...
  
  blockType   String?  // MAINTENANCE, ISSUE, RENOVATION, CLEANING, OTHER
  blockReason String?  // Reason for blocking the room
  
  // ... rest of model ...
}
```

**Migration Command:**
```bash
npx prisma migrate dev --name add_room_blocking
```

---

## 🚀 Expected Outcomes

1. **Better UX:** No more accidental booking sheet opens
2. **Room Management:** Easy way to block rooms for maintenance
3. **Information Access:** Quick access to room details without leaving calendar
4. **Visual Clarity:** Blocks clearly distinguished from bookings
5. **Operational Efficiency:** Staff can manage room availability more effectively

---

## 📅 Estimated Timeline

- **Phase 1:** 2-3 hours
- **Phase 2:** 3-4 hours
- **Phase 3:** 2-3 hours
- **Phase 4:** 1-2 hours

**Total:** 8-12 hours of development time

---

## ✅ Success Criteria

- [ ] Right-click on calendar cell shows context menu
- [ ] Left-click does nothing (or shows a subtle hint)
- [ ] All three menu options work correctly
- [ ] Blocks are created and displayed on calendar
- [ ] Blocks prevent new bookings on blocked dates
- [ ] Room information modal shows complete details
- [ ] Dark mode works correctly for all new components
- [ ] Mobile responsive design works well
- [ ] No performance degradation on calendar

---

## 🔄 Future Enhancements

1. **Recurring Blocks:** Block rooms on recurring schedule (e.g., every Monday for cleaning)
2. **Block Templates:** Save common block reasons as templates
3. **Bulk Blocking:** Block multiple rooms at once
4. **Block History:** View history of all blocks for a room
5. **Notifications:** Alert staff when blocks are about to expire
6. **Integration:** Sync blocks with maintenance management system


