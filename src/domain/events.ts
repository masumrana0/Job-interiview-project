export interface SlotBookedEventPayload {
  slotId: string;
  bookingId: string;
  available: false;
}

export interface SlotReleasedEventPayload {
  slotId: string;
  bookingId: string;
  available: true;
}

export type RealtimeEventName = 'slot.booked' | 'slot.released';
