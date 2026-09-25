export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'SLOT_NOT_FOUND'
  | 'BOOKING_NOT_FOUND'
  | 'SLOT_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed for request parameters or body.') {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class SlotNotFoundError extends AppError {
  constructor(message: string = 'Slot not found.') {
    super(404, 'SLOT_NOT_FOUND', message);
  }
}

export class BookingNotFoundError extends AppError {
  constructor(message: string = 'Booking not found.') {
    super(404, 'BOOKING_NOT_FOUND', message);
  }
}

export class SlotUnavailableError extends AppError {
  constructor(message: string = 'This slot already has an active booking.') {
    super(409, 'SLOT_UNAVAILABLE', message);
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'An unexpected internal error occurred.') {
    super(500, 'INTERNAL_ERROR', message);
  }
}
