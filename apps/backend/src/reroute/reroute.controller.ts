import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IncidentPayload, ReroutePlan } from '@train-system/shared-types';
import { RerouteService } from './reroute.service';

@Controller('reroute')
export class RerouteController {
  constructor(private readonly rerouteService: RerouteService) {}

  @Post()
  create(@Body() payload: IncidentPayload): ReroutePlan {
    return this.rerouteService.create(payload);
  }

  @Get(':id')
  findOne(@Param('id') id: string): ReroutePlan | undefined {
    return this.rerouteService.findOne(+id);
  }
}
