import { BookingEntity, SlotEntity } from './entities';

export interface ISlotRepository {
  getAvailableSlots(): Promise<SlotEntity[]>;
  findById(id: string): Promise<SlotEntity | null>;
}

export interface BookSlotParams {
  slotId: string;
  customerName: string;
  customerEmail: string;
}

export interface CancelBookingResult {
  booking: BookingEntity;
  wasAlreadyCancelled: boolean;
}

export interface IBookingRepository {
  bookSlot(params: BookSlotParams): Promise<BookingEntity>;
  cancelBooking(bookingId: string): Promise<CancelBookingResult>;
  findById(id: string): Promise<BookingEntity | null>;
}
