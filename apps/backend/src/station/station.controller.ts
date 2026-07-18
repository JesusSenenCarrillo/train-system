import {Controller, Get, Inject} from '@nestjs/common';
import {StationService} from './station.service';

@Controller('stations')
export class StationController {
  @Inject(StationService)
  private readonly stationService!: StationService;

  @Get()
  findAll() {
    return this.stationService.findAll();
  }
}
