# Google Calendar-Style Swipe Implementation

## Overview

This document describes the new `CalendarViewGoogleStyle` component that implements a Google Calendar-like swipe experience with triple-buffer rendering.

## Component: `CalendarViewGoogleStyle.tsx`

### Key Features

✅ **Triple-Buffer System**: Renders 3 calendar instances (previous, current, next) side-by-side
✅ **Smooth Sliding**: Content slides continuously as you swipe, showing adjacent weeks
✅ **Visual Continuity**: You can see the next/previous week peeking in as you swipe
✅ **Threshold-Based Navigation**: 30% swipe or fast flick triggers transition
✅ **View Recycling**: After transition, views are recycled to maintain performance
✅ **Touch-Only**: Only works on mobile/tablet devices

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  [Previous Week]  [Current Week]  [Next Week]           │
│   (Nov 25-Dec 8)  (Dec 9-22)     (Dec 23-Jan 5)        │
│                                                          │
│   Transform: translateX(-100vw)  ← shows current        │
└─────────────────────────────────────────────────────────┘
```

### How It Works

1. **Initial State**: 
   - 3 calendars rendered side-by-side (300vw total width)
   - Transform set to `-100vw` to show middle (current) calendar
   - Container has `overflow: hidden` to hide prev/next

2. **During Swipe**:
   - User drags finger → entire wrapper moves with finger
   - Previous/next calendars become visible as you swipe
   - 1:1 finger tracking for smooth feel

3. **On Release**:
   - If swiped > 30% OR fast velocity → complete transition
   - Otherwise → snap back to current position

4. **After Transition**:
   - Views are recycled:
     - Swipe left: `prev = current`, `current = next`, `next = next + 14 days`
     - Swipe right: `next = current`, `current = prev`, `prev = prev - 14 days`
   - Transform reset to `-100vw` instantly
   - Parent notified via `onDateChange` callback

### Usage

```tsx
import CalendarViewGoogleStyle from "@/components/bookings/CalendarViewGoogleStyle";

