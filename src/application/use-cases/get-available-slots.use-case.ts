import { ISlotRepository } from '../../domain/repositories';
import { GetSlotsResponseDto } from '../dtos';

export class GetAvailableSlotsUseCase {
  constructor(private readonly slotRepository: ISlotRepository) {}

  public async execute(): Promise<GetSlotsResponseDto> {
    const slots = await this.slotRepository.getAvailableSlots();

    return {
      slots: slots.map((s) => ({
        id: s.id,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString()
      }))
    };
  }
}
