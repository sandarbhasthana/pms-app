# Global Loader System - Usage Guide

## Overview

The PMS App now has a **3-tier global loader system** for consistent loading states across the entire application:

1. **Route Transition Loader** - Thin progress bar for page navigation
2. **Global Loading Overlay** - Full-screen loader for major operations
3. **Component-Level Loaders** - Inline spinners for local states

All loaders use **ScaleLoader** from `react-spinners` and are **theme-aware** (automatically adapt to light/dark mode).

---

## 1. Route Transition Loader (Automatic)

### What it does:
- Shows a thin progress bar at the top of the screen during page navigation
- Automatically triggered on route changes
- Theme-aware colors (purple-600 in light mode, purple-400 in dark mode)

### Usage:
**No code needed!** It works automatically when you navigate between pages.

```tsx
// Just use Next.js Link or router.push()
<Link href="/dashboard">Go to Dashboard</Link>

// Or programmatically
router.push('/settings');
```

---

## 2. Global Loading Overlay

### What it does:
- Shows a full-screen overlay with ScaleLoader
- Blocks user interaction during critical operations
- Customizable loading text

### Usage:

```tsx
"use client";

import { useGlobalLoader } from "@/contexts/LoadingContext";

export function MyComponent() {
  const { showLoader, hideLoader } = useGlobalLoader();

  async function handleSubmit() {
    showLoader("Processing payment...");
    try {
      await processPayment();
      toast.success("Payment successful!");
    } catch (error) {
      toast.error("Payment failed");
    } finally {
      hideLoader();
    }
  }

  return <button onClick={handleSubmit}>Pay Now</button>;
}
```

### API:

```tsx
const { showLoader, hideLoader, isLoading, loadingText } = useGlobalLoader();

// Show loader with custom text
showLoader("Uploading files...");

// Show loader with default text
showLoader(); // Shows "Loading..."

// Hide loader
hideLoader();

// Check if loader is active
if (isLoading) {
  console.log("Currently loading:", loadingText);
}
```

---

## 3. Component-Level Loaders

### A. LoadingSpinner (Full-screen or Centered)

```tsx
import { LoadingSpinner } from "@/components/ui/spinner";

// Full-screen loader
if (loading) {
  return <LoadingSpinner text="Loading data..." fullScreen />;
}

// Centered loader (default)
if (loading) {
  return <LoadingSpinner text="Loading..." />;
}

// Custom size and variant
<LoadingSpinner 
  text="Processing..." 
  size="xl" 
  variant="primary" 
  center={true}
/>
```

### B. Inline Spinner

```tsx
import { Spinner } from "@/components/ui/spinner";

// Small inline spinner
<div className="flex items-center gap-2">
  <Spinner size="sm" />
  <span>Loading...</span>
</div>

// In a button
<Button disabled={loading}>
  {loading ? (
    <>
      <Spinner size="sm" />
      Processing...
    </>
  ) : (
    "Submit"
  )}
</Button>
```

### Props:

#### LoadingSpinner
- `text?: string` - Loading message (default: "Loading...")
- `size?: "sm" | "default" | "lg" | "xl"` - Spinner size (default: "lg")
- `variant?: "default" | "primary" | "secondary" | "destructive"` - Color variant (default: "primary")
- `center?: boolean` - Center the spinner (default: true)
- `fullScreen?: boolean` - Full-screen overlay (default: false)
- `className?: string` - Additional CSS classes

#### Spinner
- `size?: "sm" | "default" | "lg" | "xl"` - Spinner size (default: "default")
- `variant?: "default" | "primary" | "secondary" | "destructive"` - Color variant (default: "primary")
- `className?: string` - Additional CSS classes

---

## Color Variants (Theme-Aware)

| Variant | Light Mode | Dark Mode |
|---------|-----------|-----------|
| `primary` | Purple-600 (#7c3aed) | Purple-400 (#a78bfa) |
| `secondary` | Slate-600 (#64748b) | Slate-400 (#94a3b8) |
| `destructive` | Red-600 (#dc2626) | Red-400 (#f87171) |
| `default` | Gray-600 (#6b7280) | Gray-400 (#9ca3af) |

---

## Examples

### Example 1: Page Loading State
```tsx
"use client";

import { LoadingSpinner } from "@/components/ui/spinner";
import { useState, useEffect } from "react";

export default function MyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading page..." fullScreen />;
  }

  return <div>{/* Your content */}</div>;
}
```

### Example 2: Form Submission
```tsx
"use client";

import { useGlobalLoader } from "@/contexts/LoadingContext";
import { toast } from "sonner";

export function MyForm() {
  const { showLoader, hideLoader } = useGlobalLoader();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    showLoader("Saving changes...");
    try {
      await saveData();
      toast.success("Saved successfully!");
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      hideLoader();
    }
  }

  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
}
```

---

## Best Practices

1. **Use Route Loader for navigation** - It's automatic, no code needed
2. **Use Global Loader for critical operations** - Payment processing, file uploads, etc.
3. **Use LoadingSpinner for page-level loading** - Initial data fetching
4. **Use Spinner for inline loading** - Buttons, dropdowns, small components
5. **Always hide the global loader** - Use try/finally to ensure hideLoader() is called
6. **Provide meaningful text** - Tell users what's happening

---

## Migration from Old Loaders

### Before:
```tsx
// Old custom spinner
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>

// Old Loader2 from lucide-react
<Loader2 className="animate-spin w-4 h-4" />
```

### After:
```tsx
// New ScaleLoader-based spinner
<Spinner size="lg" variant="primary" />

// Or for inline use
<Spinner size="sm" />
```

---

## Troubleshooting

### Loader not showing?
- Make sure you're using `"use client"` directive
- Check that LoadingProvider is in your providers tree
- Verify you're calling `showLoader()` before async operations

### Theme colors not working?
- Ensure ThemeProvider is wrapping LoadingProvider
- Check that `next-themes` is properly configured

### Hydration mismatch?
- The spinners have built-in hydration protection
- They return a placeholder during SSR to prevent mismatches

---

## Technical Details

- **Library**: `react-spinners` (ScaleLoader component)
- **Route Progress**: `nprogress` with custom theme-aware styling
- **Theme Detection**: `next-themes` (useTheme hook)
- **Z-Index**: Global loader uses z-index 9999, Route progress uses 99999

