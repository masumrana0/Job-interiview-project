import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { prisma } from './infrastructure/database/prisma.client';
import { socketPublisher } from './infrastructure/realtime/socket.publisher';
import { PrismaSlotRepository } from './infrastructure/repositories/prisma-slot.repository';
import { PrismaBookingRepository } from './infrastructure/repositories/prisma-booking.repository';
import { GetAvailableSlotsUseCase } from './application/use-cases/get-available-slots.use-case';
import { BookSlotUseCase } from './application/use-cases/book-slot.use-case';
import { CancelBookingUseCase } from './application/use-cases/cancel-booking.use-case';
import { SlotController } from './interfaces/http/controllers/slot.controller';
import { BookingController } from './interfaces/http/controllers/booking.controller';
import { createSlotRouter } from './interfaces/http/routes/slot.routes';
import { createBookingRouter } from './interfaces/http/routes/booking.routes';
import { errorHandlerMiddleware } from './interfaces/http/middlewares/error-handler.middleware';
import openApiSpec from './interfaces/docs/openapi.json';

export const createApp = (): Application => {
  const app = express();

  // Basic Middlewares
  app.use(cors());
  app.use(express.json());

  // OpenAPI Specification and Documentation Endpoints
  app.get('/openapi.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(openApiSpec);
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Appointment Booking API - Documentation'
  }));

  // Clean Architecture Dependency Injection
  const slotRepository = new PrismaSlotRepository(prisma);
  const bookingRepository = new PrismaBookingRepository(prisma);

  const getAvailableSlotsUseCase = new GetAvailableSlotsUseCase(slotRepository);
  const bookSlotUseCase = new BookSlotUseCase(bookingRepository, socketPublisher);
  const cancelBookingUseCase = new CancelBookingUseCase(bookingRepository, socketPublisher);

  const slotController = new SlotController(getAvailableSlotsUseCase);
  const bookingController = new BookingController(bookSlotUseCase, cancelBookingUseCase);

  // Mount API Routers
  app.use('/slots', createSlotRouter(slotController));
  app.use('/bookings', createBookingRouter(bookingController));

  // Catch-all for undefined routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.path} not found.`
      }
    });
  });

  // Centralized Error Handling Middleware
  app.use(errorHandlerMiddleware);

  return app;
};

export const app = createApp();
