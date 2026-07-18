// src/events/EventBus.ts
import { UaipEvent, UaipEventPayload } from './UaipEvents';

type Listener = (payload: UaipEventPayload) => Promise<void> | void;

export class EventBus {
  private listeners: Map<UaipEvent, Listener[]> = new Map();

  subscribe(event: UaipEvent, listener: Listener) {
    const arr = this.listeners.get(event) ?? [];
    arr.push(listener);
    this.listeners.set(event, arr);
  }

  async publish(event: UaipEvent, payload: UaipEventPayload) {
    const arr = this.listeners.get(event) ?? [];
    for (const listener of arr) {
      try {
        await listener(payload);
      } catch (e) {
        console.error(`EventBus listener error for ${event}:`, e);
      }
    }
  }

  reset() {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
