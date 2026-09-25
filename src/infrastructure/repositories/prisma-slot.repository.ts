import { PrismaClient } from '@prisma/client';
import { SlotEntity } from '../../domain/entities';
import { ISlotRepository } from '../../domain/repositories';

export class PrismaSlotRepository implements ISlotRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async getAvailableSlots(): Promise<SlotEntity[]> {
    const slots = await this.prisma.slot.findMany({
      where: {
        bookings: {
          none: {
            status: 'active'
          }
        }
      },
      orderBy: [
        { startsAt: 'asc' },
        { id: 'asc' }
      ]
    });

    return slots.map((s) => ({
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));
  }

  public async findById(id: string): Promise<SlotEntity | null> {
    const slot = await this.prisma.slot.findUnique({
      where: { id }
    });

    if (!slot) {
      return null;
    }

    return {
      id: slot.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      createdAt: slot.createdAt,
      updatedAt: slot.updatedAt
    };
  }
}
