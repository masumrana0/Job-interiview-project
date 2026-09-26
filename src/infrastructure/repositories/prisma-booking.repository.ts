import { Prisma, PrismaClient } from '@prisma/client';
import { BookingEntity } from '../../domain/entities';
import {
  BookingNotFoundError,
  SlotNotFoundError,
  SlotUnavailableError
} from '../../domain/errors';
import {
  BookSlotParams,
  CancelBookingResult,
  IBookingRepository
} from '../../domain/repositories';

export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaClient) { }

  public async bookSlot(params: BookSlotParams): Promise<BookingEntity> {

    return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {

      const lockedSlots = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "slots" WHERE "id" = ${params.slotId}::uuid FOR UPDATE
      `;

      if (!lockedSlots || lockedSlots.length === 0) {
        throw new SlotNotFoundError('Slot not found.');
      }

      // 2. Inspect for any existing active booking for this slot 
      const existingActive = await tx.booking.findFirst({
        where: {
          slotId: params.slotId,
          status: 'active'
        }
      });

      if (existingActive) {
        throw new SlotUnavailableError('This slot already has an active booking.');
      }

      // 3. Insert the new active booking
      try {
        const booking = await tx.booking.create({
          data: {
            slotId: params.slotId,
            customerName: params.customerName,
            customerEmail: params.customerEmail,
            status: 'active'
          }
        });

        return {
          id: booking.id,
          slotId: booking.slotId,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          status: booking.status,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt
        };
      } catch (error: any) {
        // Fallback for partial unique index violation (Postgres error 23505 / Prisma P2002)
        if (error.code === 'P2002' || error.code === '23505') {
          throw new SlotUnavailableError('This slot already has an active booking.');
        }
        throw error;
      }
    });
  }

  public async cancelBooking(bookingId: string): Promise<CancelBookingResult> {
    return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Lock the booking row for update
      const lockedBookings = await tx.$queryRaw<
        Array<{
          id: string;
          slotId: string;
          customerName: string;
          customerEmail: string;
          status: 'active' | 'cancelled';
          createdAt: Date;
          updatedAt: Date;
        }>
      >`
        SELECT "id", "slotId", "customerName", "customerEmail", "status", "createdAt", "updatedAt"
        FROM "bookings"
        WHERE "id" = ${bookingId}::uuid
        FOR UPDATE
      `;

      if (!lockedBookings || lockedBookings.length === 0) {
        throw new BookingNotFoundError('Booking not found.');
      }

      const current = lockedBookings[0];

      // Repeated cancellation returns 200 with the same cancelled booking, without further state change or event.
      if (current.status === 'cancelled') {
        return {
          booking: current,
          wasAlreadyCancelled: true
        };
      }

      // 2. Transition status from 'active' to 'cancelled'
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'cancelled' }
      });

      return {
        booking: {
          id: updated.id,
          slotId: updated.slotId,
          customerName: updated.customerName,
          customerEmail: updated.customerEmail,
          status: updated.status as 'active' | 'cancelled',
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        },
        wasAlreadyCancelled: false
      };
    });
  }

  public async findById(id: string): Promise<BookingEntity | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      return null;
    }

    return {
      id: booking.id,
      slotId: booking.slotId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      status: booking.status as 'active' | 'cancelled',
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };
  }
}
