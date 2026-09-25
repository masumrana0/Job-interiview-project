import { Request, Response, NextFunction } from 'express';
import { BookSlotUseCase } from '../../../application/use-cases/book-slot.use-case';
import { CancelBookingUseCase } from '../../../application/use-cases/cancel-booking.use-case';

export class BookingController {
  constructor(
    private readonly bookSlotUseCase: BookSlotUseCase,
    private readonly cancelBookingUseCase: CancelBookingUseCase
  ) {}

  public createBooking = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const response = await this.bookSlotUseCase.execute({
        slotId: req.body.slotId,
        customerName: req.body.customerName,
        customerEmail: req.body.customerEmail
      });

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public cancelBooking = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const bookingId = String(req.params.bookingId);
      const response = await this.cancelBookingUseCase.execute(bookingId);

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
