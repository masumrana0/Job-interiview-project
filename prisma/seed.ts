import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SEEDED_SLOTS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    startsAt: new Date('2030-01-15T09:00:00.000Z'),
    endsAt: new Date('2030-01-15T09:30:00.000Z')
  },
  {
    id: '11111111-1111-4111-8111-111111111112',
    startsAt: new Date('2030-01-15T09:30:00.000Z'),
    endsAt: new Date('2030-01-15T10:00:00.000Z')
  },
  {
    id: '11111111-1111-4111-8111-111111111113',
    startsAt: new Date('2030-01-15T10:00:00.000Z'),
    endsAt: new Date('2030-01-15T10:30:00.000Z')
  },
  {
    id: '11111111-1111-4111-8111-111111111114',
    startsAt: new Date('2030-01-15T10:30:00.000Z'),
    endsAt: new Date('2030-01-15T11:00:00.000Z')
  },
  {
    id: '11111111-1111-4111-8111-111111111115',
    startsAt: new Date('2030-01-15T14:00:00.000Z'),
    endsAt: new Date('2030-01-15T14:30:00.000Z')
  }
];

async function main() {
  console.log('🌱 Seeding fixed appointment slots...');

  for (const slot of SEEDED_SLOTS) {
    await prisma.slot.upsert({
      where: { id: slot.id },
      update: {
        startsAt: slot.startsAt,
        endsAt: slot.endsAt
      },
      create: {
        id: slot.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt
      }
    });
  }

  console.log(`✅ Successfully seeded ${SEEDED_SLOTS.length} appointment slots.`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
