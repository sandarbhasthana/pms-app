# Swipe Calendar Implementation Plan

## Overview
This document outlines the implementation plan for adding swipe gesture navigation to the FullCalendar component at `/dashboard/bookings` using the `react-swipeable` library.

---

## Problem Statement
Currently, users must click prev/next buttons to navigate the calendar, which is slow and cumbersome on tablets and mobile devices. This implementation adds native swipe gesture support for a more intuitive mobile experience.

---

## Solution: react-swipeable Integration

### Why react-swipeable?
- ✅ **Free and open-source** (MIT license)
- ✅ **Lightweight** (3KB gzipped)
- ✅ **Battle-tested** (2.8k+ GitHub stars)
- ✅ **Compatible** with FullCalendar v6
- ✅ **Simple API** - Hook-based React integration
- ✅ **TypeScript support**
- ✅ **Configurable** swipe thresholds and directions

---

## Implementation Details

### Phase 1: Installation
```bash
npm install react-swipeable
```

**Package Details:**
- Name: `react-swipeable`
- Version: Latest (^7.x)
- Repository: https://github.com/FormidableLabs/react-swipeable
- License: MIT

---

### Phase 2: Component Modifications

#### File: `src/components/bookings/CalendarViewRowStyleWithSwipe.tsx`
**Status:** ✅ Created (copy of original with swipe functionality)

**Changes Made:**
1. **Import react-swipeable hook**
   ```typescript
   import { useSwipeable } from "react-swipeable";
   ```

2. **Add navigation handler props**
   - `onSwipeLeft`: Navigate to next week
   - `onSwipeRight`: Navigate to previous week

3. **Configure swipe handlers**
   ```typescript
   const swipeHandlers = useSwipeable({
     onSwipedLeft: () => onSwipeLeft?.(),
     onSwipedRight: () => onSwipeRight?.(),
     delta: 50,                    // Minimum swipe distance (50px)
     preventScrollOnSwipe: true,   // Prevent vertical scroll during horizontal swipe
     trackMouse: false,            // Disable mouse swipe (desktop)
     trackTouch: true,             // Enable touch swipe (mobile/tablet)
     rotationAngle: 0,             // No rotation
     swipeDuration: 500,           // Maximum swipe duration (500ms)
   });
   ```

4. **Wrap FullCalendar with swipeable div**
   ```typescript
   <div {...swipeHandlers} className="swipeable-calendar-container">
     <FullCalendar {...props} />
   </div>
   ```

5. **Add CSS for smooth transitions** (optional)
   - Fade effect during navigation
   - Loading indicator during swipe

---

### Phase 3: Parent Component Integration

#### File: `src/app/dashboard/bookings/page.tsx`
**Status:** ⏳ Pending

**Changes Required:**
1. **Import new component**
   ```typescript
   import CalendarViewRowStyleWithSwipe from "@/components/bookings/CalendarViewRowStyleWithSwipe";
   ```

2. **Pass swipe handlers as props**
   ```typescript
   <CalendarViewRowStyleWithSwipe
     {...existingProps}
     onSwipeLeft={handleNext}   // Existing handleNext function
     onSwipeRight={handlePrev}  // Existing handlePrev function
   />
   ```

3. **No other changes needed** - Existing `handlePrev` and `handleNext` functions work as-is

---

### Phase 4: Configuration & Tuning

#### Swipe Sensitivity Settings
```typescript
const SWIPE_CONFIG = {
  delta: 50,              // Minimum swipe distance (px)
  velocity: 0.3,          // Minimum swipe velocity (optional)
  preventScrollOnSwipe: true,
  trackTouch: true,
  trackMouse: false,      // Disable on desktop (optional)
  swipeDuration: 500,     // Maximum swipe duration (ms)
};
```

**Recommended Values:**
- **delta: 50px** - Good balance between sensitivity and accidental swipes
- **swipeDuration: 500ms** - Allows quick swipes but filters out slow drags
- **preventScrollOnSwipe: true** - Prevents vertical scroll during horizontal swipe

**Adjustable Based on Testing:**
- Increase `delta` (e.g., 75px) if too sensitive
- Decrease `delta` (e.g., 30px) if not responsive enough
- Add `velocity` threshold for faster swipes only

---

### Phase 5: Edge Cases & Considerations

#### 1. **Prevent Swipe During Event Drag**
```typescript
const [isDragging, setIsDragging] = useState(false);

const swipeHandlers = useSwipeable({
  onSwipedLeft: () => !isDragging && onSwipeLeft?.(),
  onSwipedRight: () => !isDragging && onSwipeRight?.(),
  // ... other config
});
```

#### 2. **Disable Swipe During Day Transition Validation**
- Check if `dayTransitionLoading` is true
- Disable swipe handlers when validation modal is open

#### 3. **Conflict with Date Picker**
- Swipe handlers should not interfere with DatePicker component
- `react-swipeable` automatically handles this via event propagation

#### 4. **Conflict with Event Click/Drag**
- FullCalendar's `editable` prop handles drag events
- Swipe only triggers on empty calendar areas (not on events)

#### 5. **Desktop vs Mobile Behavior**
- **Mobile/Tablet:** Swipe enabled (`trackTouch: true`)
- **Desktop:** Swipe disabled (`trackMouse: false`)
- Keeps existing button navigation for desktop users

---

### Phase 6: Visual Feedback (Optional Enhancements)

#### Option A: Fade Transition
```css
.swipeable-calendar-container {
  transition: opacity 0.2s ease-in-out;
}

.swipeable-calendar-container.swiping {
  opacity: 0.7;
}
```

