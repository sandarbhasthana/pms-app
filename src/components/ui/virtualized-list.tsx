/**
 * VirtualizedList Component
 *
 * A reusable virtualized list component built on react-window v2
 * for efficiently rendering large lists by only rendering visible items.
 *
 * Use this component when:
 * - List has 100+ items
 * - Rendering each item is expensive
 * - Scroll performance is degraded
 *
 * Don't use this component when:
 * - List has <50 items (overhead not worth it)
 * - Items have highly variable heights (use useDynamicRowHeight instead)
 * - You need complex table layouts with sticky headers
 */

"use client";

import React, { ReactElement, CSSProperties } from "react";
import { List, useDynamicRowHeight, ListImperativeAPI } from "react-window";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════
// FIXED SIZE LIST
// ═══════════════════════════════════════════════════════════════════════════

interface VirtualizedListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Optional default height for SSR (default uses itemHeight * min(10, items.length)) */
  defaultHeight?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number, style: CSSProperties) => ReactElement;
  /** Optional className for the container */
  className?: string;
  /** Number of items to render outside the visible area for smooth scrolling */
  overscanCount?: number;
  /** Optional ref for imperative API (scrollToRow, etc.) */
  listRef?: React.Ref<ListImperativeAPI>;
}

// Row props type for the List component
interface RowProps<T> {
  items: T[];
  renderItem: (item: T, index: number, style: CSSProperties) => ReactElement;
}

/**
 * Fixed-size virtualized list
 * Use when all items have the same height
 */
export function VirtualizedList<T>({
  items,
  itemHeight,
  defaultHeight,
  renderItem,
  className,
  overscanCount = 5,
  listRef
}: VirtualizedListProps<T>) {
  // Row component that receives props from List
  const RowComponent = ({
    index,
    style,
    items: rowItems,
    renderItem: rowRenderItem
  }: {
    ariaAttributes: {
      "aria-posinset": number;
      "aria-setsize": number;
      role: "listitem";
    };
    index: number;
    style: CSSProperties;
    items: T[];
    renderItem: (item: T, index: number, style: CSSProperties) => ReactElement;
  }) => {
    return rowRenderItem(rowItems[index], index, style);
  };

  return (
    <List<RowProps<T>>
      listRef={listRef}
      rowCount={items.length}
      rowHeight={itemHeight}
      rowComponent={RowComponent}
      rowProps={{ items, renderItem }}
      overscanCount={overscanCount}
      defaultHeight={defaultHeight ?? Math.min(10, items.length) * itemHeight}
      className={cn(
        "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600",
        className
      )}
      style={{ height: "100%", width: "100%" }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC HEIGHT LIST
// ═══════════════════════════════════════════════════════════════════════════

interface DynamicHeightListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Default/estimated height of each item in pixels */
  defaultItemHeight: number;
  /** Optional default height for SSR */
  defaultHeight?: number;
  /** Render function for each item - must include data-index attribute on root element */
  renderItem: (item: T, index: number, style: CSSProperties) => ReactElement;
  /** Optional className for the container */
  className?: string;
  /** Number of items to render outside the visible area */
  overscanCount?: number;
  /** Optional ref for imperative API */
  listRef?: React.Ref<ListImperativeAPI>;
  /** Optional key to reset height cache when items change significantly */
  cacheKey?: string | number;
}

/**
 * Dynamic-height virtualized list
 * Use when items have varying heights that need to be measured
 * Note: Items must have data-index attribute for height measurement
 */
export function DynamicHeightList<T>({
  items,
  defaultItemHeight,
  defaultHeight,
  renderItem,
  className,
  overscanCount = 5,
  listRef,
  cacheKey
}: DynamicHeightListProps<T>) {
  // Use react-window's dynamic row height hook
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: defaultItemHeight,
    key: cacheKey
  });

  // Row component that receives props from List
  const RowComponent = ({
    index,
    style,
    items: rowItems,
    renderItem: rowRenderItem
  }: {
    ariaAttributes: {
      "aria-posinset": number;
      "aria-setsize": number;
      role: "listitem";
    };
    index: number;
    style: CSSProperties;
    items: T[];
    renderItem: (item: T, index: number, style: CSSProperties) => ReactElement;
  }) => {
    return rowRenderItem(rowItems[index], index, style);
  };

  return (
    <List<RowProps<T>>
      listRef={listRef}
      rowCount={items.length}
      rowHeight={dynamicRowHeight}
      rowComponent={RowComponent}
      rowProps={{ items, renderItem }}
      overscanCount={overscanCount}
      defaultHeight={
        defaultHeight ?? Math.min(10, items.length) * defaultItemHeight
      }
      className={cn(
        "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600",
        className
      )}
      style={{ height: "100%", width: "100%" }}
    />
  );
}

// Export types for consumers
export type { VirtualizedListProps, DynamicHeightListProps, ListImperativeAPI };
