import { BookingStatus, SlotDto } from '../domain/entities';

export interface GetSlotsResponseDto {
  slots: SlotDto[];
}

export interface BookSlotRequestDto {
  slotId: string;
  customerName: string;
  customerEmail: string;
}

export interface BookingResponseDto {
  booking: {
    id: string;
    slotId: string;
    customerName: string;
    customerEmail: string;
    status: BookingStatus;
  };
}
