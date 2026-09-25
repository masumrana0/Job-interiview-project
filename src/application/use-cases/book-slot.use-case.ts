import { IBookingRepository } from '../../domain/repositories';
import { IRealtimePublisher } from '../../infrastructure/realtime/socket.publisher';
import { BookingResponseDto, BookSlotRequestDto } from '../dtos';

export class BookSlotUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly realtimePublisher: IRealtimePublisher
  ) {}

  public async execute(dto: BookSlotRequestDto): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.bookSlot({
      slotId: dto.slotId,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail
    });

    // Broadcast once after the successful database change commits
    // No customer data in events
    this.realtimePublisher.publishSlotBooked({
      slotId: booking.slotId,
      bookingId: booking.id,
      available: false
    });

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
