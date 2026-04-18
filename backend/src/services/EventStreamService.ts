import { EventEmitter } from 'events';

class EventStreamService {
  private readonly emitter = new EventEmitter();

  subscribe(event: 'panel_updated', listener: (payload: unknown) => void): () => void {
    this.emitter.on(event, listener);
    return () => this.emitter.off(event, listener);
  }

  emitPanelUpdated(payload: { panelKey: string; data: unknown; updatedAt: string }): void {
    this.emitter.emit('panel_updated', payload);
  }
}

export const eventStreamService = new EventStreamService();
