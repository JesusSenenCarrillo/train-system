import {Body, Controller, Get, Inject, Post, Query} from '@nestjs/common';
import {Train} from '@train-system/shared-types';
import {TrainService} from './train.service';
import {CreateStopEventDto} from './dto/create-stop-event.dto';

@Controller('trains')
export class TrainController {
  @Inject(TrainService)
  private readonly trainService!: TrainService;

  @Get()
  findAll() {
    return this.trainService.findAll();
  }

  @Post('live')
  upsertLive(@Body() payload: Train) {
    return this.trainService.upsertLiveState(payload);
  }

  @Post('events')
  createStopEvent(@Body() payload: CreateStopEventDto) {
    return this.trainService.createStopEvent(payload);
  }

  @Get('events')
  findStopEvents(
    @Query('trainId') trainId?: string,
    @Query('stationId') stationId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trainService.findStopEvents({
      trainId,
      stationId,
      limit: limit ? Number(limit) : 200,
    });
  }

  @Get('schedules')
  findScheduleUpdates() {
    return this.trainService.findScheduleUpdates();
  }

  @Get('llm-context')
  getLlmContext(@Query('trainId') trainId?: string, @Query('limit') limit?: string) {
    return this.trainService.getLlmContext(limit ? Number(limit) : 300, trainId);
  }
}
