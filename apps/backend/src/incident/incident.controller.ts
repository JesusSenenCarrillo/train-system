import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IncidentService } from './incident.service';
import { IncidentPayload } from '@train-system/shared-types';

@Controller('incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post()
  create(@Body() payload: IncidentPayload) {
    return this.incidentService.create(payload);
  }

  @Get()
  findAll() {
    return this.incidentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incidentService.findOne(+id);
  }
}
