import {Body, Controller, Get, Inject, Post, Query} from '@nestjs/common';
import {Train} from '@train-system/shared-types';
import {TrainService} from './train.service';
import {DelayPredictionClientService} from './delay-prediction-client.service';
import {DelayPredictionFeatureAssemblerService} from './delay-prediction-feature-assembler.service';
import {CreateStopEventDto} from './dto/create-stop-event.dto';

@Controller('trains')
export class TrainController {
  @Inject(TrainService)
  private readonly trainService!: TrainService;

  @Inject(DelayPredictionClientService)
  private readonly predictionClient!: DelayPredictionClientService;

  @Inject(DelayPredictionFeatureAssemblerService)
  private readonly featureAssembler!: DelayPredictionFeatureAssemblerService;

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
  /**
   * Queries stop events with optional filters.
   *
   * @param trainId - Optional train id filter.
   * @param stationId - Optional station id filter.
   * @param limit - Optional result limit. Defaults to 200.
   * @returns A list of stop events.
   */
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
  /**
   * Returns recent stop events formatted as LLM context.
   *
   * @param trainId - Optional train id filter.
   * @param limit - Optional result limit. Defaults to 300.
   * @returns A list of serialized stop event records.
   */
  getLlmContext(@Query('trainId') trainId?: string, @Query('limit') limit?: string) {
    return this.trainService.getLlmContext(limit ? Number(limit) : 300, trainId);
  }

  @Get('predict-delay')
  /**
   * Assembles features and calls the delay predictor for the given context.
   *
   * @param trainId - Optional train id.
   * @param routeId - Optional route id.
   * @param stationId - Optional station id.
   * @returns The predictor response, or a fallback with features if the predictor is unavailable.
   */
  async predictDelay(
    @Query('trainId') trainId?: string,
    @Query('routeId') routeId?: string,
    @Query('stationId') stationId?: string,
  ) {
    const features = await this.featureAssembler.assemble({
      trainId,
      routeId,
      stationId,
    });
    const prediction = await this.predictionClient.predictDelay(features);
    return prediction ?? {estimatedDelayMinutes: null, confidence: null, modelVersion: null, features};
  }
}
