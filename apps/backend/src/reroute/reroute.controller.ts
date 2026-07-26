import {Body, Controller, Get, Inject, Param, Post, Query} from '@nestjs/common';
import {IncidentPayload, ReroutePlan} from '@train-system/shared-types';
import {RerouteService} from './reroute.service';

@Controller('reroute')
export class RerouteController {
  @Inject(RerouteService)
  private readonly rerouteService!: RerouteService;

  @Post()
  async create(@Body() payload: IncidentPayload): Promise<ReroutePlan> {
    return this.rerouteService.create(payload);
  }

  @Get(':id')
  findOne(@Param('id') id: string): ReroutePlan | undefined {
    return this.rerouteService.findOne(+id);
  }

  @Get()
  async findAlternatives(
    @Query('from') fromStationId: string,
    @Query('to') toStationId: string,
  ): Promise<unknown> {
    if (!fromStationId || !toStationId) {
      return {error: 'Missing required query parameters: from, to'};
    }
    return this.rerouteService.findAlternatives(fromStationId, toStationId);
  }
}