function BookingsPage() {
  const [selectedDate, setSelectedDate] = useState("2025-01-15");

  return (
    <CalendarViewGoogleStyle
      resources={resources}
      eventSources={eventSources}
      handleEventClick={handleEventClick}
      handleDateClick={handleDateClick}
      handleEventDrop={handleEventDrop}
      selectedDate={selectedDate}
      selectedResource={selectedResource}
      holidays={holidays}
      isToday={isToday}
      setSelectedResource={setSelectedResource}
      events={events}
      onDateChange={(newDate) => setSelectedDate(newDate)}
      disableSwipe={false}
    />
  );
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `resources` | `CalendarResource[]` | Room types and rooms hierarchy |
| `eventSources` | `EventSourceInput[]` | FullCalendar event sources |
| `handleEventClick` | `(arg: EventClickArg) => void` | Event click handler |
| `handleDateClick` | `(arg: DateClickArg) => void` | Date cell click handler |
| `handleEventDrop` | `(arg: EventDropArg) => void` | Event drag-drop handler |
| `selectedDate` | `string` | Current selected date (YYYY-MM-DD) |
| `selectedResource` | `string \| null` | Currently selected resource ID |
| `holidays` | `Record<string, string>` | Holiday dates mapping |
| `isToday` | `(date: Date) => boolean` | Function to check if date is today |
| `setSelectedResource` | `(id: string) => void` | Resource selection handler |
| `events` | `Reservation[]` | Array of reservation events |
| `onDateChange` | `(newDate: string) => void` | **NEW**: Callback when date changes via swipe |
| `disableSwipe` | `boolean` | Optional: Disable swipe functionality |

### Key Differences from `CalendarViewRowStyleWithSwipe`

| Feature | CalendarViewRowStyleWithSwipe | CalendarViewGoogleStyle |
|---------|------------------------------|-------------------------|
| **Calendar Instances** | 1 | 3 (prev, current, next) |
| **Visual Continuity** | ❌ White space during swipe | ✅ See adjacent weeks |
| **Date Change Timing** | During swipe (continuous) | After transition completes |
| **Memory Usage** | Low (1 calendar) | Higher (3 calendars) |
| **Complexity** | Simple | Complex (view recycling) |
| **User Experience** | Functional | Polished (like Google Calendar) |

### Performance Considerations

**Memory:**
- 3x FullCalendar instances = ~3x memory usage
- Each calendar fetches its own rates data
- Consider lazy loading prev/next calendars if performance is an issue

**Optimization Tips:**
1. Use `React.memo` on CalendarView (already implemented)
2. Memoize event sources and resources
3. Consider virtualizing if you have many rooms
4. Disable event interactions on prev/next calendars (already implemented)

### CSS Requirements

Add to your global CSS:

```css
.google-style-calendar-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  -webkit-user-select: none;
  user-select: none;
}

@media (max-width: 1024px) {
  .google-style-calendar-container {
    touch-action: pan-y;
  }
}
```

### Migration from Old Component

**Step 1**: Replace import
```tsx
// Old
import CalendarViewRowStyleWithSwipe from "@/components/bookings/CalendarViewRowStyleWithSwipe";

// New
import CalendarViewGoogleStyle from "@/components/bookings/CalendarViewGoogleStyle";
```

**Step 2**: Update props
```tsx
// Old
<CalendarViewRowStyleWithSwipe
  calendarRef={calendarRef}  // ❌ Remove this
  onSwipeLeft={handleSwipeLeft}  // ❌ Remove this
  onSwipeRight={handleSwipeRight}  // ❌ Remove this
  // ... other props
/>

// New
<CalendarViewGoogleStyle
  onDateChange={(newDate) => setSelectedDate(newDate)}  // ✅ Add this
  // ... other props (same as before)
/>
```

**Step 3**: Remove old swipe handlers
```tsx
// ❌ Remove these
const handleSwipeLeft = () => {
  setSelectedDate(format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd"));
};

const handleSwipeRight = () => {
  setSelectedDate(format(subDays(new Date(selectedDate), 1), "yyyy-MM-dd"));
};
```

### Troubleshooting

**Issue**: Calendars not sliding smoothly
- **Solution**: Check that container has `overflow: hidden`
- **Solution**: Ensure no conflicting CSS transforms

**Issue**: White space visible during swipe
- **Solution**: Verify all 3 calendars are rendering
- **Solution**: Check that wrapper width is exactly `300%`

**Issue**: Dates not updating after swipe
- **Solution**: Ensure `onDateChange` callback is updating parent state
- **Solution**: Check that `selectedDate` prop is being passed correctly

**Issue**: High memory usage
- **Solution**: Consider lazy loading prev/next calendars
- **Solution**: Reduce number of resources/events if possible

**Issue**: Swipe conflicts with event drag
- **Solution**: Event drag is disabled on prev/next calendars (only active on current)
- **Solution**: Ensure `isActive` prop is correctly set

### Future Enhancements

Potential improvements:
- [ ] Lazy load prev/next calendars (render after current is ready)
- [ ] Add fade effect on edges to indicate more content
- [ ] Implement infinite scrolling (more than 3 buffers)
- [ ] Add haptic feedback on iOS devices
- [ ] Optimize data fetching (fetch 42 days upfront, cache in React Query)
- [ ] Add loading skeleton during transitions

### Testing Checklist

- [ ] Swipe left transitions to next week
- [ ] Swipe right transitions to previous week
- [ ] Small swipes snap back to current
- [ ] Fast flicks trigger transition even with small distance
- [ ] Date updates correctly after transition
- [ ] Event clicks only work on current calendar
- [ ] Event drag only works on current calendar
- [ ] No white space visible during swipe
- [ ] Smooth animation on release
- [ ] Works on both iOS and Android
- [ ] No memory leaks after multiple swipes
- [ ] Rates data loads correctly for all 3 calendars

### Credits

Implementation based on Google Calendar's mobile swipe behavior with triple-buffer rendering technique.

