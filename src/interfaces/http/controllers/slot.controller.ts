import { Request, Response, NextFunction } from 'express';
import { GetAvailableSlotsUseCase } from '../../../application/use-cases/get-available-slots.use-case';

export class SlotController {
  constructor(private readonly getAvailableSlotsUseCase: GetAvailableSlotsUseCase) {}

  public getSlots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await this.getAvailableSlotsUseCase.execute();
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
