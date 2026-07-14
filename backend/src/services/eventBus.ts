// src/services/eventBus.ts

type EventCallback = (...args: any[]) => void;

class EventBus {
  private listeners: Record<string, EventCallback[]> = {};

  /** Subscribe to an event */
  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    };
  }

  /** Publish an event */
  publish(event: string, payload?: any): void {
    const callbacks = this.listeners[event];
    if (!callbacks) return;
    callbacks.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.error('EventBus listener error for', event, e);
      }
    });
  }
}

export const eventBus = new EventBus();
