-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('active', 'cancelled');

-- CreateTable
CREATE TABLE "slots" (
    "id" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "customerName" VARCHAR(255) NOT NULL,
    "customerEmail" VARCHAR(255) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slots_startsAt_id_idx" ON "slots"("startsAt", "id");

-- CreateIndex
CREATE INDEX "bookings_slotId_idx" ON "bookings"("slotId");

-- Crucial: PostgreSQL Partial Unique Index guaranteeing that a slot can have AT MOST ONE active booking
CREATE UNIQUE INDEX "unique_active_slot_booking" ON "bookings"("slotId") WHERE "status" = 'active';

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