#### Option B: Slide Animation
```css
.swipeable-calendar-container {
  transition: transform 0.3s ease-out;
}

.swipeable-calendar-container.swipe-left {
  transform: translateX(-20px);
}

.swipeable-calendar-container.swipe-right {
  transform: translateX(20px);
}
```

#### Option C: Loading Indicator
- Show subtle spinner during calendar refetch
- Use existing `isRefetching` state

---

## Testing Checklist

### Functional Testing
- [ ] Swipe left navigates to next week
- [ ] Swipe right navigates to previous week
- [ ] Swipe threshold (50px) works correctly
- [ ] Fast swipes trigger navigation
- [ ] Slow drags don't trigger navigation
- [ ] Vertical scroll still works (not blocked)
- [ ] Event click/drag still works
- [ ] Date picker interaction not affected
- [ ] Day transition validation blocks swipe
- [ ] Desktop button navigation still works

### Device Testing
- [ ] iOS Safari (iPhone)
- [ ] iOS Safari (iPad)
- [ ] Chrome Mobile (Android phone)
- [ ] Chrome Mobile (Android tablet)
- [ ] Desktop Chrome (swipe disabled)
- [ ] Desktop Safari (swipe disabled)

### Edge Cases
- [ ] Swipe during event drag (should be blocked)
- [ ] Swipe during modal open (should be blocked)
- [ ] Swipe on date picker (should not trigger)
- [ ] Swipe on toolbar buttons (should not trigger)
- [ ] Multiple rapid swipes (debouncing)

---

## Rollback Plan

If issues arise, rollback is simple:

1. **Revert to original component**
   ```typescript
   import CalendarViewRowStyle from "@/components/bookings/CalendarViewRowStyle";
   ```

2. **Remove swipe props**
   ```typescript
   <CalendarViewRowStyle {...existingProps} />
   // Remove onSwipeLeft and onSwipeRight props
   ```

3. **Uninstall package (optional)**
   ```bash
   npm uninstall react-swipeable
   ```

**No data loss or breaking changes** - Original component remains intact.

---

## Performance Considerations

### Bundle Size Impact
- **react-swipeable:** ~3KB gzipped
- **Total impact:** Negligible (<0.1% of typical bundle)

### Runtime Performance
- **Touch event listeners:** Minimal overhead
- **No re-renders:** Swipe handlers don't trigger React re-renders
- **Passive event listeners:** Used by react-swipeable for better scroll performance

### Memory Usage
- **No memory leaks:** react-swipeable properly cleans up event listeners
- **No additional state:** Uses existing navigation functions

---

## Future Enhancements

### Phase 7: Advanced Features (Optional)
1. **Pinch-to-zoom** - Change calendar view duration
2. **Swipe velocity detection** - Faster swipes = larger jumps
3. **Haptic feedback** - Vibration on successful swipe (mobile)
4. **Swipe progress indicator** - Visual feedback during swipe
5. **Customizable swipe distance** - User preference setting

### Phase 8: Analytics (Optional)
Track swipe usage:
- Swipe vs button navigation ratio
- Average swipe distance
- Failed swipe attempts
- Device type distribution

---

## Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Install react-swipeable | 5 min | ⏳ Pending |
| 2 | Create CalendarViewRowStyleWithSwipe.tsx | 30 min | ✅ Complete |
| 3 | Integrate in page.tsx | 15 min | ⏳ Pending |
| 4 | Configure swipe settings | 15 min | ⏳ Pending |
| 5 | Handle edge cases | 30 min | ⏳ Pending |
| 6 | Add visual feedback (optional) | 30 min | ⏳ Pending |
| 7 | Testing (all devices) | 60 min | ⏳ Pending |
| **Total** | | **~3 hours** | |

---

## Success Metrics

### User Experience
- ✅ Swipe navigation feels natural and responsive
- ✅ No conflicts with existing interactions
- ✅ Works consistently across devices
- ✅ No performance degradation

### Technical
- ✅ Zero breaking changes to existing functionality
- ✅ Minimal bundle size increase (<5KB)
- ✅ No console errors or warnings
- ✅ Passes all existing tests

---

## References

- **react-swipeable GitHub:** https://github.com/FormidableLabs/react-swipeable
- **react-swipeable Docs:** https://formidable.com/open-source/react-swipeable/
- **FullCalendar API:** https://fullcalendar.io/docs
- **Touch Events MDN:** https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

---

## Support & Troubleshooting

### Common Issues

**Issue 1: Swipe not working on iOS**
- **Cause:** Safari requires `touch-action: pan-y` CSS
- **Fix:** Add CSS to calendar container

**Issue 2: Vertical scroll blocked**
- **Cause:** `preventScrollOnSwipe` too aggressive
- **Fix:** Set to `false` or use `preventScrollOnSwipe: 'horizontal'`

**Issue 3: Swipe too sensitive**
- **Cause:** `delta` value too low
- **Fix:** Increase `delta` to 75-100px

**Issue 4: Swipe conflicts with event drag**
- **Cause:** Event handlers not properly isolated
- **Fix:** Add `isDragging` state check

---

## Conclusion

This implementation provides a **native mobile experience** for calendar navigation with:
- ✅ **Minimal code changes** (one new component)
- ✅ **Zero breaking changes** (original component preserved)
- ✅ **Easy rollback** (simple import swap)
- ✅ **Production-ready** (battle-tested library)
- ✅ **Future-proof** (actively maintained)

**Next Step:** Install `react-swipeable` and integrate the new component! 🚀

