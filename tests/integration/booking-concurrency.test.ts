import request from 'supertest';
import { app } from '../../src/app';
import { testPrisma, cleanDatabase, createTestSlot } from '../helpers/test-db';

describe('Concurrency & Conflict Prevention Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await testPrisma.$disconnect();
  });

  test('Mandatory: Two overlapping requests for one slot return exactly one 201 and one 409, with exactly one active booking persisted', async () => {
    const slotId = '11111111-2222-4333-8444-555555555555';
    await createTestSlot({ id: slotId });

    const req1Payload = {
      slotId,
      customerName: 'Alex Morgan',
      customerEmail: 'alex@example.com'
    };

    const req2Payload = {
      slotId,
      customerName: 'Jordan Lee',
      customerEmail: 'jordan@example.com'
    };

    // Fire two simultaneous requests against the HTTP API
    const [res1, res2] = await Promise.all([
      request(app).post('/bookings').send(req1Payload),
      request(app).post('/bookings').send(req2Payload)
    ]);

    const statuses = [res1.status, res2.status].sort();

    // Verify exactly one 201 and one 409
    expect(statuses).toEqual([201, 409]);

    const successRes = res1.status === 201 ? res1 : res2;
    const conflictRes = res1.status === 409 ? res1 : res2;

    // Check successful response payload
    expect(successRes.body).toHaveProperty('booking');
    expect(successRes.body.booking).toMatchObject({
      slotId,
      status: 'active'
    });
    expect(successRes.body.booking.id).toMatch(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
    );

    // Check conflict response payload
    expect(conflictRes.body).toEqual({
      error: {
        code: 'SLOT_UNAVAILABLE',
        message: expect.any(String)
      }
    });

    // Check PostgreSQL database state directly
    const persistedBookings = await testPrisma.booking.findMany({
      where: { slotId }
    });

    expect(persistedBookings.length).toBe(1);
    expect(persistedBookings[0].status).toBe('active');
    expect(persistedBookings[0].id).toBe(successRes.body.booking.id);
  });

  test('High Concurrency Stress: 10 simultaneous requests for one slot yield 1 success (201) and 9 conflicts (409)', async () => {
    const slotId = '22222222-3333-4444-8555-666666666666';
    await createTestSlot({ id: slotId });

    const requests = Array.from({ length: 10 }, (_, index) => {
      return request(app).post('/bookings').send({
        slotId,
        customerName: `Customer ${index}`,
        customerEmail: `customer${index}@example.com`
      });
    });

    const responses = await Promise.all(requests);

    const successCount = responses.filter((r) => r.status === 201).length;
    const conflictCount = responses.filter((r) => r.status === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(9);

    for (const r of responses) {
      if (r.status === 409) {
        expect(r.body.error.code).toBe('SLOT_UNAVAILABLE');
      }
    }

    const persistedBookings = await testPrisma.booking.findMany({
      where: { slotId, status: 'active' }
    });

    expect(persistedBookings.length).toBe(1);
  });
});
