// Client-side API request deduplication utility
// Prevents multiple simultaneous requests to the same endpoint

interface PendingRequest<T = unknown> {
  promise: Promise<T>;
  timestamp: number;
}

class APIDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private readonly TIMEOUT = 30000; // 30 seconds timeout

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Clean up expired requests
    this.cleanup();

    // Check if there's already a pending request
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing.promise as Promise<T>;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Clean up when request completes
      this.pendingRequests.delete(key);
    });

    // Store the pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.TIMEOUT) {
        this.pendingRequests.delete(key);
      }
    }
  }

  // Get current pending request count (for debugging)
  getPendingCount(): number {
    this.cleanup();
    return this.pendingRequests.size;
  }
}

// Global instance
export const apiDeduplicator = new APIDeduplicator();

// Utility function for common status-summary requests
export function createStatusSummaryKey(
  propertyId: string,
  includeHistorical: boolean
): string {
  return `status-summary-${propertyId}-${includeHistorical}`;
}
