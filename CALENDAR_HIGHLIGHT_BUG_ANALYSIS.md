# Calendar Highlight Bug Analysis

## Issue Description

When creating a new reservation or editing an existing reservation, the calendar day highlights (today's blueish-green color and weekend yellow colors) disappear. They only reappear after a hard refresh (F5).

## Root Cause Analysis

### The Real Problem

There are **TWO DIFFERENT reload functions** with different behaviors:

#### 1. **`handleEditBookingUpdate` reload** (lines 961-996)

```typescript
reload: async () => {
  // ... fetch reservations ...
  const api = calendarRef.current?.getApi();
  if (api) {
    api.removeAllEvents();
    await new Promise((resolve) => setTimeout(resolve, 50));
    api.refetchEvents(); // ← Tries to re-fetch highlights
  }
};
```

- Calls `removeAllEvents()` - removes ALL events
- Calls `refetchEvents()` - re-fetches from callback functions
- **Result:** Weekend highlights SHOULD reappear (they're callbacks)

#### 2. **Main `reload` function** (lines 1076-1150)

```typescript
const reload = async () => {
  // ... fetch reservations ...
  const api = calendarRef.current?.getApi();
  if (api) {
    api.removeAllEvents();  // ← Removes ALL events
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Manually adds only reservation events
    const calendarEvents = reservations.map(r => ({...}));
    api.addEventSource(calendarEvents);  // ← Only adds reservations!

    // ❌ DOES NOT call refetchEvents()
    // ❌ DOES NOT re-add highlights
  }
}
```

- Calls `removeAllEvents()` - removes ALL events including highlights
- Manually adds only reservation events
- **NEVER calls `refetchEvents()`** - so highlights are never re-fetched
- **Result:** BOTH today and weekend highlights disappear! 🚫

### Why Hard Refresh Works

- Hard refresh reloads the entire page
- Component re-mounts
- `eventSources` is recalculated from scratch
- All highlights are re-added to the calendar

## Technical Details

### Event Source Types in FullCalendar

1. **Static Event Source** (Object with `events` array):

   ```typescript
   { events: [...] }
   ```

   - NOT re-fetched by `refetchEvents()`
   - Only loaded once when calendar initializes

2. **Dynamic Event Source** (Callback function):
   ```typescript
   (info, success, failure) => { success([...]) }
   ```
   - RE-fetched by `refetchEvents()`
   - Called every time `refetchEvents()` is invoked

### Current Event Sources Structure

| Source             | Type          | Re-fetches? | Issue           |
| ------------------ | ------------- | ----------- | --------------- |
| Reservations       | Callback      | ✅ Yes      | Works correctly |
| Today Highlight    | Static Object | ❌ No       | **DISAPPEARS**  |
| Weekend Highlights | Callback      | ✅ Yes      | Works correctly |

## Solution

The main `reload()` function (used for creating new bookings) needs to call `refetchEvents()` instead of manually adding only reservation events.

**Current Code (lines 1106-1142):**

```typescript
const api = calendarRef.current?.getApi();
if (api) {
  api.removeAllEvents();
  await new Promise((resolve) => setTimeout(resolve, 100));

  const calendarEvents = reservations.map(r => ({...}));
  api.addEventSource(calendarEvents);  // ❌ Only adds reservations
  // ❌ Highlights are lost
}
```

**Fixed Code:**

```typescript
const api = calendarRef.current?.getApi();
if (api) {
  api.removeAllEvents();
  await new Promise((resolve) => setTimeout(resolve, 100));
  api.refetchEvents(); // ✅ Re-fetches ALL event sources
  // ✅ Highlights are restored
}
```

This single change will:

1. Remove all events (reservations + highlights)
2. Re-fetch from ALL event sources:
   - Reservation events (from API)
   - Today highlight (callback function)
   - Weekend highlights (callback function)
3. All highlights reappear automatically

## Impact

- ✅ Both today and weekend highlights persist after creating/editing reservations
- ✅ No hard refresh needed
- ✅ Better user experience
- ✅ Minimal code change (just 1 line)
- ✅ Consistent behavior with `handleEditBookingUpdate`

## Files to Modify

- `src/app/dashboard/bookings/page.tsx` (lines 1106-1142)
  - Replace manual `addEventSource()` with `refetchEvents()`
