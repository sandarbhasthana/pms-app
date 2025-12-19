/**
 * Performance Utilities: Debouncing and Throttling Hooks
 *
 * These hooks help optimize performance by controlling how frequently
 * expensive operations (API calls, state updates, calculations) are executed.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// DEBOUNCING HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Custom hook that debounces a value
 * Useful for search inputs where you want to wait until the user stops typing
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 *
 * useEffect(() => {
 *   // This only runs 300ms after the user stops typing
 *   fetchSearchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for debounced callbacks
 * The callback will only be invoked after the specified delay has passed
 * since the last time the debounced function was called.
 *
 * @param callback - The callback function to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns Object with { run, cancel, flush, isPending }
 *
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => fetchResults(query),
 *   300
 * );
 *
 * <input onChange={(e) => debouncedSearch.run(e.target.value)} />
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300
): {
  run: T;
  cancel: () => void;
  flush: () => void;
  isPending: boolean;
} {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<unknown[] | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingArgsRef.current = null;
    setIsPending(false);
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current && pendingArgsRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      callbackRef.current(...pendingArgsRef.current);
      pendingArgsRef.current = null;
      setIsPending(false);
    }
  }, []);

  const run = useCallback(
    ((...args: unknown[]) => {
      pendingArgsRef.current = args;
      setIsPending(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (pendingArgsRef.current) {
          callbackRef.current(...pendingArgsRef.current);
          pendingArgsRef.current = null;
        }
        timeoutRef.current = null;
        setIsPending(false);
      }, delay);
    }) as T,
    [delay]
  );

  return useMemo(
    () => ({ run, cancel, flush, isPending }),
    [run, cancel, flush, isPending]
  );
}

/**
 * Simple debounced callback hook that returns just the debounced function
 * Use this when you don't need cancel/flush controls
 *
 * @param callback - The callback function to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced callback function
 *
 * @example
 * const handleSearch = useSimpleDebouncedCallback(
 *   (query: string) => fetchResults(query),
 *   300
 * );
 *
 * <input onChange={(e) => handleSearch(e.target.value)} />
 */
export function useSimpleDebouncedCallback<
  T extends (...args: unknown[]) => unknown
>(callback: T, delay: number = 300): (...args: unknown[]) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: unknown[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [delay]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THROTTLING HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Custom hook for throttled callbacks
 * The callback will be invoked at most once per specified delay interval.
 * Unlike debounce, throttle ensures the callback runs periodically.
 *
 * @param callback - The callback function to throttle
 * @param delay - The minimum time between invocations in milliseconds (default: 100ms)
 * @param options - Options for leading/trailing execution
 * @returns Object with { run, cancel, isPending }
 *
 * @example
 * const throttledScroll = useThrottledCallback(
 *   () => updateScrollPosition(),
 *   100
 * );
 *
 * useEffect(() => {
 *   window.addEventListener('scroll', throttledScroll.run);
 *   return () => window.removeEventListener('scroll', throttledScroll.run);
 * }, [throttledScroll.run]);
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 100,
  options: { leading?: boolean; trailing?: boolean } = {}
): {
  run: T;
  cancel: () => void;
  isPending: boolean;
} {
  const { leading = true, trailing = true } = options;

  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<unknown[] | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const [isPending, setIsPending] = useState(false);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    lastArgsRef.current = null;
    lastCallTimeRef.current = 0;
    setIsPending(false);
  }, []);

  const run = useCallback(
    ((...args: unknown[]) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTimeRef.current;

      lastArgsRef.current = args;

      // If enough time has passed, execute immediately (leading edge)
      if (timeSinceLastCall >= delay && leading) {
        lastCallTimeRef.current = now;
        callbackRef.current(...args);
        return;
      }

      // Set up trailing edge execution if not already pending
      if (!timeoutRef.current && trailing) {
        setIsPending(true);
        const remainingTime = delay - timeSinceLastCall;

        timeoutRef.current = setTimeout(
          () => {
            if (lastArgsRef.current) {
              lastCallTimeRef.current = Date.now();
              callbackRef.current(...lastArgsRef.current);
              lastArgsRef.current = null;
            }
            timeoutRef.current = null;
            setIsPending(false);
          },
          remainingTime > 0 ? remainingTime : delay
        );
      }
    }) as T,
    [delay, leading, trailing]
  );

  return useMemo(() => ({ run, cancel, isPending }), [run, cancel, isPending]);
}

/**
 * Simple throttled callback hook that returns just the throttled function
 * Use this when you don't need cancel controls
 *
 * @param callback - The callback function to throttle
 * @param delay - The minimum time between invocations (default: 100ms)
 * @returns The throttled callback function
 *
 * @example
 * const handleScroll = useSimpleThrottledCallback(
 *   () => updateScrollPosition(),
 *   100
 * );
 */
export function useSimpleThrottledCallback<
  T extends (...args: unknown[]) => unknown
>(callback: T, delay: number = 100): (...args: unknown[]) => void {
  const callbackRef = useRef(callback);
  const lastCallTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<unknown[] | null>(null);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: unknown[]) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTimeRef.current;

      lastArgsRef.current = args;

      if (timeSinceLastCall >= delay) {
        lastCallTimeRef.current = now;
        callbackRef.current(...args);
      } else if (!timeoutRef.current) {
        const remainingTime = delay - timeSinceLastCall;
        timeoutRef.current = setTimeout(() => {
          lastCallTimeRef.current = Date.now();
          if (lastArgsRef.current) {
            callbackRef.current(...lastArgsRef.current);
          }
          timeoutRef.current = null;
        }, remainingTime);
      }
    },
    [delay]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY: Debounced State
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A state hook that returns both the immediate value and the debounced value
 * Useful for search inputs where you want responsive UI but debounced API calls
 *
 * @param initialValue - Initial state value
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns [value, debouncedValue, setValue]
 *
 * @example
 * const [search, debouncedSearch, setSearch] = useDebouncedState('', 300);
 *
 * // search updates immediately for responsive UI
 * // debouncedSearch updates after 300ms of inactivity for API calls
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebounce(value, delay);

  return [value, debouncedValue, setValue];
}
