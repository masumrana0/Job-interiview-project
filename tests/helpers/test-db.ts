import { PrismaClient } from '@prisma/client';

let _testPrisma: PrismaClient | null = null;

export const getTestPrisma = (): PrismaClient => {
  if (!_testPrisma) {
    const url =
      process.env.TEST_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://postgres:password@localhost:5433/postgres?schema=public';

    _testPrisma = new PrismaClient({
      datasources: {
        db: {
          url
        }
      }
    });
  }
  return _testPrisma;
};

export const testPrisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    const instance = getTestPrisma();
    const val = Reflect.get(instance, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(instance);
    }
    return val;
  }
});

export const cleanDatabase = async () => {
  // Clear bookings first due to foreign key relationship
  await testPrisma.booking.deleteMany();
  await testPrisma.slot.deleteMany();
};

export const createTestSlot = async (overrides?: {
  id?: string;
  startsAt?: Date;
  endsAt?: Date;
}) => {
  const id = overrides?.id || 'aaaaaaaa-1111-4111-8111-111111111111';
  const startsAt = overrides?.startsAt || new Date('2030-05-01T09:00:00.000Z');
  const endsAt = overrides?.endsAt || new Date('2030-05-01T09:30:00.000Z');

  return await testPrisma.slot.create({
    data: {
      id,
      startsAt,
      endsAt
    }
  });
};
