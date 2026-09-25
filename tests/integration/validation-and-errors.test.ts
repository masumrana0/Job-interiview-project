import request from 'supertest';
import { app } from '../../src/app';
import { testPrisma, cleanDatabase, createTestSlot } from '../helpers/test-db';

describe('Validation, Edge Cases, and Error Formats', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await testPrisma.$disconnect();
  });

  test('400 VALIDATION_ERROR: missing slotId', async () => {
    const res = await request(app).post('/bookings').send({
      customerName: 'Alex Morgan',
      customerEmail: 'alex@example.com'
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('slotId')
      }
    });
  });

  test('400 VALIDATION_ERROR: invalid UUID format for slotId', async () => {
    const res = await request(app).post('/bookings').send({
      slotId: 'not-a-valid-uuid',
      customerName: 'Alex Morgan',
      customerEmail: 'alex@example.com'
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('valid UUID')
      }
    });
  });

  test('400 VALIDATION_ERROR: customerName empty after trim', async () => {
    const res = await request(app).post('/bookings').send({
      slotId: '11111111-1111-4111-8111-111111111111',
      customerName: '    ',
      customerEmail: 'alex@example.com'
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('customerName')
      }
    });
  });

  test('400 VALIDATION_ERROR: invalid email syntax', async () => {
    const res = await request(app).post('/bookings').send({
      slotId: '11111111-1111-4111-8111-111111111111',
      customerName: 'Alex Morgan',
      customerEmail: 'not-an-email'
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('customerEmail')
      }
    });
  });

  test('400 VALIDATION_ERROR: malformed JSON body', async () => {
    const res = await request(app)
      .post('/bookings')
      .set('Content-Type', 'application/json')
      .send('{ "slotId": "bad-json-syntax", ');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String)
      }
    });
  });

  test('400 VALIDATION_ERROR: invalid UUID in DELETE /bookings/:bookingId', async () => {
    const res = await request(app).delete('/bookings/123-not-a-uuid');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('bookingId')
      }
    });
  });

  test('404 SLOT_NOT_FOUND: valid UUID for nonexistent slot', async () => {
    const nonExistentSlotId = '99999999-9999-4999-8999-999999999999';

    const res = await request(app).post('/bookings').send({
      slotId: nonExistentSlotId,
      customerName: 'Alex Morgan',
      customerEmail: 'alex@example.com'
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'SLOT_NOT_FOUND',
        message: expect.any(String)
      }
    });
  });

  test('404 BOOKING_NOT_FOUND: valid UUID for nonexistent booking', async () => {
    const nonExistentBookingId = '88888888-8888-4888-8888-888888888888';

    const res = await request(app).delete(`/bookings/${nonExistentBookingId}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'BOOKING_NOT_FOUND',
        message: expect.any(String)
      }
    });
  });

  test('Trimming: customerName and customerEmail are trimmed before storage', async () => {
    const slot = await createTestSlot();

    const res = await request(app).post('/bookings').send({
      slotId: slot.id,
      customerName: '   Alex Morgan   ',
      customerEmail: '   alex@example.com   '
    });

    expect(res.status).toBe(201);
    expect(res.body.booking.customerName).toBe('Alex Morgan');
    expect(res.body.booking.customerEmail).toBe('alex@example.com');

    // Verify in database
    const dbBooking = await testPrisma.booking.findUnique({
      where: { id: res.body.booking.id }
    });
    expect(dbBooking?.customerName).toBe('Alex Morgan');
    expect(dbBooking?.customerEmail).toBe('alex@example.com');
  });
});
