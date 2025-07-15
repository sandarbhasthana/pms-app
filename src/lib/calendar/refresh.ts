// Calendar refresh utility for notifying calendar pages when room data changes
// This uses localStorage events to communicate between different pages/tabs

export interface CalendarRefreshEvent {
  type: 'ROOMS_UPDATED';
  timestamp: number;
  orgId?: string;
}

/**
 * Notify all calendar pages to refresh their room resources
 * This triggers a localStorage event that calendar pages can listen to
 */
export async function notifyCalendarRefresh(orgId?: string): Promise<void> {
  try {
    const event: CalendarRefreshEvent = {
      type: 'ROOMS_UPDATED',
      timestamp: Date.now(),
      orgId
    };

    // Store the event in localStorage to trigger storage event
    localStorage.setItem('calendar-refresh-event', JSON.stringify(event));
    
    // Remove it immediately to allow future events
    setTimeout(() => {
      localStorage.removeItem('calendar-refresh-event');
    }, 100);

    console.log('Calendar refresh notification sent:', event);
  } catch (error) {
    console.error('Failed to notify calendar refresh:', error);
  }
}

/**
 * Hook for calendar pages to listen for refresh events
 * Returns a function to manually refresh and handles automatic refresh on events
 */
export function useCalendarRefreshListener(
  refreshCallback: () => Promise<void> | void,
  orgId?: string
) {
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'calendar-refresh-event' && e.newValue) {
      try {
        const event: CalendarRefreshEvent = JSON.parse(e.newValue);
        
        // Only refresh if the event is for our organization or no org specified
        if (!event.orgId || !orgId || event.orgId === orgId) {
          console.log('Received calendar refresh event, refreshing...', event);
          refreshCallback();
        }
      } catch (error) {
        console.error('Failed to parse calendar refresh event:', error);
      }
    }
  };

  // Set up storage event listener
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
    
    // Cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }

  return () => {}; // No-op cleanup for SSR
}

/**
 * Alternative approach using BroadcastChannel API (more modern but less supported)
 * Can be used as a fallback or primary method depending on browser support
 */
export class CalendarRefreshBroadcaster {
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('calendar-refresh');
    }
  }

  notify(orgId?: string) {
    if (this.channel) {
      const event: CalendarRefreshEvent = {
        type: 'ROOMS_UPDATED',
        timestamp: Date.now(),
        orgId
      };
      this.channel.postMessage(event);
      console.log('Calendar refresh broadcast sent:', event);
    }
  }

  listen(callback: (event: CalendarRefreshEvent) => void, orgId?: string) {
    if (this.channel) {
      const handler = (event: MessageEvent<CalendarRefreshEvent>) => {
        const data = event.data;
        if (!data.orgId || !orgId || data.orgId === orgId) {
          callback(data);
        }
      };
      
      this.channel.addEventListener('message', handler);
      
      return () => {
        this.channel?.removeEventListener('message', handler);
      };
    }
    
    return () => {}; // No-op cleanup
  }

  close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
