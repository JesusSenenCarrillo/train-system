import { Controller, Get } from '@nestjs/common';
import { StationService } from './station.service';

@Controller('stations')
export class StationController {
  constructor(private readonly stationService: StationService) {}

  @Get()
  findAll() {
    return this.stationService.findAll();
  }
}
