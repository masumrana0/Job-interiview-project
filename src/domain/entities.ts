export type BookingStatus = 'active' | 'cancelled';

export interface SlotEntity {
  id: string;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SlotDto {
  id: string;
  startsAt: string; // ISO 8601 UTC
  endsAt: string;   // ISO 8601 UTC
}

export interface BookingEntity {
  id: string;
  slotId: string;
  customerName: string;
  customerEmail: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingDto {
  id: string;
  slotId: string;
  customerName: string;
  customerEmail: string;
  status: BookingStatus;
}
