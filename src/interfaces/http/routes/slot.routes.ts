import { Router } from 'express';
import { SlotController } from '../controllers/slot.controller';

export const createSlotRouter = (slotController: SlotController): Router => {
  const router = Router();

  // GET /slots - Return available slots only, ordered by startsAt then id ascending
  router.get('/', slotController.getSlots);

  return router;
};
