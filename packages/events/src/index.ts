export interface BaseDomainEvent<T = any> {
  event_id: string;
  event_type: string;
  aggregate_id: string;
  organization_id?: string;
  user_id?: string;
  payload: T;
  created_at: string;
  correlation_id: string;
  version: number;
}

export type EventHandler = (event: BaseDomainEvent) => Promise<void>;

export class EventDispatcher {
  private handlers: Map<string, EventHandler[]> = new Map();

  subscribe(eventType: string, handler: EventHandler) {
    const current = this.handlers.get(eventType) || [];
    this.handlers.set(eventType, [...current, handler]);
  }

  async dispatch(event: BaseDomainEvent) {
    // 1. In a real environment, first save to `domain_events` via Supabase client.
    // We are simulating the in-memory dispatch portion here.
    
    const eventHandlers = this.handlers.get(event.event_type) || [];
    
    // Execute all handlers concurrently without blocking the main thread
    Promise.allSettled(
      eventHandlers.map((handler) => handler(event))
    ).then((results) => {
      // 2. Here we would update `domain_event_handlers` table with success/failure
      results.forEach((res, idx) => {
        if (res.status === 'rejected') {
          console.error(`[EventDispatcher] Handler failed for ${event.event_type}:`, res.reason);
        }
      });
    });
  }
}
