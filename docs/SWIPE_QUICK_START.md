# Swipe Calendar - Quick Start Guide

## 🚀 3-Step Integration

### Step 1: Install Package (5 minutes)
```bash
npm install react-swipeable
```

### Step 2: Update Import (1 minute)
**File:** `src/app/dashboard/bookings/page.tsx`

```typescript
// Line ~27: Change this import
import CalendarViewRowStyle from "@/components/bookings/CalendarViewRowStyle";

// To this:
import CalendarViewRowStyleWithSwipe from "@/components/bookings/CalendarViewRowStyleWithSwipe";
```

### Step 3: Add Swipe Props (2 minutes)
**File:** `src/app/dashboard/bookings/page.tsx`

Find the calendar component usage (around line 1313) and update:

```typescript
// OLD:
<CalendarViewRowStyle
  calendarRef={calendarRef}
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
/>

// NEW:
<CalendarViewRowStyleWithSwipe
  calendarRef={calendarRef}
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
  onSwipeLeft={handleNext}
  onSwipeRight={handlePrev}
  disableSwipe={dayTransitionLoading}
/>
```

---

## ✅ That's It!

Your calendar now supports swipe gestures on mobile devices!

- **Swipe left** → Navigate to next week
- **Swipe right** → Navigate to previous week
- **Desktop** → Swipe disabled, buttons still work
- **Mobile/Tablet** → Swipe enabled + buttons work

---

## 🧪 Quick Test

1. Run your dev server: `npm run dev`
2. Open on mobile device or use Chrome DevTools mobile emulation
3. Navigate to `/dashboard/bookings`
4. Try swiping left/right on the calendar
5. Verify buttons still work

---

## 🔄 Rollback (if needed)

Just change the import back:

```typescript
import CalendarViewRowStyle from "@/components/bookings/CalendarViewRowStyle";
```

And remove the three new props (`onSwipeLeft`, `onSwipeRight`, `disableSwipe`).

---

## 📚 Full Documentation

- **Implementation Plan:** `docs/SWIPE_CALENDAR_IMPLEMENTATION_PLAN.md`
- **Summary:** `docs/SWIPE_IMPLEMENTATION_SUMMARY.md`
- **Component:** `src/components/bookings/CalendarViewRowStyleWithSwipe.tsx`

---

## 🎯 Key Features

✅ **50px swipe threshold** - Prevents accidental swipes  
✅ **500ms max duration** - Filters out slow drags  
✅ **Vertical scroll preserved** - No interference with scrolling  
✅ **Drag protection** - Swipe disabled during event drag  
✅ **Desktop disabled** - Mouse swipe turned off  
✅ **Zero breaking changes** - Original component untouched  

---

## 🐛 Troubleshooting

**Swipe not working?**
- Check if `react-swipeable` is installed
- Verify you're testing on a touch device or mobile emulator
- Check browser console for errors

**Swipe too sensitive?**
- Edit `CalendarViewRowStyleWithSwipe.tsx`
- Change `delta: 50` to `delta: 75`

**Vertical scroll blocked?**
- Should not happen (we use `touchAction: "pan-y"`)
- Check if any other CSS is overriding this

---

## 💬 Need Help?

Refer to the full documentation in:
- `docs/SWIPE_CALENDAR_IMPLEMENTATION_PLAN.md`
- `docs/SWIPE_IMPLEMENTATION_SUMMARY.md`

