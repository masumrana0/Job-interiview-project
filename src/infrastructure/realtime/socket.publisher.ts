import { Server as SocketIoServer } from 'socket.io';
import { SlotBookedEventPayload, SlotReleasedEventPayload } from '../../domain/events';

export interface IRealtimePublisher {
  publishSlotBooked(payload: SlotBookedEventPayload): void;
  publishSlotReleased(payload: SlotReleasedEventPayload): void;
}

export class SocketIoPublisher implements IRealtimePublisher {
  private io: SocketIoServer | null = null;

  public setServer(io: SocketIoServer): void {
    this.io = io;
  }

  public publishSlotBooked(payload: SlotBookedEventPayload): void {
    if (!this.io) {
      return;
    }
    // Broadcast on default namespace '/'
    this.io.emit('slot.booked', {
      slotId: payload.slotId,
      bookingId: payload.bookingId,
      available: false
    });
  }

  public publishSlotReleased(payload: SlotReleasedEventPayload): void {
    if (!this.io) {
      return;
    }
    // Broadcast on default namespace '/'
    this.io.emit('slot.released', {
      slotId: payload.slotId,
      bookingId: payload.bookingId,
      available: true
    });
  }
}

export const socketPublisher = new SocketIoPublisher();
