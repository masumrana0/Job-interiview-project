import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import {
  bookSlotBodySchema,
  bookingIdParamSchema,
  validateBody,
  validateParams
} from '../middlewares/validate-request.middleware';

export const createBookingRouter = (bookingController: BookingController): Router => {
  const router = Router();

  // POST /bookings - Create a booking for an available slot
  router.post('/', validateBody(bookSlotBodySchema), bookingController.createBooking);

  // DELETE /bookings/:bookingId - Cancel an active booking and release its slot
  router.delete('/:bookingId', validateParams(bookingIdParamSchema), bookingController.cancelBooking);

  return router;
};
