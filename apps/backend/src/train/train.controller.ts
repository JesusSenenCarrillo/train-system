import { Controller, Get } from '@nestjs/common';
import { TrainService } from './train.service';

@Controller('trains')
export class TrainController {
  constructor(private readonly trainService: TrainService) {}

  @Get()
  findAll() {
    return this.trainService.findAll();
  }
}
