import { IBookingRepository } from '../../domain/repositories';
import { IRealtimePublisher } from '../../infrastructure/realtime/socket.publisher';
import { BookingResponseDto } from '../dtos';

export class CancelBookingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly realtimePublisher: IRealtimePublisher
  ) {}

  public async execute(bookingId: string): Promise<BookingResponseDto> {
    const { booking, wasAlreadyCancelled } =
      await this.bookingRepository.cancelBooking(bookingId);

    // Only broadcast if this was an active booking that became cancelled
    // No events on repeated cancellation
    if (!wasAlreadyCancelled) {
      this.realtimePublisher.publishSlotReleased({
        slotId: booking.slotId,
        bookingId: booking.id,
        available: true
      });
    }

    return {
      booking: {
        id: booking.id,
        slotId: booking.slotId,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        status: booking.status
      }
    };
  }
}
