import request from 'supertest';
import { app } from '../../src/app';
import { testPrisma, cleanDatabase, createTestSlot } from '../helpers/test-db';

describe('Slot Lifecycle & Cancellation Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await testPrisma.$disconnect();
  });

  test('Mandatory 1 & 3: Booking removes slot from availability, cancellation restores availability, and permits new booking', async () => {
    const slotId = '11111111-1111-4111-8111-111111111111';
    await createTestSlot({
      id: slotId,
      startsAt: new Date('2030-01-15T09:00:00.000Z'),
      endsAt: new Date('2030-01-15T09:30:00.000Z')
    });

    // 1. Initial GET /slots -> Available
    const initialGet = await request(app).get('/slots');
    expect(initialGet.status).toBe(200);
    expect(initialGet.body.slots.some((s: any) => s.id === slotId)).toBe(true);

    // 2. Book the slot -> 201 Created
    const bookRes = await request(app).post('/bookings').send({
      slotId,
      customerName: 'Alex Morgan',
      customerEmail: 'alex@example.com'
    });
    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.booking.id;

    // 3. GET /slots -> Slot is now REMOVED from availability
    const postBookGet = await request(app).get('/slots');
    expect(postBookGet.status).toBe(200);
    expect(postBookGet.body.slots.some((s: any) => s.id === slotId)).toBe(false);

    // 4. Cancel the booking -> 200 OK
    const cancelRes = await request(app).delete(`/bookings/${bookingId}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.booking).toMatchObject({
      id: bookingId,
      slotId,
      customerName: 'Alex Morgan',
      customerEmail: 'alex@example.com',
      status: 'cancelled'
    });

    // 5. GET /slots -> Slot is RESTORED to availability
    const postCancelGet = await request(app).get('/slots');
    expect(postCancelGet.status).toBe(200);
    expect(postCancelGet.body.slots.some((s: any) => s.id === slotId)).toBe(true);

    // 6. Permit a new booking on the same slot -> 201 Created
    const rebookRes = await request(app).post('/bookings').send({
      slotId,
      customerName: 'Sam Taylor',
      customerEmail: 'sam@example.com'
    });
    expect(rebookRes.status).toBe(201);
    expect(rebookRes.body.booking.status).toBe('active');
    expect(rebookRes.body.booking.id).not.toBe(bookingId);

    // Verify both bookings exist in database (cancelled remains addressable, new is active)
    const allSlotBookings = await testPrisma.booking.findMany({
      where: { slotId },
      orderBy: { createdAt: 'asc' }
    });
    expect(allSlotBookings.length).toBe(2);
    expect(allSlotBookings[0].status).toBe('cancelled');
    expect(allSlotBookings[1].status).toBe('active');
  });

  test('Idempotency: Repeated cancellation returns 200 with the same cancelled booking', async () => {
    const slotId = '33333333-3333-4333-8333-333333333333';
    await createTestSlot({ id: slotId });

    const bookRes = await request(app).post('/bookings').send({
      slotId,
      customerName: 'Alex Morgan',
      customerEmail: 'alex@example.com'
    });
    const bookingId = bookRes.body.booking.id;

    // First cancellation
    const firstCancel = await request(app).delete(`/bookings/${bookingId}`);
    expect(firstCancel.status).toBe(200);
    expect(firstCancel.body.booking.status).toBe('cancelled');

    // Repeated cancellation
    const secondCancel = await request(app).delete(`/bookings/${bookingId}`);
    expect(secondCancel.status).toBe(200);
    expect(secondCancel.body).toEqual(firstCancel.body);

    // Third cancellation
    const thirdCancel = await request(app).delete(`/bookings/${bookingId}`);
    expect(thirdCancel.status).toBe(200);
    expect(thirdCancel.body).toEqual(firstCancel.body);
  });

  test('Ordering: GET /slots returns available slots ordered by startsAt then id ascending', async () => {
    const slot1 = await createTestSlot({
      id: 'bbbbbbbb-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T10:00:00.000Z'),
      endsAt: new Date('2030-01-15T10:30:00.000Z')
    });

    const slot2 = await createTestSlot({
      id: 'aaaaaaaa-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T09:00:00.000Z'),
      endsAt: new Date('2030-01-15T09:30:00.000Z')
    });

    const slot3 = await createTestSlot({
      id: 'cccccccc-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T09:00:00.000Z'),
      endsAt: new Date('2030-01-15T09:30:00.000Z')
    });

    const res = await request(app).get('/slots');
    expect(res.status).toBe(200);
    expect(res.body.slots.length).toBe(3);

    // Starts at 09:00, id 'aaaaaaaa...' should come before 'cccccccc...'
    expect(res.body.slots[0].id).toBe(slot2.id);
    expect(res.body.slots[1].id).toBe(slot3.id);
    expect(res.body.slots[2].id).toBe(slot1.id);
  });

  test('Empty slots response: returns {"slots":[]} when no slots are available', async () => {
    const res = await request(app).get('/slots');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ slots: [] });
  });
});
