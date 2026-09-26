import { PrismaClient } from '@prisma/client';

export const testPrisma = new PrismaClient();

export const cleanDatabase = async () => {
  await testPrisma.booking.deleteMany();
  await testPrisma.slot.deleteMany();
};

export const createTestSlot = async (overrides?: {
  id?: string;
  startsAt?: Date;
  endsAt?: Date;
}) => {
  return await testPrisma.slot.create({
    data: {
      id: overrides?.id || 'aaaaaaaa-1111-4111-8111-111111111111',
      startsAt: overrides?.startsAt || new Date('2030-05-01T09:00:00.000Z'),
      endsAt: overrides?.endsAt || new Date('2030-05-01T09:30:00.000Z')
    }
  });
};
